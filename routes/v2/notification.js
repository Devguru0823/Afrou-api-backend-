var express = require('express');
var router = express.Router();
var utility = require('../../utilities');
var Model = require('../../models/v2/notification');

/* GET users listing. */
router.get('/', function(req, res, next) {
  utility.mongoConnect(req, res, function (client) {
    Model.getNotifications(client, req, res, function (err, response) {
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

router.get('/v2', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getNotificationsV2(client, req, res, function (err, response) {
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

//
// // add new post
//
// router.post('/', function(req, res, next) {
//   utility.mongoConnect(req, res, function (client) {
//       Model.addNotification(client, req, res,function (err, response) {
//           client.close();
//           if(err){
//               next(err);
//           }else{
//               res.json(response);
//           }
//       })
//   });
// });


router.get('/read/:notification_id', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.readNotification(client, req, res, function (err, response) {
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


router.get('/markallasread', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.markAllAsRead(client, req, res, function (err, response) {
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


router.get('/counter', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getCounters(client, req, res, function (err, response) {
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
