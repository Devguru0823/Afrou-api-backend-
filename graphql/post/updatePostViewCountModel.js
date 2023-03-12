"use strict";
const Model = require("../../models/post.json");
let utility = require("../../utilities");

module.exports.updatePostViewCount = function (args, context, req, res) {
  return new Promise((resolve, reject) => {
    utility.mongoConnect(req, res, function (CLIENT) {
      let CONNECTION = CLIENT.db(utility.dbName);
      let postCollection = CONNECTION.collection(Model.collection_name);
      let post_id = Number(args.postId);

      postCollection.findOne({ post_id: post_id }, function (err, result) {
        if (err) {
          reject(err);
        } else {
          if (result) {
            var curCount = 1;
            if (result.post_view_count) {
              curCount = Number(result.post_view_count);
              curCount = parseInt(curCount) + parseInt(1);
              postCollection.findOneAndUpdate(
                {
                  post_id: post_id,
                },
                { $set: { post_view_count: curCount } },
                function (err, response) {
                  if (err) {
                    reject(err);
                  } else {
                    let finalResponse = {};
                    // finalResponse.status = true;
                    finalResponse.counter = curCount;
                    resolve(finalResponse);
                  }
                }
              );
            } else {
              postCollection.findOneAndUpdate(
                {
                  post_id: post_id,
                },
                { $set: { post_view_count: curCount } },
                function (err, response) {
                  if (err) {
                    reject(err);
                  } else {
                    let finalResponse = {};
                    // finalResponse.status = true;
                    finalResponse.counter = curCount;
                    resolve(finalResponse);
                  }
                }
              );
            }
          } else {
            let finalResponse = {};
            finalResponse.status = false;
            finalResponse.result = "No post found";
            reject(finalResponse);
          }
        }
      });
    });
  });
};
