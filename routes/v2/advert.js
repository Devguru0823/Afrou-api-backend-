var express = require('express');
var router = express.Router();
var utility = require('../../utilities');
var Model = require('../../models/v2/advert');
var AUTH = require('../../_helpers/v2/authentication');

/* GET group listing. */
router.get('/home-ads',AUTH.authenticate, function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
      Model.getAdvertisements(client, req, res, function (err, response) {
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


router.get('/mobile-ads',AUTH.authenticate, function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getMobileAdvertisements(client, req, res, function (err, response) {
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
