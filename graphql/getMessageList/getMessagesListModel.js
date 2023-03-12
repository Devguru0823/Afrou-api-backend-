"use strict";
const Model = require("../../models/message.json");
const userModel = require("../../models/user.json");
let utility = require("../../utilities");

const { socketCollectionName } = require("../../models/message");

// module.exports.getMessagesListSocket = function (args, context, req, res) {
//   return new Promise((resolve, reject) => {
//     utility.mongoConnect(req, res, function (CLIENT) {
//       let CONNECTION = CLIENT.db(utility.dbName);
//       let messageCollection = CONNECTION.collection(Model.collection_name);
//       let userCollection = CONNECTION.collection(userModel.collection_name);
//       let currentUserId = context.user.user_id;
//       userCollection.findOne(
//         { user_id: currentUserId },
//         function (err, userDetails) {
//           let friendIds = userDetails.friend_ids || [];
//           if (!userDetails.following_ids) {
//             userDetails.following_ids = [];
//           }
//           if (!userDetails.follower_ids) {
//             userDetails.follower_ids = [];
//           }

//           friendIds.push(...userDetails.following_ids);
//           friendIds.push(...userDetails.follower_ids);

//           var type = "listAll";
//           if (args) {
//             type = args.type || "listAll";
//           }

//           messageCollection
//             .aggregate([
//               {
//                 $match: {
//                   $or: [{ from_id: currentUserId }, { to_id: currentUserId }],
//                   archive_by: { $ne: currentUserId },
//                   delete_by: { $ne: currentUserId },
//                   message_status: { $ne: "deleted" },
//                 },
//               },
//               {
//                 $group: {
//                   _id: null,
//                   to_ids: { $addToSet: "$to_id" },
//                   from_ids: { $addToSet: "$from_id" },
//                 },
//               },
//               {
//                 $project: {
//                   user_ids: {
//                     $filter: {
//                       input: { $setUnion: ["$to_ids", "$from_ids"] },
//                       as: "item",
//                       cond: { $ne: ["$$item", currentUserId] },
//                     },
//                   },
//                 },
//               },
//             ])
//             .toArray((err, messageUserList) => {
//               if (messageUserList && messageUserList.length > 0) {
//                 if (messageUserList[0].user_ids) {
//                   friendIds.push(...messageUserList[0].user_ids);
//                 }
//               }
//               if (userDetails.archived_users) {
//                 if (type == "listAll") {
//                   friendIds = friendIds.filter(function (el) {
//                     return userDetails.archived_users.indexOf(el) < 0;
//                   });
//                   console.log({ friendIds, type });
//                 } else if (type == "archivedAll") {
//                   friendIds = friendIds.filter(function (el) {
//                     return userDetails.archived_users.indexOf(el) >= 0;
//                   });
//                   console.log({ friendIds, type });
//                 }
//               } else {
//                 if (type == "archivedAll") {
//                   friendIds = {};
//                 }
//               }
//               if (userDetails.delmsglist_users) {
//                 friendIds = friendIds.filter(function (el) {
//                   return userDetails.delmsglist_users.indexOf(el) < 0;
//                 });
//               }
//               userCollection
//                 .aggregate([
//                   {
//                     $match: {
//                       user_id: { $in: friendIds },
//                       status: "active",
//                     },
//                   },
//                   {
//                     $project: {
//                       first_name: 1,
//                       last_name: 1,
//                       user_name: { $ifNull: ["$user_name", ""] },
//                       user_id: 1,
//                       profile_image_url: 1,
//                       last_active: 1,
//                       blocked_ids: 1,
//                     },
//                   },
//                   {
//                     $lookup: {
//                       from: socketCollectionName,
//                       let: {
//                         userId: "$user_id",
//                       },
//                       pipeline: [
//                         {
//                           $match: {
//                             $expr: {
//                               $eq: ["$user_id", "$$userId"],
//                             },
//                           },
//                         },
//                         {
//                           $project: {
//                             user_id: 1,
//                             status: 1,
//                           },
//                         },
//                       ],
//                       as: "SocketUser",
//                     },
//                   },
//                   {
//                     $lookup: {
//                       from: Model.collection_name,
//                       let: {
//                         userId: "$user_id",
//                       },
//                       pipeline: [
//                         {
//                           $match: {
//                             $expr: {
//                               $or: [
//                                 {
//                                   $and: [
//                                     { $eq: ["$to_id", currentUserId] },
//                                     { $eq: ["$from_id", "$$userId"] },
//                                   ],
//                                 },
//                                 {
//                                   $and: [
//                                     { $eq: ["$to_id", "$$userId"] },
//                                     { $eq: ["$from_id", currentUserId] },
//                                   ],
//                                 },
//                               ],
//                             },
//                           },
//                         },
//                         {
//                           $sort: {
//                             created_date: -1,
//                           },
//                         },
//                         {
//                           $group: {
//                             _id: null,
//                             last_message: { $first: "$message_text" },
//                             last_message_image: { $first: "$message_image" },
//                             last_message_time: { $first: "$created_date" },
//                             unread_count: {
//                               $sum: {
//                                 $cond: [
//                                   {
//                                     $and: [
//                                       { $eq: ["$message_status", "unread"] },
//                                       { $eq: ["$to_id", currentUserId] },
//                                       { $eq: ["$delete_by", currentUserId] },
//                                     ],
//                                   },
//                                   1,
//                                   0,
//                                 ],
//                               },
//                             },
//                             message_count: {
//                               $sum: {
//                                 $cond: [
//                                   {
//                                     $and: [
//                                       {
//                                         $or: [
//                                           { $eq: ["$to_id", currentUserId] },
//                                           { $eq: ["$from_id", currentUserId] },
//                                         ],
//                                       },
//                                       { $eq: ["$delete_by", currentUserId] },
//                                     ],
//                                   },
//                                   1,
//                                   0,
//                                 ],
//                               },
//                             },
//                           },
//                         },
//                       ],
//                       as: "messages",
//                     },
//                   },
//                   {
//                     $project: {
//                       first_name: 1,
//                       last_name: 1,
//                       user_name: { $ifNull: ["$user_name", ""] },
//                       profile_image_url: 1,
//                       user_id: 1,
//                       last_active: 1,
//                       last_message: {
//                         $arrayElemAt: ["$messages.last_message", 0],
//                       },
//                       last_message_image: {
//                         $arrayElemAt: ["$messages.last_message_image", 0],
//                       },
//                       last_message_time: {
//                         $arrayElemAt: ["$messages.last_message_time", 0],
//                       },
//                       unread_count: {
//                         $arrayElemAt: ["$messages.unread_count", 0],
//                       },
//                       message_count: {
//                         $arrayElemAt: ["$messages.message_count", 0],
//                       },
//                       blocked_ids: 1,
//                       SocketUser_user_id: {
//                         $arrayElemAt: ["$SocketUser.user_id", 0],
//                       },
//                       SocketUser_status: {
//                         $arrayElemAt: ["$SocketUser.status", 0],
//                       },
//                     },
//                   },
//                   {
//                     $sort: {
//                       last_message_time: -1,
//                     },
//                   },
//                 ])
//                 .toArray((err, messagesList) => {
//                   console.log(err);
//                   // console.log("==> ", messagesList);
//                   console.log({ messagesList });
//                   if (messagesList) {
//                     messagesList.forEach((friend, MLindex) => {
//                       if (
//                         friend.blocked_ids &&
//                         friend.blocked_ids.indexOf(userDetails.user_id) !== -1
//                       ) {
//                         messagesList.splice(MLindex, 1);
//                       }
//                       if (
//                         userDetails.blocked_ids &&
//                         userDetails.blocked_ids.indexOf(friend.user_id) !== -1
//                       ) {
//                         friend.blocked_by_me = true;
//                       } else {
//                         friend.blocked_by_me = false;
//                       }
//                       if (messagesList[MLindex]) {
//                         if (messagesList[MLindex].message_count == 0) {
//                           messagesList[MLindex].last_message = "";
//                           messagesList[MLindex].last_message_image = "";
//                         }
//                         messagesList[MLindex].online_status = false;
//                         if (
//                           friend.SocketUser_status &&
//                           friend.SocketUser_status == "active"
//                         ) {
//                           messagesList[MLindex].online_status = true;
//                         }
//                       }
//                     });
//                   } else {
//                     messagesList = [];
//                   }
//                   // let finalResponse = {};
//                   // finalResponse.status = true;
//                   // finalResponse.data = messagesList;
//                   console.log({ messagesList });
//                   resolve(messagesList);
//                 });
//             });
//         }
//       );
//     });
//   });
// };

module.exports.getMessagesListSocket = function (args, context, req, res) {
  return new Promise((resolve, reject) => {
    utility.mongoConnect(req, res, function (CLIENT) {
      let CONNECTION = CLIENT.db(utility.dbName);
      let messageCollection = CONNECTION.collection(Model.collection_name);
      let userCollection = CONNECTION.collection(userModel.collection_name);
      let currentUserId = context.user.user_id;
      userCollection.findOne(
        { user_id: currentUserId },
        function (err, userDetails) {
          let friendIds = userDetails.friend_ids || [];
          if (!userDetails.following_ids) {
            userDetails.following_ids = [];
          }
          if (!userDetails.follower_ids) {
            userDetails.follower_ids = [];
          }

          friendIds.push(...userDetails.following_ids);
          friendIds.push(...userDetails.follower_ids);

          var type = "listAll";
          if (args) {
            type =args.type || "listAll";
          }
          // console.log("type: ", type);

          messageCollection
            .aggregate([
              {
                $match: {
                  $or: [{ from_id: currentUserId }, { to_id: currentUserId }],
                  archive_by: { $ne: currentUserId },
                  delete_by: { $ne: currentUserId },
                  message_status: { $ne: "deleted" },
                },
              },
              {
                $group: {
                  _id: null,
                  to_ids: { $addToSet: "$to_id" },
                  from_ids: { $addToSet: "$from_id" },
                },
              },
              {
                $project: {
                  user_ids: {
                    $filter: {
                      input: { $setUnion: ["$to_ids", "$from_ids"] },
                      as: "item",
                      cond: { $ne: ["$$item", currentUserId] },
                    },
                  },
                },
              },
            ])
            .toArray((err, messageUserList) => {
              if (messageUserList && messageUserList.length > 0) {
                if (messageUserList[0].user_ids) {
                  friendIds.push(...messageUserList[0].user_ids);
                }
              }
              if (userDetails.archived_users) {
                if (type == "listAll") {
                  friendIds = friendIds.filter(function (el) {
                    return userDetails.archived_users.indexOf(el) < 0;
                  });
                } else if (type == "archivedAll") {
                  friendIds = friendIds.filter(function (el) {
                    return userDetails.archived_users.indexOf(el) >= 0;
                  });
                }
              } else {
                if (type == "archivedAll") {
                  friendIds = {};
                }
              }

              try {
                if (userDetails.delmsglist_users) {
                  friendIds = friendIds.filter(function (el) {
                    return userDetails.delmsglist_users.indexOf(el) < 0;
                  });
                }
              } catch (e) {
                console.log("Friends Error: ", e);
              }
              userCollection
                .aggregate([
                  {
                    $match: {
                      user_id: { $in: friendIds },
                      status: "active",
                    },
                  },
                  {
                    $project: {
                      first_name: 1,
                      last_name: 1,
                      user_name: { $ifNull: ["$user_name", ""] },
                      user_id: 1,
                      profile_image_url: 1,
                      last_active: 1,
                      blocked_ids: 1,
                    },
                  },
                  {
                    $lookup: {
                      from: socketCollectionName,
                      let: {
                        userId: "$user_id",
                      },
                      pipeline: [
                        {
                          $match: {
                            $expr: {
                              $eq: ["$user_id", "$$userId"],
                            },
                          },
                        },
                        {
                          $project: {
                            user_id: 1,
                            status: 1,
                          },
                        },
                      ],
                      as: "SocketUser",
                    },
                  },
                  {
                    $lookup: {
                      from: Model.collection_name,
                      let: {
                        userId: "$user_id",
                      },
                      pipeline: [
                        {
                          $match: {
                            $expr: {
                              $or: [
                                {
                                  $and: [
                                    { $eq: ["$to_id", currentUserId] },
                                    { $eq: ["$from_id", "$$userId"] },
                                  ],
                                },
                                {
                                  $and: [
                                    { $eq: ["$to_id", "$$userId"] },
                                    { $eq: ["$from_id", currentUserId] },
                                  ],
                                },
                              ],
                            },
                            archive_by: { $ne: currentUserId },
                            delete_by: { $ne: currentUserId },
                            message_status: { $ne: "deleted" },
                          },
                        },
                        {
                          $sort: {
                            created_date: -1,
                          },
                        },
                        {
                          $group: {
                            _id: null,
                            last_message: { $first: "$message_text" },
                            last_message_image: { $first: "$message_image" },
                            last_message_time: { $first: "$created_date" },
                            unread_count: {
                              $sum: {
                                $cond: [
                                  {
                                    $and: [
                                      { $eq: ["$message_status", "unread"] },
                                      { $eq: ["$to_id", currentUserId] },
                                    ],
                                  },
                                  1,
                                  0,
                                ],
                              },
                            },
                          },
                        },
                      ],
                      as: "messages",
                    },
                  },
                  {
                    $project: {
                      first_name: 1,
                      last_name: 1,
                      user_name: { $ifNull: ["$user_name", ""] },
                      profile_image_url: 1,
                      user_id: 1,
                      last_active: 1,
                      last_message: {
                        $arrayElemAt: ["$messages.last_message", 0],
                      },
                      last_message_image: {
                        $arrayElemAt: ["$messages.last_message_image", 0],
                      },
                      last_message_time: {
                        $arrayElemAt: ["$messages.last_message_time", 0],
                      },
                      unread_count: {
                        $arrayElemAt: ["$messages.unread_count", 0],
                      },
                      blocked_ids: 1,
                      SocketUser_user_id: {
                        $arrayElemAt: ["$SocketUser.user_id", 0],
                      },
                      SocketUser_status: {
                        $arrayElemAt: ["$SocketUser.status", 0],
                      },
                    },
                  },
                  {
                    $sort: {
                      last_message_time: -1,
                    },
                  },
                ])
                .toArray((err, messagesList) => {
                  if (messagesList) {
                    messagesList.forEach((friend, MLindex) => {
                      if (
                        friend.blocked_ids &&
                        friend.blocked_ids.indexOf(userDetails.user_id) !== -1
                      ) {
                        messagesList.splice(MLindex, 1);
                      }
                      if (
                        userDetails.blocked_ids &&
                        userDetails.blocked_ids.indexOf(friend.user_id) !== -1
                      ) {
                        friend.blocked_by_me = true;
                      } else {
                        friend.blocked_by_me = false;
                      }
                      // console.log("MLindex: ", MLindex);
                      // console.log("friend: ", friend);
                      if (messagesList[MLindex]) {
                        messagesList[MLindex].online_status = false;
                        if (
                          friend.SocketUser_status &&
                          friend.SocketUser_status == "active"
                        ) {
                          messagesList[MLindex].online_status = true;
                        }
                      }
                    });
                  } else {
                    messagesList = [];
                  }
                  let finalResponse = {};
                  finalResponse.status = true;
                  finalResponse.data = messagesList;
                  resolve( messagesList);
                });
            });
          // });
        }
      );
    });
  });
};
