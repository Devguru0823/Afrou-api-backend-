"use strict";
const Model = require("../../models/message.json");
const userModel = require("../../models/user.json");
let utility = require("../../utilities");
const { likesLookup, likedByMeLookup } = require("../../models/message");

module.exports.getMessagesByUserId = function (args, context, req, res) {
  return new Promise((resolve, reject) => {
    utility.mongoConnect(req, res, function (CLIENT) {
      let CONNECTION = CLIENT.db(utility.dbName);
      let messageCollection = CONNECTION.collection(Model.collection_name);
      let userCollection = CONNECTION.collection(userModel.collection_name);
      const user_id = Number(args.userId);
      const currentLoggedInUser = context.user.user_id;

      userCollection.findOne(
        { user_id: currentLoggedInUser },
        function (err, userDetails) {
          messageCollection
            .aggregate([
              {
                $match: {
                  $or: [
                    { to_id: currentLoggedInUser, from_id: user_id },
                    { to_id: user_id, from_id: currentLoggedInUser },
                  ],
                  message_status: { $ne: "deleted" },
                },
              },
              {
                $sort: { created_date: -1 },
              },
              {
                $limit: 20,
              },
              {
                $lookup: {
                  from: userModel.collection_name,
                  localField: "from_id",
                  foreignField: "user_id",
                  as: "fromUserDetails",
                },
              },
              likesLookup("message", currentLoggedInUser),
              likedByMeLookup(currentLoggedInUser),
              {
                $project: {
                  to_id: 1,
                  message_text: 1,
                  message_image: 1,
                  from_id: 1,
                  message_status: 1,
                  created_date: 1,
                  message_id: 1,
                  "from_user.first_name": {
                    $arrayElemAt: ["$fromUserDetails.first_name", 0],
                  },
                  "from_user.last_name": {
                    $arrayElemAt: ["$fromUserDetails.last_name", 0],
                  },
                  "from_user.user_name": {
                    $ifNull: [
                      { $arrayElemAt: ["$fromUserDetails.user_name", 0] },
                      "",
                    ],
                  },
                  "from_user.profile_image_url": {
                    $arrayElemAt: ["$fromUserDetails.profile_image_url", 0],
                  },
                  from: {
                    $cond: [
                      { $eq: ["$from_id", currentLoggedInUser] },
                      "me",
                      "friend",
                    ],
                  },
                  message_reply_id: 1,
                  message_reply_text: 1,
                  like_count: { $ifNull: ["$like_count", 0] },
                  liked: {
                    $cond: [
                      { $eq: [{ $arrayElemAt: ["$liked.count", 0] }, 1] },
                      true,
                      false,
                    ],
                  },
                  liked_by: 1,
                },
              },
            ])
            .toArray((err, messageList) => {
              if (err) {
                reject(err);
              } else {
                messageList.forEach((friend, MLindex) => {
                  if (friend.from == "me") {
                    if (
                      userDetails.blocked_ids &&
                      userDetails.blocked_ids.indexOf(friend.to_id) !== -1
                    ) {
                      friend.blocked_by_me = true;
                    } else {
                      friend.blocked_by_me = false;
                    }
                  } else {
                    if (
                      userDetails.blocked_ids &&
                      userDetails.blocked_ids.indexOf(friend.from_id) !== -1
                    ) {
                      friend.blocked_by_me = true;
                    } else {
                      friend.blocked_by_me = false;
                    }
                  }
                });
                messageCollection.updateMany(
                  {
                    to_id: currentLoggedInUser,
                    from_id: user_id,
                    message_status: { $ne: "deleted" },
                  },
                  { $set: { message_status: "read" } },
                  function (err, readMessages) {
                    // let finalResponse = {};
                    // finalResponse.status = true;
                    // finalResponse.data = messageList.reverse();
                    resolve(messageList.reverse());
                  }
                );
              }
            });
        }
      );
    });
  });
};
