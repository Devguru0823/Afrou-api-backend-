'use strict';
var express = require('express');
var router = express.Router();
var utility = require('../utilities');


router.get("/", function (req, res, next) {
    utility.mongoConnect(req, res, function (client) {
      let CONNECTION = client.db(utility.dbName);
      let userCollection = CONNECTION.collection("user");
      let status = "active";
      let search = req.query.search || "";
      if (req.query.status && req.query.status === "inactive") {
        status = "inactive";
      }
      let skip = 0;
      let limit = 10;
      let page = 1;
      if (req.query.page) {
        page = Number(req.query.page);
        skip = (page - 1) * limit;
      }
      let query = { status };
      if (search !== "" && search !== undefined && search !== "undefined") {
        query = {
          ...query,
          $or: [
            { email: { $regex: search, $options: "i" } },
            { first_name: { $regex: search, $options: "i" } },
            { last_name: { $regex: search, $options: "i" } },
            { contact_number: { $regex: search, $options: "i" } },
          ],
        };
      }
      userCollection
        .find(
          {
           ...query
          },
          { projection: { password: 0 } }
        )
        .skip(skip)
        .limit(limit)
        .toArray((err, usersArray) => {
          client.close();
          if (err) {
            next(err);
          } else {
            res.json({ data: usersArray });
          }
        });
    });
  });

router.get('/:user_id/togglestatus', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        let CONNECTION = client.db(utility.dbName);
        let userCollection = CONNECTION.collection('user');
        let user_id = Number(req.params.user_id);
        userCollection.findOne({user_id: user_id}, (err, userData)=>{
            if(err){
                next(err);
            }else if(!userData){
                client.close();
                let error = new Error('No Posts Found');
                error.status = 404;
                next(error);
            }else{
                const user_status = userData.status === 'active'? 'inactive': 'active';
                userCollection.findOneAndUpdate({user_id: user_id}, {$set: {status: user_status}}, (err, userData)=>{
                    client.close();
                    res.json({status: true});
                });
            }
        });
    });
});


module.exports = router;
