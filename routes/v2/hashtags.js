var express = require('express');
var router = express.Router();
var utility = require('../../utilities');
var Model = require('../../models/v2/hashtag');
var AUTH = require('../../_helpers/v2/authentication');

const MEDIA = require('../../models/v2/media');;

/* GET Hashtag listing. */
router.get('/', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
      Model.getHashtags(client, req, res, function (err, response) {
          client.close();
          if(err){
              next(err);
          }else{
            response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
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
            response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
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
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
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
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
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
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
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
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
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
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
                res.json(response);
            }
        })
    });
});
  
module.exports = router;
