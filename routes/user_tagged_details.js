var express = require('express');
var router = express.Router();
var utility = require('../utilities');
var Model = require('../models/user_tagged_details');

/* GET User for TAG listing. */
router.get('/', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
      Model.getUserListForTag(client, req, res, function (err, response) {
          client.close();
          if(err){
              next(err);
          }else{
              res.json(response);
          }
      })

    });
});

/* POST Add tagged use information */
// router.post('/add', function(req, res, next) {
//     utility.mongoConnect(req, res, function (client) {
//       Model.addTagggedUserInfo(client, req, res, function (err, response) {
//           client.close();
//           if(err){
//               next(err);
//           }else{
//               res.json(response);
//           }
//       })

//     });
// });
module.exports = router;