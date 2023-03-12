"use strict";
let utility = require("../../utilities");
const { userCollectionName } = require("../../models/post");

module.exports.updateMostPopularSeen = function (args, context, req, res, cb) {
  return new Promise((resolve, reject) => {
    utility.mongoConnect(req, res, function (CLIENT) {
      let CONNECTION = CLIENT.db(utility.dbName);
      let userCollection = CONNECTION.collection(userCollectionName);
      let post_id = Number(args.postId);
      let user_id = context.user.user_id;

      userCollection.findOneAndUpdate(
        { user_id: user_id },
        { $addToSet: { mostpopularpostseen: post_id } },
        (err, updated) => {
          let finalResponse = {};
          finalResponse.status = true;
          if (err) {
            reject(err);
          } else {
            console.log(finalResponse,err)
            resolve(finalResponse);
          }
        }
      );
    });
  });
};
