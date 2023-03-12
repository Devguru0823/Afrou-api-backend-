"use strict";
const Model = require("../../models/post.json");
let utility = require("../../utilities");
const SITE_CONFIG = require("../../configs/siteConfig.json");
const {
  sharedPostLookup,
  getComments,
  getRequestedUsers,
  postedByUserLookupFunc,
  likesLookup,
  likedByMeLookup,
  postProjection,
} = require("../../models/post");

/**
 * GET ENTERTAINMENT POSTS
 * @param CLIENT
 * @param req
 * @param res
 * @param cb
 */
module.exports.getEntertainmentPosts = function (args, context, req, res, ) {
  return new Promise((resolve, reject) => {
    utility.mongoConnect(req, res, function (CLIENT) {
      let CONNECTION = CLIENT.db(utility.dbName);
      let postCollection = CONNECTION.collection(Model.collection_name);
      // Pagination
      let page = Number(args.page) || 1;
      let limit = SITE_CONFIG.postsLimitPerPage;
      let skip = (page - 1) * limit;
      postCollection
        .aggregate([
          {
            $match: {
              post_status: "active",
              posted_for: { $in: ["afroswagger", "afrotalent", "hashtag"] },
              post_type: { $in: ["image", "video"] },
            },
          },
          {
            $sort: {
              post_date: -1,
            },
          },
          {
            $skip: skip,
          },
          {
            $limit: limit,
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
                    { shared_post_data: { $exists: true, $not: { $size: 0 } } },
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
              var curUser = context.user.user_id;
              /*****/
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
                      button_text: post.private === true ? "Request" : "Follow",
                      button_link: "/profile/" + post.user_id + "/follow",
                      button_type: "success",
                    };
                  }
                }
              }
              post.request_buttons = [followButton];
              /*****/
            });
            let finalResponse = {};
            finalResponse.status = true;
            finalResponse.data = postList;
            finalResponse.count = postList.length;
            finalResponse.currentPage = page;
            finalResponse.nextPage = page + 1;
            resolve(finalResponse);
          }
        });
    });
  });
};
