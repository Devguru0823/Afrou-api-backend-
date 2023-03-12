var express = require('express');
var router = express.Router();
var utility = require('../utilities');
var Model = require('../models/ad_request');
var AUTH = require('../_helpers/authentication');

  
  // add new ad_request
  
  router.post('/', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.addAdRequest(client, req, res,function (err, response) {
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
