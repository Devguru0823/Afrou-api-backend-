"use strict";
const Model = require("../../models/post.json");
let utility = require("../../utilities");
const SITE_CONFIG = require("../../configs/siteConfig");
const {
  userCollectionName,
  sharedPostLookup,
  getComments,
  getRequestedUsers,
  postedByUserLookupFunc,
  likesLookup,
  likedByMeLookup,
  postProjection,
} = require("../../models/post");

/**
 * GET MOST POPULAR POSTS
 * @param CLIENT
 * @param req
 * @param res
 * @param cb
 */
module.exports.getMostPopulatPosts = function (args, context, req, res) {
  return new Promise((resolve, reject) => {
    utility.mongoConnect(req, res, function (CLIENT) {
      let CONNECTION = CLIENT.db(utility.dbName);
      let postCollection = CONNECTION.collection(Model.collection_name);
      const posted_for = args.type || "afroswagger";

      /* Only load those posts which are not seen by user */
      let userCollection = CONNECTION.collection(userCollectionName);
      let user_id = context.user.user_id;
      var userMostPopularPostSeen = [];
      userCollection.findOne({ user_id: user_id }, function (err, user) {
        if (err) {
          reject(err);
        } else {
          if (user.mostpopularpostseen) {
            console.log(user.mostpopularpostseen);
            userMostPopularPostSeen = user.mostpopularpostseen;
          }
          postCollection
            .aggregate([
              {
                $match: {
                  post_status: "active",
                  posted_for: posted_for,
                  post_type: { $in: ["image", "video"] },
                  post_id: { $nin: userMostPopularPostSeen },
                },
              },
              {
                $addFields: {
                  like_comment_count: {
                    $add: [
                      "$like_count",
                      "$comment_count",
                      "$video_play_count",
                    ],
                  },
                },
              },
              {
                $sort: {
                  like_comment_count: -1,
                },
              },
              {
                $limit: SITE_CONFIG.mostPopularPostsCount,
              },
              sharedPostLookup(),
              getComments(1000, context.user.user_id),
              getRequestedUsers(1000, context.user.user_id),
              postedByUserLookupFunc(context.user.user_id),
              likesLookup("post", context.user.user_id),
              likedByMeLookup(context.user.user_id),
              postProjection,
              {
                $match: {
                  $or: [
                    { post_type: { $ne: "shared" } },
                    {
                      $and: [
                        { post_type: "shared" },
                        {
                          shared_post_data: {
                            $exists: true,
                            $not: { $size: 0 },
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            ])
            .toArray((err, postList) => {
              if (err) {
                reject(err);
              } else {
                postList.forEach((post) => {
                  if (!post.post_text) {
                    if (post.post_type === "image") {
                      post.post_text = "Image Post";
                    }
                    if (post.post_type === "video") {
                      post.post_text = "Video Post";
                    }
                    if (post.post_type === "shared") {
                      post.post_text = "Shared Post";
                    }
                  }
                  /*****/
                  var curUser = context.user.user_id;
                  let followButton = {};
                  if (curUser != post.user_id) {
                    if (post.following) {
                      followButton = {
                        button_text: "Following",
                        button_link: "#",
                        button_type: "warning",
                      };
                    } else {
                      if (post.requestedUser) {
                        followButton = {
                          button_text: "Requested",
                          button_link: "#",
                          button_type: "warning",
                        };
                      } else {
                        followButton = {
                          button_text:
                            post.private === true ? "Request" : "Follow",
                          button_link: "/profile/" + post.user_id + "/follow",
                          button_type: "success",
                        };
                      }
                    }
                  }
                  post.request_buttons = [followButton];
                  /*****/
                });
                
                 
                resolve(postList);
              }
            });
        }
      });
    });
  });
  /* ================================================= */
};
