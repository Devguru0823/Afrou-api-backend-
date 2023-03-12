"use strict";
const Model = require("../../models/post.json");
let utility = require("../../utilities");
const GROUP_MODEL = require("../../models/group.json");

module.exports.deletePost = function (args,context, req, res, ) {
  return new Promise((resolve, reject) => {
    utility.mongoConnect(req, res, function (CLIENT) {
      let CONNECTION = CLIENT.db(utility.dbName);
      let postCollection = CONNECTION.collection(Model.collection_name);
      let post_id = Number(args.postId);
      postCollection.findOne({ post_id: post_id }, (err, postData) => {
        if (postData.posted_for === "group") {
          const groupCollection = CONNECTION.collection(
            GROUP_MODEL.collection_name
          );
          groupCollection.findOne(
            {
              group_id: postData.group_id,
              group_admins: context.user.user_id,
            },
            (err, groupDetails) => {
              if (groupDetails) {
                // I am Group Admin
                postCollection.deleteOne(
                  { post_id: post_id },
                  function (err, response) {
                    if (err) {
                      reject(err);
                    } else {
                      let finalResponse = {};
                      finalResponse.status = true;
                      resolve(finalResponse);
                    }
                  }
                );
              } else {
                postCollection.deleteOne(
                  { post_id: post_id, posted_by: context.user.user_id },
                  function (err, response) {
                    if (err) {
                      reject(err);
                    } else {
                      let finalResponse = {};
                      finalResponse.status = true;
                      resolve( finalResponse);
                    }
                  }
                );
              }
            }
          );
        } else {
          postCollection.deleteOne(
            { post_id: post_id, posted_by: context.user.user_id },
            function (err, response) {
              if (err) {
                reject(err);
              } else {
                let finalResponse = {};
                finalResponse.status = true;
                resolve( finalResponse);
              }
            }
          );
        }
      });
    });
  });
};
