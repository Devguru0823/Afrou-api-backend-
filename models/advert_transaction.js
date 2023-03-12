"use strict";
const Model = require("./transaction.json");
let utility = require("../utilities");

module.exports.addTransaction = function (CLIENT, req, res, cb) {
  let CONNECTION = CLIENT.db(utility.dbName);
  let ad_requestCollection = CONNECTION.collection(Model.collection_name);

  let newAd_requestData = utility.filterBody(req.body);
  if (newAd_requestData === {}) {
    return cb({ error: "invalid data" }, false);
  }
  // newAd_requestData.requested_by = req.authorization.user_id;
  utility.validatePostData(
    CONNECTION,
    req.body,
    Model,
    "insert",
    0,
    function (err, validatedData) {
      if (err) {
        cb(err);
      } else {
        ad_requestCollection.insertOne(validatedData, function (err, response) {
          if (err) {
            cb(err);
          } else {
            //   console.log(response.ops.id)
            let finalResponse ={ ...validatedData}
            // finalResponse.status = true;

            cb(null, finalResponse);
          }
        });
      }
    }
  );
};

module.exports.getTransaction = function (CLIENT, req, res, cb) {
  let CONNECTION = CLIENT.db(utility.dbName);
  let advertCollection = CONNECTION.collection(Model.collection_name);
  advertCollection.findOne({ id: req.body.id }, (err, data) => {
    if (err) cb(err);
    else {
        let response = data 
        cb(null,response)
    }
  });
};
