"use strict";
const Model = require("../../models/message.json");
const userModel = require("../../models/user.json");
let utility = require("../../utilities");
const { sendPush2 } = require("../../_helpers/push-notification");
const { socketCollectionName } = require("../../models/message");

module.exports.addMessage = function (args, context, req, res, ) {
  return new Promise((resolve, reject) => {
    utility.mongoConnect(req, res, function (CLIENT) {
      let CONNECTION = CLIENT.db(utility.dbName);
      let messageCollection = CONNECTION.collection(Model.collection_name);

      let newMessageData = utility.filterBody(args.message);
      if (newMessageData === {}) {
        return reject({ error: "invalid data" });
      }
      newMessageData.from_id = context.user.user_id;
      newMessageData.to_id = Number(args.toId);

      utility.validatePostData(
        CONNECTION,
        newMessageData,
        Model,
        "insert",
        0,
        function (err, validatedData) {
          if (err) {
            reject(err);
          } else {
            messageCollection.insertOne(
              validatedData,
              async function (err, response) {
                if (err) {
                  reject(err);
                } else {
                  let userCollection = CONNECTION.collection(
                    userModel.collection_name
                  );
                  let socketCollection =
                    CONNECTION.collection(socketCollectionName);
                  await userCollection
                    .findOne({ user_id: newMessageData.from_id })
                    .then(async (Details) => {
                      /** If receiver mark as deleted then remove */
                      let addTodellist = {
                        delmsglist_users: { $in: [newMessageData.to_id] },
                      };
                      const updateDelUser =
                        await userCollection.findOneAndUpdate(
                          { user_id: newMessageData.from_id },
                          { $pull: addTodellist },
                          { returnOriginal: false }
                        );
                      /** */
                      await userCollection
                        .findOne({ user_id: newMessageData.to_id })
                        .then(async (Details_to) => {
                          /** If receiver mark as deleted then remove */
                          let addTodellist1 = {
                            delmsglist_users: { $in: [newMessageData.from_id] },
                          };
                          const updateDelUser1 =
                            await userCollection.findOneAndUpdate(
                              { user_id: newMessageData.to_id },
                              { $pull: addTodellist1 },
                              { returnOriginal: false }
                            );
                          /** */
                          /*Blocked sender by receiver logic*/
                          if (
                            Details_to.blocked_ids &&
                            Details_to.blocked_ids.indexOf(Details.user_id) !==
                              -1
                          ) {
                            Details_to.blocked_by_me = true;
                          } else {
                            Details_to.blocked_by_me = false;
                          }
                          var result = {};
                          result.blocked_by_me = Details_to.blocked_by_me;
                          result.created_date = validatedData.created_date;
                          result.from = "me";
                          result.from_id = validatedData.from_id;
                          result.from_user = {
                            first_name: Details.first_name,
                            last_name: Details.last_name,
                            profile_image_url: Details.profile_image_url,
                          };
                          result.like_count = 0;
                          result.liked = false;
                          result.liked_by = [];
                          result.message_id = validatedData.message_id;
                          result.message_image = validatedData.message_image
                            ? validatedData.message_image
                            : "";
                          result.message_status = validatedData.message_status;
                          result.message_text = validatedData.message_text;
                          result.to_id = validatedData.to_id;
                          result._id = response?.insertedId;
                          /**********************************/
                          var userName =
                            Details.first_name + " " + Details.last_name;
                          if (Details.user_name && Details.user_name != "") {
                            userName = Details.user_name;
                          }
                          let pushData = {
                            status: "New Message",
                            title: "New Message",
                            body: `You got new message from ${userName}`,
                            sound: "default",
                            mutable_content: true,
                            content_available: true,
                            data: {
                              status: "New Message",
                              message: `You got new message from ${userName}`,
                              notification_type: "message",
                              user_info: {
                                first_name: Details.first_name,
                                last_name: Details.last_name,
                                user_id: Details.user_id,
                                blocked_by_me: Details_to.blocked_by_me,
                                profile_image_url: `https://cdn.afrocamgist.com/${Details.profile_image_url}`,
                              },
                            },
                          };
                          userCollection
                            .findOne({ user_id: newMessageData.to_id })
                            .then((userDetails) => {
                              socketCollection
                                .findOne({
                                  user_id: userDetails.user_id,
                                  status: "active",
                                })
                                .then((socketUser) => {
                                  var userNameET = "";
                                  var userNameEF = "";
                                  if (userDetails.user_name) {
                                    userNameET = userDetails.user_name;
                                  }
                                  if (Details.user_name) {
                                    userNameEF = Details.user_name;
                                  }
                                  /*Blocked sender by receiver logic*/
                                  if (
                                    Details_to.blocked_ids &&
                                    Details_to.blocked_ids.indexOf(
                                      Details.user_id
                                    ) !== -1
                                  ) {
                                    Details_to.blocked_by_me = true;
                                  } else {
                                    Details_to.blocked_by_me = false;
                                  }

                                  var result = {};
                                  result.blocked_by_me =
                                    Details_to.blocked_by_me;
                                  result.created_date =
                                    validatedData.created_date;
                                  result.from = "me";
                                  result.from_id = validatedData.from_id;
                                  result.from_user = {
                                    first_name: Details.first_name,
                                    last_name: Details.last_name,
                                    profile_image_url:
                                      Details.profile_image_url,
                                  };
                                  result.like_count = 0;
                                  result.liked = false;
                                  result.liked_by = [];
                                  result.message_id = validatedData.message_id;
                                  result.message_image =
                                    validatedData.message_image
                                      ? validatedData.message_image
                                      : "";
                                  result.message_status =
                                    validatedData.message_status;
                                  result.message_text =
                                    validatedData.message_text;
                                  result.to_id = validatedData.to_id;
                                  result._id = response?.insertedId;
                                  /**********************************/
                                  var socketId = socketUser
                                    ? socketUser.socket
                                    : "";
                                  var emailMessage = `You got new message from ${Details.first_name} ${Details.last_name}`;

                                  var sendEmailVar = true;
                                  if (userDetails.isUnscribed) {
                                    if (userDetails.isUnscribed == 1) {
                                      sendEmailVar = false;
                                    }
                                  }
                                  let email = {
                                    sendEmail: sendEmailVar,
                                    message: emailMessage,
                                    type: "newMessage",
                                    toUser: {
                                      user_id: userDetails.user_id,
                                      first_name: userDetails.first_name,
                                      last_name: userDetails.last_name,
                                      email: userDetails.email,
                                      user_name: userNameET,
                                      socketId: socketId,
                                    },
                                    fromUser: {
                                      user_id: Details.user_id,
                                      first_name: Details.first_name,
                                      last_name: Details.last_name,
                                      email: Details.email,
                                      user_name: userNameEF,
                                    },
                                  };
                                  console.log("=== Add ===");
                                  console.log(pushData);
                                  // userDetails.firebase_token = "fs4iycYXEkU:APA91bHtKvoobXV4qP_gibACJRxZNCcQ_dgm0HkT7AzWhDlVAXoIWWmsM3HMIXHX2SL7rVl35tM4YekC7hbaDTvEcfNtRtHfyrNe-OA2CPnbOKEBBQhYsOz2GQo5GbvupHaiQeMVFny0";
                                  console.log(userDetails.firebase_token);
                                  console.log(email);
                                  console.log("===========");
                                  sendPush2(
                                    userDetails.firebase_token,
                                    "New Message",
                                    pushData,
                                    true,
                                    email
                                  );
                                  // sendPush(
                                  //     userDetails.firebase_token,
                                  //     "New Message",
                                  //     pushData,
                                  //     true,
                                  // );
                                  let finalResponse = {};
                                  finalResponse.status = true;
                                  finalResponse.data = result;
                                  resolve(result);
                                })
                                .catch((err) => console.error(err));
                            })
                            .catch((err) => console.error(err));
                        })
                        .catch((err) => console.error(err));
                    })
                    .catch((err) => console.error(err));
                  // let finalResponse = {};
                  // finalResponse.status = true;
                  // cb(null, finalResponse);
                }
              }
            );
          }
        }
      );
    });
  });
};
