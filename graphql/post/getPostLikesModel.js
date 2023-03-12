"use strict";
let utility = require("../../utilities");
const LIKE_MODEL = require("../../models/likes.json");

module.exports.getPostLikes = function (args,context, req, res, ) {
  return new Promise((resolve, reject) => {
    utility.mongoConnect(req, res, function (CLIENT) {
      let CONNECTION = CLIENT.db(utility.dbName);
      let postLikesCollection = CONNECTION.collection(
        LIKE_MODEL.collection_name
      );
      let post_id = Number(args.postId);

      postLikesCollection
        .aggregate([
          {
            $match: {
              like_type: "post",
              post_id: post_id,
            },
          },
          {
            $lookup: {
              from: "user",
              localField: "liked_by",
              foreignField: "user_id",
              as: "userDetails",
            },
          },
          {
            $project: {
              email: { $arrayElemAt: ["$userDetails.email", 0] },
              first_name: { $arrayElemAt: ["$userDetails.first_name", 0] },
              last_name: { $arrayElemAt: ["$userDetails.last_name", 0] },
              profile_image_url: {
                $arrayElemAt: ["$userDetails.profile_image_url", 0],
              },
              user_id: { $arrayElemAt: ["$userDetails.user_id", 0] },
              user_name: { $arrayElemAt: ["$userDetails.user_name", 0] },
            },
          },
        ])
        .toArray((err, userList) => {
          if (userList) {
            userList.map((x) => (x.request_buttons = []));
          }
          // cb(err, { status: true, data: userList });
          if(err){
            reject(err)
          }else{
            resolve(userList)
          }
        });
    });
  });
};
