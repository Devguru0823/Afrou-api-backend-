"use strict";
const utility = require("../../utilities");
const Model = require("../../models/user.json");
const SITE_CONFIG = require("../../configs/siteConfig.json");

module.exports.authenticate = function (req, res) {
  return new Promise((resolve, reject) => {
    if (req.headers.authorization) {
      let currentToken = req.headers.authorization.split(" ")[1];

      if (currentToken) {
        utility.mongoConnect(req, res, function (CLIENT) {
          let currentToken = req.headers.authorization.split(" ")[1];
          let CONNECTION = CLIENT.db(utility.dbName);
          let userCollection = CONNECTION.collection(Model.collection_name);
          let accessTokenCollection = CONNECTION.collection(
            SITE_CONFIG.accessTokenCollection
          );
          accessTokenCollection.findOne(
            { token: currentToken },
            function (err, tokenData) {
              if (err) {
                let error = new Error("Connectivity Error");

               return  reject(error);
              } else {
                if (tokenData) {
                  delete tokenData._id;
                  req.authorization = tokenData;
                  userCollection.findOneAndUpdate(
                    { user_id: tokenData.user_id },
                    { $set: { last_active: new Date() } },
                    function (err, doc) {
                     return  resolve(doc?.value);
                    }
                  );
                } else {
                  let error = new Error();
                  error.name = "UNAUTHORISED_ERROR";
                  return reject(error);
                }
              }
            }
          );
        });
      } else {
        let error = new Error();
        error.name = "UNAUTHORISED_ERROR";

        return reject(error);
      }
    } else {
      let error = new Error();
      error.name = "UNAUTHORISED_ERROR";
      return reject(error);
    }
  });
};

module.exports.isAuthenticated = function (context) {
  if (!context) return null;
  else {
    return (
      typeof context === "object" &&
      "user" in context &&
      "user_id" in context?.user
    );
  }
};
