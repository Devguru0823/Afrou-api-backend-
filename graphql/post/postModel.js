"use strict";
const Model = require("../../models/post.json");
const advertModel = require("../../models/advert.model.json");
let utility = require("../../utilities");
const SITE_CONFIG = require("../../configs/siteConfig");
const USER_MODEL = require("../../models/user.json");
let userCollectionName = USER_MODEL.collection_name;
const {
  // userCollectionName,
  sharedPostLookup,
  advertDetailsLookup,
  audienceDetailsLookup,
  getComments,
  getRequestedUsers,
  postedByUserLookupFunc,
  likesLookup,
  likedByMeLookup,
  postProjection,
  postProcess,
  shuffle,
} = require("../../models/post");
// const USER_MODEL = require("../../models/user.json");
// const { calculateFourMonthsBack } = require("../../utilities/posts");


module.exports.getAfroswaggerPosts = async function (
  args,
  context,
  req,
  res,
  posted_for = "afroswagger"
) {
  return new Promise(async (resolve, reject) => {
    utility.mongoConnect(req, res, async function (CLIENT) {
      let CONNECTION = CLIENT.db(utility.dbName);
      let postCollection = CONNECTION.collection(Model.collection_name);
      let userId = context.user_id;
      // Get Conditions for the timeline Posts
      getPostsConditions(
        CONNECTION,
        userId,
        posted_for,
        function (err, conditions) {
         
          if (err) {
            reject(err);
            return;
          }
          // Pagination
          let page = Number(args?.page) || 1;
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
              {
                $addFields: {
                  seen_by: {
                    $cond: {
                      if: {
                        $ne: [
                          {
                            $type: "$seen_by",
                          },
                          "array",
                        ],
                      },
                      then: [],
                      else: "$seen_by",
                    },
                  },
                },
              },
              {
                $addFields: {
                  is_seen: {
                    $cond: {
                      if: {
                        $in: [userId, "$seen_by"],
                      },
                      then: 1,
                      else: 0,
                    },
                  },
                },
              },
              {
                // $sort: sort
                $sort: {
                  is_seen: 1,
                  created_date: -1,
                },
              },
              {
                $skip: skip,
              },
              {
                $limit: limit,
              },
              sharedPostLookup(),
              getComments(1000, context.user_id),
              getRequestedUsers(1000, context.user_id),
              postedByUserLookupFunc(context.user_id),
              likesLookup("post", context.user_id),
              likedByMeLookup(context.user_id),

              {
                $match: {
                  "userDetails.blocked_ids": {
                    $nin: [context.user_id],
                  },
                },
              },

              postProjection,
            ])
            .toArray((err, postList) => {
              if (err) {
                reject(err);
              } else {
                postList.forEach((post) => {
                  // console.log("post===>",post);
                  var curUser = context.user_id;
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
                // finalResponse.data = shuffle(postList);
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
const getPostsConditions = function (CONNECTION, loggedInUserId, section, cb) {
  // const loggedInUserId = req.authorization.user_id;
  // console.log(loggedInUserId);
  let userCollection = CONNECTION.collection(USER_MODEL.collection_name);

  if (section === "afrotalent" || section === "afroswagger") {
    userCollection
      .aggregate([
        {
          $match: {
            user_id: loggedInUserId,
          },
        },
      ])
      .toArray(function (err, userData) {
        if (err) {
          cb(err);
          return;
        }
        let userIdsForPosts = [];
        let hiddenPosts = [];
        if (
          userData[0] &&
          userData[0].following_ids &&
          Array.isArray(userData[0].following_ids)
        ) {
          userIdsForPosts = userData[0].following_ids;
          if (Array.isArray(userData[0].hidden_posts)) {
            hiddenPosts = [...userData[0].hidden_posts];
          }
        }
        userIdsForPosts.push(loggedInUserId);
        userCollection
          .aggregate([
            {
              $match: {
                user_id: { $nin: userIdsForPosts },
                status: "active",
              },
            },
            {
              $unwind: {
                path: "$sports_interests",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $match: {
                $or: [
                  {
                    sports_interests: {
                      $in: userData[0].sports_interests || [],
                    },
                  },
                  { state: userData[0].state },
                ],
              },
            },
            {
              $group: {
                _id: "$user_id",
                user_id: { $first: "$user_id" },
              },
            },
          ])
          .toArray((err, otherUsers) => {
            userIdsForPosts.push(...otherUsers.map((x) => x.user_id));
            const blockedList = userData[0].blocked_ids
              ? userData[0].blocked_ids
              : [];
            let condition = {
              $and: [
                { post_status: "active" },
                { posted_for: section },
                { posted_by: { $nin: blockedList } },
                {
                  $or: [
                    { posted_by: { $in: userIdsForPosts } },
                    { post_privacy: "public" },
                  ],
                },
                { post_id: { $nin: hiddenPosts } },
                {
                  post_date: {
                    $lte: new Date(),
                    $gte: calculateFourMonthsBack(),
                  },
                },
              ],
            };

            cb(null, condition);
          });
      });
  } else if (section === "profile") {
    let condition = {
      $and: [{ post_status: "active" }, { posted_by: loggedInUserId }],
    };
    cb(null, condition);
  } else {
    let error = new Error("Unknown");
    cb(error);
  }
};
/**
 *
 * @param {number} monthNum
 * @returns
 */
const get4MonthsBack = (monthNum) => {
  let month;
  switch (monthNum) {
    case 3:
      month = 11;
      break;

    case 2:
      month = 10;
      break;

    case 1:
      month = 9;
      break;

    case 0:
      month = 8;
      break;

    default:
      month = null;
      break;
  }
  return month;
};
const calculateFourMonthsBack = () => {
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth();
  const year = today.getFullYear();
  if (month <= 3) {
    // 4 months ago will be previous year
    const fourMonthBack = get4MonthsBack(month);
    const fourMonthBackDate = new Date(
      `${year - 1}-${fourMonthBack + 1}-${day}`
    );
    return fourMonthBackDate;
  }
  const fourMonthBack = month - 4;
  const fourMonthBackDate = new Date(
    `${year - 1}-0${fourMonthBack + 1}-${day}`
  );
  return fourMonthBackDate;
};
