const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {
  let testThreadId;
  let testReplyId;
  let testDeletePassword = 'testpassword';
  let testBoard = 'testboard';

  suite('API ROUTING FOR /api/threads/:board', function() {

    suite('POST', function() {
      test('Creating a new thread: POST request to /api/threads/{board}', function(done) {
        chai.request(server)
          .post('/api/threads/' + testBoard)
          .send({
            text: 'Test thread text',
            delete_password: testDeletePassword
          })
          .end(function(err, res) {
            assert.equal(res.status, 200);
            // The response should redirect to the board page
            assert.isTrue(res.redirects.length > 0);
            done();
          });
      });
    });

    suite('GET', function() {
      test('Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}', function(done) {
        chai.request(server)
          .get('/api/threads/' + testBoard)
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.isArray(res.body);
            if (res.body.length > 0) {
              const thread = res.body[0];
              assert.property(thread, '_id');
              assert.property(thread, 'text');
              assert.property(thread, 'created_on');
              assert.property(thread, 'bumped_on');
              assert.property(thread, 'replies');
              assert.property(thread, 'replycount');
              assert.isArray(thread.replies);
              // Should not have delete_password or reported fields
              assert.notProperty(thread, 'delete_password');
              assert.notProperty(thread, 'reported');
            }
            done();
          });
      });
    });

    suite('DELETE', function() {
      test('Deleting a thread with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password', function(done) {
        chai.request(server)
          .delete('/api/threads/' + testBoard)
          .send({
            thread_id: 'invalid_id',
            delete_password: 'wrongpassword'
          })
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, 'incorrect password');
            done();
          });
      });

      test('Deleting a thread with the correct password: DELETE request to /api/threads/{board} with a valid delete_password', function(done) {
        // First create a thread to delete
        chai.request(server)
          .post('/api/threads/' + testBoard)
          .send({
            text: 'Thread to delete',
            delete_password: testDeletePassword
          })
          .end(function(err, res) {
            // Then get threads to find the ID
            chai.request(server)
              .get('/api/threads/' + testBoard)
              .end(function(err, res) {
                if (res.body.length > 0) {
                  testThreadId = res.body[0]._id;
                  // Now delete it
                  chai.request(server)
                    .delete('/api/threads/' + testBoard)
                    .send({
                      thread_id: testThreadId,
                      delete_password: testDeletePassword
                    })
                    .end(function(err, res) {
                      assert.equal(res.status, 200);
                      assert.equal(res.text, 'success');
                      done();
                    });
                } else {
                  done();
                }
              });
          });
      });
    });

    suite('PUT', function() {
      test('Reporting a thread: PUT request to /api/threads/{board}', function(done) {
        // First create a thread to report
        chai.request(server)
          .post('/api/threads/' + testBoard)
          .send({
            text: 'Thread to report',
            delete_password: testDeletePassword
          })
          .end(function(err, res) {
            // Then get threads to find the ID
            chai.request(server)
              .get('/api/threads/' + testBoard)
              .end(function(err, res) {
                if (res.body.length > 0) {
                  const threadId = res.body[0]._id;
                  // Now report it
                  chai.request(server)
                    .put('/api/threads/' + testBoard)
                    .send({
                      thread_id: threadId
                    })
                    .end(function(err, res) {
                      assert.equal(res.status, 200);
                      assert.equal(res.text, 'reported');
                      done();
                    });
                } else {
                  done();
                }
              });
          });
      });
    });

  });

  suite('API ROUTING FOR /api/replies/:board', function() {

    suite('POST', function() {
      test('Creating a new reply: POST request to /api/replies/{board}', function(done) {
        // First create a thread
        chai.request(server)
          .post('/api/threads/' + testBoard)
          .send({
            text: 'Thread for reply test',
            delete_password: testDeletePassword
          })
          .end(function(err, res) {
            // Then get threads to find the ID
            chai.request(server)
              .get('/api/threads/' + testBoard)
              .end(function(err, res) {
                if (res.body.length > 0) {
                  const threadId = res.body[0]._id;
                  // Now create a reply
                  chai.request(server)
                    .post('/api/replies/' + testBoard)
                    .send({
                      thread_id: threadId,
                      text: 'Test reply text',
                      delete_password: testDeletePassword
                    })
                    .end(function(err, res) {
                      assert.equal(res.status, 200);
                      // Should redirect to thread page
                      assert.isTrue(res.redirects.length > 0);
                      done();
                    });
                } else {
                  done();
                }
              });
          });
      });
    });

    suite('GET', function() {
      test('Viewing a single thread with all replies: GET request to /api/replies/{board}', function(done) {
        // First create a thread and reply
        chai.request(server)
          .post('/api/threads/' + testBoard)
          .send({
            text: 'Thread for single view test',
            delete_password: testDeletePassword
          })
          .end(function(err, res) {
            chai.request(server)
              .get('/api/threads/' + testBoard)
              .end(function(err, res) {
                if (res.body.length > 0) {
                  const threadId = res.body[0]._id;
                  // Add a reply
                  chai.request(server)
                    .post('/api/replies/' + testBoard)
                    .send({
                      thread_id: threadId,
                      text: 'Reply for single view test',
                      delete_password: testDeletePassword
                    })
                    .end(function(err, res) {
                      // Now get the single thread
                      chai.request(server)
                        .get('/api/replies/' + testBoard)
                        .query({ thread_id: threadId })
                        .end(function(err, res) {
                          assert.equal(res.status, 200);
                          assert.property(res.body, '_id');
                          assert.property(res.body, 'text');
                          assert.property(res.body, 'created_on');
                          assert.property(res.body, 'replies');
                          assert.isArray(res.body.replies);
                          // Should not have delete_password or reported fields
                          assert.notProperty(res.body, 'delete_password');
                          assert.notProperty(res.body, 'reported');
                          done();
                        });
                    });
                } else {
                  done();
                }
              });
          });
      });
    });

    suite('DELETE', function() {
      test('Deleting a reply with the incorrect password: DELETE request to /api/replies/{board} with an invalid delete_password', function(done) {
        chai.request(server)
          .delete('/api/replies/' + testBoard)
          .send({
            thread_id: 'invalid_id',
            reply_id: 'invalid_id',
            delete_password: 'wrongpassword'
          })
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, 'incorrect password');
            done();
          });
      });

      test('Deleting a reply with the correct password: DELETE request to /api/replies/{board} with a valid delete_password', function(done) {
        // First create a thread and reply
        chai.request(server)
          .post('/api/threads/' + testBoard)
          .send({
            text: 'Thread for reply delete test',
            delete_password: testDeletePassword
          })
          .end(function(err, res) {
            chai.request(server)
              .get('/api/threads/' + testBoard)
              .end(function(err, res) {
                if (res.body.length > 0) {
                  const threadId = res.body[0]._id;
                  // Add a reply
                  chai.request(server)
                    .post('/api/replies/' + testBoard)
                    .send({
                      thread_id: threadId,
                      text: 'Reply to delete',
                      delete_password: testDeletePassword
                    })
                    .end(function(err, res) {
                      // Get the thread to find reply ID
                      chai.request(server)
                        .get('/api/replies/' + testBoard)
                        .query({ thread_id: threadId })
                        .end(function(err, res) {
                          if (res.body.replies && res.body.replies.length > 0) {
                            const replyId = res.body.replies[0]._id;
                            // Now delete the reply
                            chai.request(server)
                              .delete('/api/replies/' + testBoard)
                              .send({
                                thread_id: threadId,
                                reply_id: replyId,
                                delete_password: testDeletePassword
                              })
                              .end(function(err, res) {
                                assert.equal(res.status, 200);
                                assert.equal(res.text, 'success');
                                done();
                              });
                          } else {
                            done();
                          }
                        });
                    });
                } else {
                  done();
                }
              });
          });
      });
    });

    suite('PUT', function() {
      test('Reporting a reply: PUT request to /api/replies/{board}', function(done) {
        // First create a thread and reply
        chai.request(server)
          .post('/api/threads/' + testBoard)
          .send({
            text: 'Thread for reply report test',
            delete_password: testDeletePassword
          })
          .end(function(err, res) {
            chai.request(server)
              .get('/api/threads/' + testBoard)
              .end(function(err, res) {
                if (res.body.length > 0) {
                  const threadId = res.body[0]._id;
                  // Add a reply
                  chai.request(server)
                    .post('/api/replies/' + testBoard)
                    .send({
                      thread_id: threadId,
                      text: 'Reply to report',
                      delete_password: testDeletePassword
                    })
                    .end(function(err, res) {
                      // Get the thread to find reply ID
                      chai.request(server)
                        .get('/api/replies/' + testBoard)
                        .query({ thread_id: threadId })
                        .end(function(err, res) {
                          if (res.body.replies && res.body.replies.length > 0) {
                            const replyId = res.body.replies[0]._id;
                            // Now report the reply
                            chai.request(server)
                              .put('/api/replies/' + testBoard)
                              .send({
                                thread_id: threadId,
                                reply_id: replyId
                              })
                              .end(function(err, res) {
                                assert.equal(res.status, 200);
                                assert.equal(res.text, 'reported');
                                done();
                              });
                          } else {
                            done();
                          }
                        });
                    });
                } else {
                  done();
                }
              });
          });
      });
    });

  });

});
