var express = require('express');
var router = express.Router();
var utility = require('../../utilities');
var Model = require('../../models/v2/market');
var mediaModel = require('../../models/v2/media');
var AUTH = require('../../_helpers/v2/authentication');

/* GET market listing. */
router.get('/', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
      Model.getMarketPosts(client, req, res, function (err, response) {
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


router.get('/:market_post_id',AUTH.authenticate, function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getMarketPostById(client, req, res, function (err, response) {
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


router.put('/:market_post_id',mediaModel.addMarketMainPhotos, function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.editMarketPost(client, req, res, function (err, response) {
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
  
  // add new market
  
  router.post('/', mediaModel.addMarketMainPhotos, function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.addMarketPost(client, req, res,function (err, response) {
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
