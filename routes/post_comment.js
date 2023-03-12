var express = require('express');
var router = express.Router();
var utility = require('../utilities');
var Model = require('../models/post_comment');


router.get('/', function(req, res, next) {
  utility.mongoConnect(req, res, function (client) {
    Model.getPostComment(client, req, res, function (err, response) {
        client.close();
        if(err){
            next(err);
        }else{
            res.json(response);
        }
    })
  });
});

// add new Comment

router.post('/', function(req, res, next) {
  utility.mongoConnect(req, res, function (client) {
      Model.addPostComment(client, req, res,function (err, response) {
          client.close();
          if(err){
              next(err);
          }else{
              res.json(response);
          }
      })
  });
});

router.put('/:comment_id', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.editPostComment(client, req, res,function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});

router.delete('/:comment_id', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.deletePostComment(client, req, res,function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});

// add story new Comment

router.post('/story', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.addStoryComment(client, req, res,function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});

router.put('/story/:comment_id', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.editStoryComment(client, req, res,function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});

router.delete('/story/:comment_id', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.deleteStoryComment(client, req, res,function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});


module.exports = router;

