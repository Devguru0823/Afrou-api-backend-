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
 *
 * @param CLIENT
 * @param req
 * @param res
 * @param posted_for
 * @param cb
 */
module.exports.getPosts = function (
  args,
  context,
  posted_for = "afrotalent",
  req,
  res
) {
  return new Promise((resolve, reject) => {
    utility.mongoConnect(req, res, function (CLIENT) {
      let CONNECTION = CLIENT.db(utility.dbName);
      let postCollection = CONNECTION.collection(Model.collection_name);

      // Get Conditions for the timeline Posts
      utility.getPostsConditions(
        CONNECTION,
        { authorization: { user_id: context.user.user_id } },
        posted_for,
        function (err, conditions) {
          // let userId = context.user.user_id;
          if (err) {
            reject(err);

            return;
          }
          // Pagination
          let page = Number(args.page) || 1;
          let limit = SITE_CONFIG.postsLimitPerPage;
          let skip = (page - 1) * limit;

          // Sorting
          let sort = {
            post_date: -1,
          };

          postCollection
            .aggregate([
              {
                $match: conditions,
              },
              // {
              //   "$addFields": {
              //     "seen_by": {
              //       "$cond": {
              //         "if": {
              //           "$ne": [
              //             {
              //               "$type": "$seen_by"
              //             },
              //             "array"
              //           ]
              //         },
              //         "then": [],
              //         "else": "$seen_by"
              //       }
              //     }
              //   }
              // },
              // {
              //   "$addFields": {
              //     is_seen: {
              //       $cond: {
              //         if: {
              //           $in: [
              //             userId,
              //             "$seen_by"
              //           ]
              //         },
              //         then: 1,
              //         else: 0
              //       }
              //     }
              //   },
              // },
              {
                $sort: sort,
                // $sort: {
                //   is_seen: 1,
                //   created_date:-1
                // }
              },
              {
                $skip: skip,
              },
              {
                $limit: limit,
              },
              sharedPostLookup(context.user.user_id),
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
                  // console.log("post===>",post);
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
                let finalResponse = {};
                finalResponse.status = true;
                // const cipherPostList = CryptoJs.AES.encrypt(JSON.stringify(postList), process.env.CRYPTO_SECRET).toString();
                // finalResponse.data = cipherPostList;
                finalResponse.data = postList;
                finalResponse.count = postList.length;
                finalResponse.currentPage = page;
                finalResponse.nextPage = page + 1;
                resolve(finalResponse);
              }
            });
        }
      );
    });
  });
};
