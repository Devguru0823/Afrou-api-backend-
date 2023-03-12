"use strict";
const Model = require("../../models/post.json");
let utility = require("../../utilities");
const NOTIFICATION = require("../../models/notification.js");
const { sendPush, sendPush2 } = require("../../_helpers/push-notification");
const GROUP_MODEL = require("../../models/group.json");
const { userCollectionName } = require("../../models/post");

module.exports.reportPostByPostId = function (args, context, req, res) {
  return new Promise((resolve, reject) => {
    utility.mongoConnect(req, res, function (CLIENT) {
      let CONNECTION = CLIENT.db(utility.dbName);
      let postCollection = CONNECTION.collection(Model.collection_name);
      let post_id = Number(args.postId);
      postCollection.findOne({ post_id: post_id }, (err, postDetails) => {
        if (!postDetails) {
          let error = new Error("Invalid Post");
          reject(error);
        } else {
          const reportCollection = CONNECTION.collection("report");
          let reportData = {
            report_for: "post",
            post_id: post_id,
            reported_by: context.user.user_id,
            report_time: new Date(),
            report_reason: args.reportReason,
            report_status: "pending",
          };
          reportCollection.insertOne(reportData, (err, inserted) => {
            if (postDetails.posted_for === "group") {
              const groupCollection = CONNECTION.collection(
                GROUP_MODEL.collection_name
              );
              groupCollection.findOne(
                { group_id: postDetails.group_id },
                async (err, groupDetails) => {
                  let notification_details = {
                    text_template:
                      "{{USER_ID_" +
                      context.user.user_id +
                      "}} has reported a Post in your Group",
                    post_id: post_id,
                  };

                  let notification_type = "group_post_report";
                  let notify_users = groupDetails.group_admins;
                  let userCollection =
                    CONNECTION.collection(userCollectionName);
                  await userCollection
                    .findOne({ user_id: context.user.user_id })
                    .then((Details) => {
                      let pushData = {
                        status: "Group Post Report",
                        title: "Group Post Report",
                        body: `${Details.first_name} ${Details.last_name} has reported a Post in your Group`,
                        sound: "default",
                        mutable_content: true,
                        content_available: true,
                        data: {
                          status: "Group Post Report",
                          message: `${Details.first_name} ${Details.last_name} has reported a Post in your Group`,
                          notification_type: notification_type,
                          post_id: notification_details.post_id,
                        },
                      };
                      notify_users.forEach((user) => {
                        userCollection
                          .findOne({ user_id: user })
                          .then((userDetails) => {
                            var userNameET = "";
                            var userNameEF = "";
                            if (userDetails.user_name) {
                              userNameET = userDetails.user_name;
                            }
                            if (Details.user_name) {
                              userNameEF = Details.user_name;
                            }
                            var sendEmailVar = true;
                            if (userDetails.isUnscribed) {
                              if (userDetails.isUnscribed == 1) {
                                sendEmailVar = false;
                              }
                            }
                            let email = {
                              sendEmail: sendEmailVar,
                              post_id: notification_details.post_id,
                              type: "groupPostReport",
                              toUser: {
                                user_id: userDetails.user_id,
                                first_name: userDetails.first_name,
                                last_name: userDetails.last_name,
                                email: userDetails.email,
                                user_name: userNameET,
                              },
                              fromUser: {
                                user_id: Details.user_id,
                                first_name: Details.first_name,
                                last_name: Details.last_name,
                                email: Details.email,
                                user_name: userNameEF,
                              },
                            };
                            sendPush2(
                              userDetails.firebase_token,
                              "Group Post Report",
                              pushData,
                              true,
                              email
                            );
                            // sendPush(
                            //   userDetails.firebase_token,
                            //   "Group Post Report",
                            //   pushData,
                            //   true,
                            // );
                          })
                          .catch((err) => console.error(err));
                      });
                    })
                    .catch((err) => console.error(err));
                  NOTIFICATION.addNotification(
                    CLIENT,
                    req,
                    res,
                    notification_type,
                    notify_users,
                    notification_details,
                    function (err, notificationResp) {
                      let finalResponse = {};
                      finalResponse.status = true;
                      resolve(finalResponse);
                    }
                  );
                }
              );
            } else {
              // get reporter detail
              let userCollection = CONNECTION.collection(userCollectionName);
              userCollection
                .findOne({ user_id: context.user.user_id })
                .then((Details) => {
                  // get poster detail
                  userCollection
                    .findOne({ user_id: postDetails.posted_by })
                    .then((postedByDetails) => {
                      var postImagePath = "";
                      if (postDetails.post_type == "image") {
                        if (postDetails.post_image) {
                          if (postDetails.post_image[0]) {
                            postImagePath = postDetails.post_image[0];
                          }
                        }
                      } else if (postDetails.post_type == "video") {
                        if (postDetails.thumbnail) {
                          postImagePath = postDetails.thumbnail;
                        }
                      }
                      if (postImagePath != "") {
                        postImagePath =
                          "https://cdn.staging.afrocamgist.com/" +
                          postImagePath;
                      }

                      let userName =
                        Details.first_name + " " + Details.last_name;
                      if (Details.user_name && Details.user_name != "") {
                        userName = Details.user_name;
                      }
                      let notification_type = "post_report";
                      let notification_details = {
                        text_template:
                          "{{USER_ID_" +
                          context.user.user_id +
                          "}} has reported your post",
                        post_id: post_id,
                      };
                      let pushData = {
                        status: "Post Report",
                        title: "Post Report",
                        body: `${userName} reported your post`,
                        image: postImagePath,
                        sound: "default",
                        mutable_content: true,
                        content_available: true,
                        data: {
                          status: "Post Report",
                          message: `${Details.first_name} ${Details.last_name} reported your post`,
                          image: postImagePath,
                          notification_type: notification_type,
                          post_id: post_id,
                        },
                      };
                      if (postedByDetails.firebase_token) {
                        sendPush(
                          postedByDetails.firebase_token,
                          notification_type,
                          pushData,
                          true
                        );
                      }
                      let notify_users = [postedByDetails.posted_by];
                      NOTIFICATION.addNotification(
                        CLIENT,
                        req,
                        res,
                        notification_type,
                        notify_users,
                        notification_details,
                        function (err, notificationResp) {
                          resolve({ status: true, data: "Report Successful!" });
                        }
                      );
                    });
                });
            }
          });
        }
      });
    });
  });
};
