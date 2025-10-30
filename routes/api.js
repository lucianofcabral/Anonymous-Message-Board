'use strict';

const Thread = require('../models/Thread');

module.exports = function (app) {
  
  app.route('/api/threads/:board')
    .post(function(req, res) {
      const board = req.params.board;
      const { text, delete_password } = req.body;
      
      const newThread = new Thread({
        text,
        delete_password,
        board,
        replies: []
      });
      
      newThread.save((err, thread) => {
        if (err) return res.send('Error saving thread');
        res.redirect('/b/' + board + '/');
      });
    })
        .get(function(req, res) {
      const board = req.params.board;
      
      Thread.find({ board })
        .sort({ bumped_on: -1 })
        .limit(10)
        .select('-delete_password -reported')
        .exec((err, threads) => {
          if (err) return res.send('Error retrieving threads');
          
          // Filter replies and add replycount
          const threadsWithFilteredReplies = threads.map(thread => {
            const filteredReplies = thread.replies
              .sort((a, b) => new Date(b.created_on) - new Date(a.created_on)) // Sort by newest first
              .slice(0, 3) // Get first 3 (most recent)
              .map(reply => ({
                _id: reply._id,
                text: reply.text,
                created_on: reply.created_on
              }));
            
            return {
              _id: thread._id,
              text: thread.text,
              created_on: thread.created_on,
              bumped_on: thread.bumped_on,
              replies: filteredReplies,
              replycount: thread.replies.length
            };
          });
          
          res.json(threadsWithFilteredReplies);
        });
    })
    .put(function(req, res) {
      const board = req.params.board;
      const { thread_id } = req.body;
      
      Thread.findByIdAndUpdate(thread_id, { reported: true }, (err, thread) => {
        if (err) return res.send('Error reporting thread');
        if (!thread) return res.send('Thread not found');
        res.send('reported');
      });
    })
    .delete(function(req, res) {
      const board = req.params.board;
      const { thread_id, delete_password } = req.body;
      
      Thread.findById(thread_id, (err, thread) => {
        if (err || !thread || thread.delete_password !== delete_password) return res.send('incorrect password');
        
        Thread.findByIdAndDelete(thread_id, (err) => {
          if (err) return res.send('Error deleting thread');
          res.send('success');
        });
      });
    });  app.route('/api/replies/:board')
    .post(function(req, res) {
      const board = req.params.board;
      const { thread_id, text, delete_password } = req.body;
      
      const newReply = {
        text,
        delete_password,
        created_on: new Date()
      };
      
      Thread.findByIdAndUpdate(
        thread_id,
        { 
          $push: { replies: newReply },
          bumped_on: newReply.created_on
        },
        { new: true },
        (err, thread) => {
          if (err) return res.send('Error saving reply');
          if (!thread) return res.send('Thread not found');
          res.redirect('/b/' + board + '/' + thread_id);
        }
      );
    })
        .get(function(req, res) {
      const board = req.params.board;
      const { thread_id } = req.query;
      
      Thread.findById(thread_id)
        .select('-delete_password -reported')
        .exec((err, thread) => {
          if (err) return res.send('Error retrieving thread');
          if (!thread) return res.send('Thread not found');
          
          // Filter out reported and delete_password from replies
          const filteredReplies = thread.replies
            .map(reply => ({
              _id: reply._id,
              text: reply.text,
              created_on: reply.created_on
            }));
          
          const threadResponse = {
            _id: thread._id,
            text: thread.text,
            created_on: thread.created_on,
            replies: filteredReplies
          };
          
          res.json(threadResponse);
        });
    })
    .put(function(req, res) {
      const board = req.params.board;
      const { thread_id, reply_id } = req.body;
      
      Thread.findOneAndUpdate(
        { _id: thread_id, 'replies._id': reply_id },
        { $set: { 'replies.$.reported': true } },
        (err, thread) => {
          if (err) return res.send('Error reporting reply');
          if (!thread) return res.send('Thread or reply not found');
          res.send('reported');
        }
      );
    })
    .delete(function(req, res) {
      const board = req.params.board;
      const { thread_id, reply_id, delete_password } = req.body;
      
      Thread.findOne({ _id: thread_id, 'replies._id': reply_id }, (err, thread) => {
        if (err || !thread) return res.send('incorrect password');
        
        const reply = thread.replies.id(reply_id);
        if (!reply || reply.delete_password !== delete_password) return res.send('incorrect password');
        
        reply.text = '[deleted]';
        thread.save((err) => {
          if (err) return res.send('Error deleting reply');
          res.send('success');
        });
      });
    });};
