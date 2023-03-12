var express = require('express');
var router = express.Router();

var utilities = require('../../utilitie');
var advertModel = require('../../models/v2/advert');
var AUTH = require('../../_helpers/v2/authentication');

router.get('/mobile-ads',AUTH.authenticate, function(req, res, next) {
    utilities.MysqlConnect(req, res, function (client) {
        advertModel.getMobileAdvertisements(client, req, res, function (err, response) {
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

router.get('/home-ads',AUTH.authenticate, function(req, res, next) {
    utilities.MysqlConnect(req, res, function (client) {
        advertModel.getAdvertisements(client, req, res, function (err, response) {
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
