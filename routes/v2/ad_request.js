var express = require('express');
var router = express.Router();
var utilities = require('../../utilitie');
var AdRequestModel = require('../../models/v2/ad_request');
  
  // add new ad_request
  
  router.post('/', 
  function(req, res, next) {
    utilities.MysqlConnect(req, res, function(client){
        AdRequestModel.addAdRequest(client, req, res, function(err, response){
            client.end();
            if(err){ next(err);}
            else{
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
                res.json(response);
            }
        })
    })
  });
  module.exports = router;

