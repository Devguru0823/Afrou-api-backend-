var express = require('express');
var router = express.Router();
var utility = require('../utilities');
var Model = require('../models/user_photos');
var AUTH = require('../_helpers/authentication');

/* GET users listing. */
router.get('/',AUTH.authenticate, function(req, res, next) {
  utility.mongoConnect(req, res, function (client) {
    Model.getUserPhoto(client, req, res, function (err, response) {
        client.close();
        if(err){
            next(err);
        }else{
            res.json(response);
        }
    })
  });
});

// add new post

router.post('/', function(req, res, next) {
  utility.mongoConnect(req, res, function (client) {
      Model.addUserPhoto(client, req, res,function (err, response) {
          client.close();
          if(err){
              next(err);
          }else{
              res.json(response);
          }
      })
  });
});


router.delete('/:user_photo_id', function(req, res, next) {
  utility.mongoConnect(req, res, function (client) {
    Model.deleteUserPhoto(client, req, res,function (err, response) {
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

