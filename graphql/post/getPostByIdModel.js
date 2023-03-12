"use strict";
const Model = require("../../models/post.json");
let utility = require("../../utilities");
const GROUP_MODEL = require("../../models/group.json");
const {
  sharedPostLookup,
  getComments,
  getRequestedUsers,
  postedByUserLookupFunc,
  likedByMeLookup,
  postProjection,
} = require("../../models/post");
/**
 * 
 @requires args.postId
 * @returns post
 */
module.exports.getPostById = function (args, context, req, res) {
  return new Promise((resolve, reject) => {
    utility.mongoConnect(req, res, function (CLIENT) {
      let CONNECTION = CLIENT.db(utility.dbName);
      let postCollection = CONNECTION.collection(Model.collection_name);
      let post_id = Number(args.postId);

      postCollection
        .aggregate([
          {
            $match: {
              post_id: post_id,
              post_status: "active",
            },
          },
          sharedPostLookup(context.user.user_id),
          getComments(1000, context.user.user_id),
          getRequestedUsers(1000, context.user.user_id),
          postedByUserLookupFunc(context.user.user_id),
          likedByMeLookup(context.user.user_id),
          postProjection,
        ])
        .toArray((err, postList) => {
          if (err) {
            reject(err);
          } else {
            if (postList[0]) {
              let postDetails = postList[0];

              var curUser = context.user.user_id;
              /*****/
              let followButton = {};
              if (curUser != postDetails.user_id) {
                if (postDetails.following) {
                  followButton = {
                    button_text: "Following",
                    button_link: "#",
                    button_type: "warning",
                  };
                } else {
                  if (postDetails.requestedUser) {
                    followButton = {
                      button_text: "Requested",
                      button_link: "#",
                      button_type: "warning",
                    };
                  } else {
                    followButton = {
                      button_text:
                        postDetails.private === true ? "Request" : "Follow",
                      button_link:
                        "/profile/" + postDetails.user_id + "/follow",
                      button_type: "success",
                    };
                  }
                }
              }
              postDetails.request_buttons = [followButton];
              /*****/
              if (postDetails.posted_for === "group") {
                const groupCollection = CONNECTION.collection(
                  GROUP_MODEL.collection_name
                );
                groupCollection.findOne(
                  {
                    group_id: postDetails.group_id,
                    group_admins: context.user.user_id,
                  },
                  (err, groupDetails) => {
                    if (groupDetails) {
                      postDetails.group_admin = true;
                      // let finalResponse = {};
                      // finalResponse.status = true;
                      // const cipherPostList = CryptoJs.AES.encrypt(JSON.stringify(postDetails), process.env.CRYPTO_SECRET).toString();
                      // finalResponse.data = cipherPostList;
                      // finalResponse.data = postDetails;
                      resolve(postDetails);
                    } else {
                      postDetails.group_admin = false;
                      // let finalResponse = {};
                      // finalResponse.status = true;
                      // const cipherPostList = CryptoJs.AES.encrypt(JSON.stringify(postDetails), process.env.CRYPTO_SECRET).toString();
                      // finalResponse.data = cipherPostList;
                      // finalResponse.data = postDetails;
                      resolve(postDetails);
                    }
                  }
                );
              } else {
                postDetails.group_admin = false;
                // let finalResponse = {};
                // finalResponse.status = true;
                // const cipherPostList = CryptoJs.AES.encrypt(JSON.stringify(postDetails), process.env.CRYPTO_SECRET).toString();
                // finalResponse.data = cipherPostList;
                // finalResponse.data = postDetails;
                resolve(postDetails);
              }
            } else {
              let error = new Error();
              error.name = "NOT_FOUND_ERROR";
              reject(error);
            }
          }
        });
    });
  });
};
