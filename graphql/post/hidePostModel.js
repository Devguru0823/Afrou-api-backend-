"use strict";
let utility = require("../../utilities");
const USER_MODEL = require("../../models/user.json");

module.exports.hidePostByPostId = function (args,context, req, res, cb) {
  return new Promise((resolve, reject) => {
    utility.mongoConnect(req, res, function (CLIENT) {
      let CONNECTION = CLIENT.db(utility.dbName);
      let post_id = Number(args.postId);
      const user_id = context.user.user_id;
      const userCollection = CONNECTION.collection(USER_MODEL.collection_name);
      userCollection.findOneAndUpdate(
        { user_id: user_id },
        { $addToSet: { hidden_posts: post_id } },
        (err, updated) => {
          // resolve(err, { status: true });
          if (err) {
            reject(err);
          } else {
            resolve({ status: true });
          }
        }
      );
    });
  });
};
