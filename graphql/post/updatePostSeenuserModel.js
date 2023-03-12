"use strict";
const Model = require("../../models/post.json");
let utility = require("../../utilities");

module.exports.updatePostSeenuser = function (args, context, req, res, cb) {
  return new Promise((resolve, reject) => {
    utility.mongoConnect(req, res, function (CLIENT) {
      let CONNECTION = CLIENT.db(utility.dbName);
      let postCollection = CONNECTION.collection(Model.collection_name);
      let post_id = Number(args.postId);
      let user_id = context.user.user_id;

      postCollection.findOneAndUpdate(
        { post_id: post_id },
        { $addToSet: { seen_by: user_id } },
        (err, updated) => {
          let finalResponse = {};
          // finalResponse.status = true;
          // finalResponse.data = updated;
          // cb(err, finalResponse);
          if (err) {
            return reject(err);
          } else {
            resolve(updated.value);
          }
        }
      );
    });
  });
};
