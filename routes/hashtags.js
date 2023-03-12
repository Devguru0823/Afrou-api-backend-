var express = require('express');
var router = express.Router();
var utility = require('../utilities');
var Model = require('../models/hashtag');
var AUTH = require('../_helpers/authentication');

const MEDIA = require('../models/media');

/* GET Hashtag listing. */
router.get('/', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
      Model.getHashtags(client, req, res, function (err, response) {
          client.close();
          if(err){
              next(err);
          }else{
              res.json(response);
          }
      })

    });
});

/**
 * Get all hashtags without pagination
 */
router.get('/all', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
      Model.getAllHashtags(client, req, res, function (err, response) {
          client.close();
          if(err){
              next(err);
          }else{
              res.json(response);
          }
      })

    });
});

router.get('/trending', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getTrendingHashtags(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })

    });
});

router.get('/my-hashtags', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getMyHashtags(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })

    });
});


/* GET Hashtag Details. */
router.get('/:hashtag_slug', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getHashtagDetails(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })

    });
});
  
  // add new message
  
router.post('/follow', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.followHashtag(client, req, res,function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
  });

router.post('/unfollow', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.unFollowHashtag(client, req, res,function (err, response) {
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
