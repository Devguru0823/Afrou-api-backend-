var express = require('express');
var router = express.Router();
var utility = require('../../utilities');
var Model = require('../../models/v2/user_photos');
var AUTH = require('../../_helpers/v2/authentication');

/* GET users listing. */
router.get('/',AUTH.authenticate, function(req, res, next) {
  utility.mongoConnect(req, res, function (client) {
    Model.getUserPhoto(client, req, res, function (err, response) {
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

// add new post

router.post('/', function(req, res, next) {
  utility.mongoConnect(req, res, function (client) {
      Model.addUserPhoto(client, req, res,function (err, response) {
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


router.delete('/:user_photo_id', function(req, res, next) {
  utility.mongoConnect(req, res, function (client) {
    Model.deleteUserPhoto(client, req, res,function (err, response) {
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

