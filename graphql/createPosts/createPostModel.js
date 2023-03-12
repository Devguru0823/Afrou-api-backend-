"use strict";
const Model = require("../../models/post.json");
let utility = require("../../utilities");
const NOTIFICATION = require("../../models/notification.js");
const { sendPush2 } = require("../../_helpers/push-notification");
const USER_MODEL = require("../../models/user.json");
const GROUP_MODEL = require("../../models/group.json");
const HASHTAG_MODULE = require("../../models/hashtag");
const { getAddressFromLatLong, getDimension } = require("../../models/post");

// module.exports.addPost = async function (args, context, req, res) {
//   return new Promise((resolve, reject) => {
//     utility.mongoConnect(req, res, function (CLIENT) {
//       let CONNECTION = CLIENT.db(utility.dbName);
//       let postCollection = CONNECTION.collection(Model.collection_name);

//       let newPostData = utility.filterBody(args.post);
//       if (newPostData === {}) {
//         reject({ error: "invalid data" }, false);
//       }
//       if (newPostData.share_post_id) {
//         newPostData.share_post_id = parseInt(newPostData.share_post_id);
//       }
//       newPostData.posted_by = context.user.user_id;
//       /* Remove bad words *
//   var Filter = require('bad-words-plus');
//   var filter = new Filter({ list: ['f0ck'] });
//   newPostData.post_text = filter.clean(newPostData.post_text);
//   /* *** */
//       const hashTags = utility.getHashTags(newPostData.post_text);
//       getAddressFromLatLong(newPostData.post_lat_long, (locationName) => {
//         console.log(locationName);
//         newPostData.post_location = locationName;
//         /* get video dimension */
//         getDimension(newPostData.post_video, "video", function (result) {
//           newPostData.dimension = result;
//           HASHTAG_MODULE.addUpdateHashtags(
//             CLIENT,
//             hashTags,
//             (err, hashtagsArr) => {
//               /* If not follower then follow */
//               if (hashtagsArr[0]) {
//                 if (
//                   hashtagsArr[0].followers.indexOf(context.user.user_id) == -1
//                 ) {
//                   HASHTAG_MODULE.followHashtagFromPost(
//                     CLIENT,
//                     hashtagsArr[0].hashtag_slug,
//                     context.user.user_id,
//                     function (err, result) {
//                       console.log(result);
//                     }
//                   );
//                 }
//               }
//               /* *********** */
//               if (!Array.isArray(hashtagsArr)) {
//                 hashtagsArr = [];
//               }
//               newPostData.hashtags = hashtagsArr.map((x) => x.hashtag_slug);
//               utility.validatePostData(
//                 CONNECTION,
//                 newPostData,
//                 Model,
//                 "insert",
//                 0,
//                 async function (err, validatedData) {
//                   if (err) {
//                     reject(err);
//                   } else {
//                     /* Add image to notification */
//                     var postImagePath = "";
//                     if (validatedData.post_type == "image") {
//                       if (validatedData.post_image) {
//                         if (validatedData.post_image[0]) {
//                           postImagePath = validatedData.post_image[0];
//                         }
//                       }
//                     } else if (validatedData.post_type == "video") {
//                       if (validatedData.thumbnail) {
//                         postImagePath = validatedData.thumbnail;
//                       }
//                     }
//                     if (postImagePath != "") {
//                       postImagePath =
//                         "https://cdn.staging.afrocamgist.com/" + postImagePath;
//                     }
//                     /* ========================= */
//                     if (Number(validatedData.share_post_id) > 0) {
//                       validatedData.post_type = "shared";
//                       const userCollection = CONNECTION.collection(
//                         USER_MODEL.collection_name
//                       );
//                       await userCollection
//                         .findOne({ user_id: context.user.user_id })
//                         .then((Details) => {
//                           let pushData = {
//                             status: "Share Post",
//                             title: "Share Post",
//                             body: `${Details.first_name} ${Details.last_name} shared your post`,
//                             image: postImagePath,
//                             sound: "default",
//                             mutable_content: true,
//                             content_available: true,
//                             data: {
//                               status: "Share Post",
//                               message: `${Details.first_name} ${Details.last_name} shared your post`,
//                               image: postImagePath,
//                               notification_type: "share_post",
//                               post_id: validatedData.post_id,
//                             },
//                           };
//                           postCollection
//                             .findOne({ post_id: validatedData.share_post_id })
//                             .then((postDetails) => {
//                               let notification_details = {
//                                 text_template:
//                                   "{{USER_ID_" +
//                                   validatedData.posted_by +
//                                   "}} shared your post",
//                                 post_id: validatedData.post_id,
//                               };
//                               let notification_type = "post_share";
//                               let notify_users = [postDetails.posted_by];
//                               userCollection
//                                 .findOne({ user_id: postDetails.posted_by })
//                                 .then((userDetails) => {
//                                   if (
//                                     userDetails.user_id !=
//                                     validatedData.posted_by
//                                   ) {
//                                     var userNameET = "";
//                                     var userNameEF = "";
//                                     if (userDetails.user_name) {
//                                       userNameET = userDetails.user_name;
//                                     }
//                                     if (Details.user_name) {
//                                       userNameEF = Details.user_name;
//                                     }
//                                     var sendEmailVar = true;
//                                     if (userDetails.isUnscribed) {
//                                       if (userDetails.isUnscribed == 1) {
//                                         sendEmailVar = false;
//                                       }
//                                     }
//                                     let email = {
//                                       sendEmail: sendEmailVar,
//                                       post_id: notification_details.post_id,
//                                       type: "postShare",
//                                       toUser: {
//                                         user_id: userDetails.user_id,
//                                         first_name: userDetails.first_name,
//                                         last_name: userDetails.last_name,
//                                         email: userDetails.email,
//                                         user_name: userNameET,
//                                       },
//                                       fromUser: {
//                                         user_id: Details.user_id,
//                                         first_name: Details.first_name,
//                                         last_name: Details.last_name,
//                                         email: Details.email,
//                                         user_name: userNameEF,
//                                       },
//                                     };
//                                     sendPush2(
//                                       userDetails.firebase_token,
//                                       "Follow Request",
//                                       pushData,
//                                       true,
//                                       email
//                                     );
//                                     // sendPush(
//                                     //   userDetails.firebase_token,
//                                     //   "Follow Request",
//                                     //   pushData,
//                                     //   true,
//                                     // );
//                                     /**/
//                                     NOTIFICATION.addNotification(
//                                       CLIENT,
//                                       req,
//                                       res,
//                                       notification_type,
//                                       notify_users,
//                                       notification_details,
//                                       function (err, notificationResp) {
//                                         postCollection.insertOne(
//                                           validatedData,
//                                           function (err, response) {
//                                             if (err) {
//                                               reject(err);
//                                             } else {
//                                               let finalResponse = {};
//                                               finalResponse.status = true;
//                                               resolve(finalResponse);
//                                             }
//                                           }
//                                         );
//                                       }
//                                     );
//                                     /**/
//                                   } else {
//                                     postCollection.insertOne(
//                                       validatedData,
//                                       function (err, response) {
//                                         if (err) {
//                                           reject(err);
//                                         } else {
//                                           let finalResponse = {};
//                                           finalResponse.status = true;
//                                           resolve(finalResponse);
//                                         }
//                                       }
//                                     );
//                                   }
//                                 })
//                                 .catch((err) => console.error(err));
//                             })
//                             .catch((err) => console.error(err));
//                         })
//                         .catch((err) => console.error(err));
//                     } else {
//                       if (validatedData.posted_for == "group") {
//                         /* Get group members */
//                         let groupCollection = CONNECTION.collection(
//                           GROUP_MODEL.collection_name
//                         );
//                         const userCollection = CONNECTION.collection(
//                           USER_MODEL.collection_name
//                         );
//                         groupCollection.findOne(
//                           { group_id: validatedData.group_id },
//                           function (err, response) {
//                             if (err) {
//                               reject(err);
//                             } else {
//                               console.log("=== GROUP ===");
//                               //add_group_post
//                               let notification_details = {
//                                 text_template:
//                                   "{{USER_ID_" +
//                                   validatedData.posted_by +
//                                   "}} posted on group",
//                                 post_id: validatedData.post_id,
//                               };
//                               let notification_type = "add_group_post";
//                               let notify_users = [];

//                               /* === */
//                               userCollection
//                                 .findOne({ user_id: validatedData.posted_by })
//                                 .then((senderDetails) => {
//                                   var userName =
//                                     senderDetails.first_name +
//                                     " " +
//                                     senderDetails.last_name;

//                                   let pushData = {
//                                     status: "Group Post",
//                                     title: "Group Post",
//                                     body: `${userName} posted on ${response.group_title}`,
//                                     image: postImagePath,
//                                     sound: "default",
//                                     mutable_content: true,
//                                     content_available: true,
//                                     data: {
//                                       status: "Group Post",
//                                       message: `${userName} posted on ${response.group_title}`,
//                                       image: postImagePath,
//                                       notification_type: "add_group_post",
//                                       post_id: validatedData.post_id,
//                                     },
//                                   };

//                                   response.group_members.forEach((member) => {
//                                     userCollection
//                                       .findOne({ user_id: member })
//                                       .then((userDetails) => {
//                                         console.log(
//                                           "userId = postedBy : " +
//                                             userDetails.user_id +
//                                             " = " +
//                                             validatedData.posted_by
//                                         );
//                                         if (
//                                           userDetails.user_id !=
//                                           validatedData.posted_by
//                                         ) {
//                                           console.log("Notification yes");
//                                           notify_users.push(
//                                             userDetails.user_id
//                                           );
//                                           var userNameET = "";
//                                           var userNameEF = "";
//                                           if (userDetails.user_name) {
//                                             userNameET = userDetails.user_name;
//                                           }
//                                           if (Details.user_name) {
//                                             userNameEF = Details.user_name;
//                                           }
//                                           var sendEmailVar = true;
//                                           if (userDetails.isUnscribed) {
//                                             if (userDetails.isUnscribed == 1) {
//                                               sendEmailVar = false;
//                                             }
//                                           }
//                                           let email = {
//                                             sendEmail: sendEmailVar,
//                                             post_id:
//                                               notification_details.post_id,
//                                             group_title: response.group_title,
//                                             type: "postOnGroup",
//                                             toUser: {
//                                               user_id: userDetails.user_id,
//                                               first_name:
//                                                 userDetails.first_name,
//                                               last_name: userDetails.last_name,
//                                               email: userDetails.email,
//                                               user_name: userNameET,
//                                             },
//                                             fromUser: {
//                                               user_id: Details.user_id,
//                                               first_name: Details.first_name,
//                                               last_name: Details.last_name,
//                                               email: Details.email,
//                                               user_name: userNameEF,
//                                             },
//                                           };
//                                           sendPush2(
//                                             userDetails.firebase_token,
//                                             "Follow Request",
//                                             pushData,
//                                             true,
//                                             email
//                                           );
//                                           // sendPush(
//                                           //   userDetails.firebase_token,
//                                           //   "Follow Request",
//                                           //   pushData,
//                                           //   true,
//                                           // );
//                                         } else {
//                                           console.log("Notification no");
//                                         }
//                                       })
//                                       .catch((err) => console.error(err));
//                                   });
//                                 })
//                                 .catch((err) => console.error(err));
//                               /* === */
//                               /**/
//                               NOTIFICATION.addNotification(
//                                 CLIENT,
//                                 req,
//                                 res,
//                                 notification_type,
//                                 notify_users,
//                                 notification_details,
//                                 function (err, notificationResp) {
//                                   console.log(err);
//                                   console.log(notificationResp);
//                                   postCollection.insertOne(
//                                     validatedData,
//                                     function (err, response) {
//                                       if (err) {
//                                         reject(err);
//                                       } else {
//                                         let finalResponse = {};
//                                         finalResponse.status = true;
//                                         resolve(finalResponse);
//                                       }
//                                     }
//                                   );
//                                 }
//                               );
//                               /**/
//                               console.log("=== GROUP ===");
//                             }
//                           }
//                         );
//                       } else {
//                         postCollection.insertOne(
//                           validatedData,
//                           async function (err, response) {
//                             if (err) {
//                               reject(err);
//                             } else {
//                               // let finalResponse = {};
//                               // finalResponse.status = true;
//                               // cb(null, finalResponse);
//                               /* */
//                               if (validatedData.tagged_id) {
//                                 let notification_details = {
//                                   text_template:
//                                     "{{USER_ID_" +
//                                     context.user.user_id +
//                                     "}} has Tagged in post",
//                                   tag_id: validatedData.tagged_id,
//                                 };
//                                 let notification_type = "user_tagged";
//                                 let notify_users = [validatedData.tagged_id];
//                                 const userCollection = CONNECTION.collection(
//                                   USER_MODEL.collection_name
//                                 );
//                                 await userCollection
//                                   .findOne({
//                                     user_id: context.user.user_id,
//                                   })
//                                   .then((Details) => {
//                                     let pushData = {
//                                       status: "Tagged By User",
//                                       title: "Tagged By User",
//                                       body: `${Details.first_name} ${Details.last_name} has Tagged you`,
//                                       image: postImagePath,
//                                       sound: "default",
//                                       mutable_content: true,
//                                       content_available: true,
//                                       data: {
//                                         status: "Tagged By User",
//                                         message: `${Details.first_name} ${Details.last_name} has Tagged you`,
//                                         image: postImagePath,
//                                         notification_type: notification_type,
//                                         tag_id: validatedData?.tag_id,
//                                       },
//                                     };
//                                     notify_users[0].forEach((user) => {
//                                       userCollection
//                                         .findOne({
//                                           $or: [
//                                             { user_id: user },
//                                             { user_name: user },
//                                           ],
//                                         })
//                                         .then((userDetails) => {
//                                           var userNameET = "";
//                                           var userNameEF = "";
//                                           if (userDetails.user_name) {
//                                             userNameET = userDetails.user_name;
//                                           }
//                                           if (Details.user_name) {
//                                             userNameEF = Details.user_name;
//                                           }
//                                           var sendEmailVar = true;
//                                           if (userDetails.isUnscribed) {
//                                             if (userDetails.isUnscribed == 1) {
//                                               sendEmailVar = false;
//                                             }
//                                           }
//                                           let email = {
//                                             sendEmail: sendEmailVar,
//                                             post_id: validatedData?.post_id,
//                                             type: "taggedByUser",
//                                             toUser: {
//                                               user_id: userDetails.user_id,
//                                               first_name:
//                                                 userDetails.first_name,
//                                               last_name: userDetails.last_name,
//                                               email: userDetails.email,
//                                               user_name: userNameET,
//                                             },
//                                             fromUser: {
//                                               user_id: Details.user_id,
//                                               first_name: Details.first_name,
//                                               last_name: Details.last_name,
//                                               email: Details.email,
//                                               user_name: userNameEF,
//                                             },
//                                           };
//                                           sendPush2(
//                                             userDetails.firebase_token,
//                                             "Tagged By User",
//                                             pushData,
//                                             true,
//                                             email
//                                           );
//                                           // sendPush(
//                                           //   userDetails.firebase_token,
//                                           //   "Tagged By User",
//                                           //   pushData,
//                                           //   true,
//                                           // );
//                                         })
//                                         .catch((err) => console.error(err));
//                                     });
//                                   })
//                                   .catch((err) => console.error(err));
//                                 NOTIFICATION.addNotification(
//                                   CLIENT,
//                                   req,
//                                   res,
//                                   notification_type,
//                                   notify_users,
//                                   notification_details,
//                                   async function (err, notificationResp) {
//                                     /* Get followers and send notification */
//                                     const userCollection =
//                                       CONNECTION.collection(
//                                         USER_MODEL.collection_name
//                                       );
//                                     let notification_type = "post_like";
//                                     await userCollection
//                                       .findOne({
//                                         user_id: context.user.user_id,
//                                       })
//                                       .then((Details) => {
//                                         var notify_users = Details.follower_ids;
//                                         let pushData = {
//                                           status: "Post created By User",
//                                           title: "Post created By User",
//                                           body: `${Details.first_name} ${Details.last_name} has created a new post`,
//                                           image: postImagePath,
//                                           sound: "default",
//                                           mutable_content: true,
//                                           content_available: true,
//                                           data: {
//                                             status: "Post created By User",
//                                             message: `${Details.first_name} ${Details.last_name} has created a new post`,
//                                             image: postImagePath,
//                                             notification_type:
//                                               notification_type,
//                                             post_id: validatedData.post_id,
//                                           },
//                                         };
//                                         console.log(pushData);
//                                         notify_users.forEach((user) => {
//                                           if (context.user.user_id != user) {
//                                             userCollection
//                                               .findOne({ user_id: user })
//                                               .then((userDetails) => {
//                                                 var userNameET = "";
//                                                 var userNameEF = "";
//                                                 if (userDetails.user_name) {
//                                                   userNameET =
//                                                     userDetails.user_name;
//                                                 }
//                                                 if (Details.user_name) {
//                                                   userNameEF =
//                                                     Details.user_name;
//                                                 }
//                                                 var sendEmailVar = true;
//                                                 if (userDetails.isUnscribed) {
//                                                   if (
//                                                     userDetails.isUnscribed == 1
//                                                   ) {
//                                                     sendEmailVar = false;
//                                                   }
//                                                 }
//                                                 let email = {
//                                                   sendEmail: sendEmailVar,
//                                                   post_id:
//                                                     validatedData.post_id,
//                                                   type: "postCreated",
//                                                   toUser: {
//                                                     user_id:
//                                                       userDetails.user_id,
//                                                     first_name:
//                                                       userDetails.first_name,
//                                                     last_name:
//                                                       userDetails.last_name,
//                                                     email: userDetails.email,
//                                                     user_name: userNameET,
//                                                   },
//                                                   fromUser: {
//                                                     user_id: Details.user_id,
//                                                     first_name:
//                                                       Details.first_name,
//                                                     last_name:
//                                                       Details.last_name,
//                                                     email: Details.email,
//                                                     user_name: userNameEF,
//                                                   },
//                                                 };
//                                                 sendPush2(
//                                                   userDetails.firebase_token,
//                                                   "Tagged By User",
//                                                   pushData,
//                                                   true,
//                                                   email
//                                                 );
//                                                 // sendPush(
//                                                 //   userDetails.firebase_token,
//                                                 //   "Tagged By User",
//                                                 //   pushData,
//                                                 //   true,
//                                                 // );
//                                               })
//                                               .catch((err) =>
//                                                 console.error(err)
//                                               );
//                                           }
//                                         });
//                                       })
//                                       .catch((err) => console.error(err));
//                                     /* *********************************** */
//                                     let finalResponse = {};
//                                     finalResponse.status = true;
//                                     resolve(null, finalResponse);
//                                   }
//                                 );
//                               } else {
//                                 /* Get followers and send notification */
//                                 const userCollection = CONNECTION.collection(
//                                   USER_MODEL.collection_name
//                                 );
//                                 let notification_type = "post_like";
//                                 await userCollection
//                                   .findOne({
//                                     user_id: context.user.user_id,
//                                   })
//                                   .then((Details) => {
//                                     var notify_users = Details.follower_ids;
//                                     let pushData = {
//                                       status: "Post created By User",
//                                       title: "Post created By User",
//                                       body: `${Details.first_name} ${Details.last_name} has created a new post`,
//                                       image: postImagePath,
//                                       sound: "default",
//                                       mutable_content: true,
//                                       content_available: true,
//                                       data: {
//                                         status: "Post created By User",
//                                         message: `${Details.first_name} ${Details.last_name} has created a new post`,
//                                         image: postImagePath,
//                                         notification_type: notification_type,
//                                         post_id: response?.insertedId,
//                                       },
//                                     };
//                                     console.log(pushData);
//                                     notify_users.forEach((user) => {
//                                       if (context.user.user_id != user) {
//                                         userCollection
//                                           .findOne({ user_id: user })
//                                           .then((userDetails) => {
//                                             var userNameET = "";
//                                             var userNameEF = "";
//                                             if (userDetails.user_name) {
//                                               userNameET =
//                                                 userDetails.user_name;
//                                             }
//                                             if (Details.user_name) {
//                                               userNameEF = Details.user_name;
//                                             }
//                                             var sendEmailVar = true;
//                                             if (userDetails.isUnscribed) {
//                                               if (
//                                                 userDetails.isUnscribed == 1
//                                               ) {
//                                                 sendEmailVar = false;
//                                               }
//                                             }
//                                             let email = {
//                                               sendEmail: sendEmailVar,
//                                               post_id: response?.insertedId,
//                                               type: "postCreated",
//                                               toUser: {
//                                                 user_id: userDetails.user_id,
//                                                 first_name:
//                                                   userDetails.first_name,
//                                                 last_name:
//                                                   userDetails.last_name,
//                                                 email: userDetails.email,
//                                                 user_name: userNameET,
//                                               },
//                                               fromUser: {
//                                                 user_id: Details.user_id,
//                                                 first_name: Details.first_name,
//                                                 last_name: Details.last_name,
//                                                 email: Details.email,
//                                                 user_name: userNameEF,
//                                               },
//                                             };
//                                             sendPush2(
//                                               userDetails.firebase_token,
//                                               "Tagged By User",
//                                               pushData,
//                                               true,
//                                               email
//                                             );
//                                             // sendPush(
//                                             //   userDetails.firebase_token,
//                                             //   "Tagged By User",
//                                             //   pushData,
//                                             //   true,
//                                             // );
//                                           })
//                                           .catch((err) => console.error(err));
//                                       }
//                                     });
//                                   })
//                                   .catch((err) => console.error(err));
//                                 /* *********************************** */
//                                 let finalResponse = {};
//                                 finalResponse.data = validatedData;
//                                 finalResponse.status = true;
//                                 resolve(finalResponse);
//                               }
//                               /* */
//                             }
//                           }
//                         );
//                       }
//                     }
//                   }
//                 }
//               );
//             }
//           );
//         });
//       });
//     });
//   });
// };
module.exports.addPost = async function (args, context, req, res) {
  return new Promise((resolve, reject) => {
    utility.mongoConnect(req, res, function (CLIENT) {
      let CONNECTION = CLIENT.db(utility.dbName);
      let postCollection = CONNECTION.collection(Model.collection_name);

      let newPostData = utility.filterBody(args.post);
      newPostData.posted_by = context.user.user_id;
      const hashTags = utility.getHashTags(newPostData.post_text);
      getAddressFromLatLong(newPostData.post_lat_long, (locationName) => {
        // console.log(locationName);
        newPostData.post_location = locationName;
        HASHTAG_MODULE.addUpdateHashtags(
          CLIENT,
          hashTags,
          (err, hashtagsArr) => {
            /* If not follower then follow */
            if (hashtagsArr[0]) {
              if (
                hashtagsArr[0].followers.indexOf(context.user.user_id) == -1
              ) {
                HASHTAG_MODULE.followHashtagFromPost(
                  CLIENT,
                  hashtagsArr[0].hashtag_slug,
                  context.user.user_id,
                  function (err, result) {
                    console.log(result);
                  }
                );
              }
            }
            /* *********** */
            if (!Array.isArray(hashtagsArr)) {
              hashtagsArr = [];
            }
            newPostData.hashtags = hashtagsArr.map((x) => x.hashtag_slug);
            utility.validatePostData(
              CONNECTION,
              newPostData,
              Model,
              "insert",
              0,
              async function (err, validatedData) {
                if (err) {
                  reject(err);
                } else {
                  /* Add image to notification */
                  var postImagePath = "";
                  if (validatedData.post_type == "image") {
                    if (validatedData.post_image) {
                      if (validatedData.post_image[0]) {
                        postImagePath = validatedData.post_image[0];
                      }
                    }
                  } else if (validatedData.post_type == "video") {
                    if (validatedData.thumbnail) {
                      postImagePath = validatedData.thumbnail;
                    }
                  }
                  if (postImagePath != "") {
                    postImagePath =
                      "https://cdn.afrocamgist.com/" + postImagePath;
                  }
                  /* ========================= */

                  if (Number(validatedData.share_post_id) > 0) {
                    validatedData.post_type = "shared";
                    const userCollection = CONNECTION.collection(
                      USER_MODEL.collection_name
                    );
                    await userCollection
                      .findOne({ user_id: context.user.user_id })
                      .then((Details) => {
                        let pushData = {
                          status: "Share Post",
                          title: "Share Post",
                          body: `${Details.first_name} ${Details.last_name} shared your post`,
                          image: postImagePath,
                          sound: "default",
                          mutable_content: true,
                          content_available: true,
                          data: {
                            status: "Share Post",
                            message: `${Details.first_name} ${Details.last_name} shared your post`,
                            image: postImagePath,
                            notification_type: "share_post",
                            post_id: validatedData.post_id,
                          },
                        };
                        postCollection
                          .findOne({ post_id: validatedData.share_post_id })
                          .then((postDetails) => {
                            let notification_details = {
                              text_template:
                                "{{USER_ID_" +
                                validatedData.posted_by +
                                "}} shared your post",
                              post_id: validatedData.post_id,
                            };
                            let notification_type = "post_share";
                            let notify_users = [postDetails.posted_by];
                            userCollection
                              .findOne({ user_id: postDetails.posted_by })
                              .then((userDetails) => {
                                if (
                                  userDetails.user_id != validatedData.posted_by
                                ) {
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
                                    type: "postShare",
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
                                    "Follow Request",
                                    pushData,
                                    true,
                                    email
                                  );
                                  // sendPush(
                                  //   userDetails.firebase_token,
                                  //   "Follow Request",
                                  //   pushData,
                                  //   true,
                                  // );
                                  /**/
                                  NOTIFICATION.addNotification(
                                    CLIENT,
                                    req,
                                    res,
                                    notification_type,
                                    notify_users,
                                    notification_details,
                                    function (err, notificationResp) {
                                      postCollection.insertOne(
                                        validatedData,
                                        function (err, response) {
                                          if (err) {
                                            reject(err);
                                          } else {
                                            let finalResponse = {};
                                            finalResponse.status = true;
                                            resolve(finalResponse);
                                          }
                                        }
                                      );
                                    }
                                  );
                                  /**/
                                } else {
                                  postCollection.insertOne(
                                    validatedData,
                                    function (err, response) {
                                      if (err) {
                                        reject(err);
                                      } else {
                                        let finalResponse = {};
                                        finalResponse.status = true;
                                        resolve(finalResponse);
                                        CLIENT.close();
                                      }
                                    }
                                  );
                                }
                              })
                              .catch((err) => console.error(err));
                          })
                          .catch((err) => console.error(err));
                      })
                      .catch((err) => console.error(err));
                  } else {
                    if (validatedData.posted_for == "group") {
                      /* Get group members */
                      let groupCollection = CONNECTION.collection(
                        GROUP_MODEL.collection_name
                      );
                      const userCollection = CONNECTION.collection(
                        USER_MODEL.collection_name
                      );
                      groupCollection.findOne(
                        { group_id: validatedData.group_id },
                        function (err, response) {
                          if (err) {
                            reject(err);
                          } else {
                            // console.log("=== GROUP ===");
                            //add_group_post
                            let notification_details = {
                              text_template:
                                "{{USER_ID_" +
                                validatedData.posted_by +
                                "}} posted on group",
                              post_id: validatedData.post_id,
                            };
                            let notification_type = "add_group_post";
                            let notify_users = [];

                            /* === */
                            userCollection
                              .findOne({ user_id: validatedData.posted_by })
                              .then((senderDetails) => {
                                var userName =
                                  senderDetails.first_name +
                                  " " +
                                  senderDetails.last_name;

                                let pushData = {
                                  status: "Group Post",
                                  title: "Group Post",
                                  body: `${userName} posted on ${response.group_title}`,
                                  image: postImagePath,
                                  sound: "default",
                                  mutable_content: true,
                                  content_available: true,
                                  data: {
                                    status: "Group Post",
                                    message: `${userName} posted on ${response.group_title}`,
                                    image: postImagePath,
                                    notification_type: "add_group_post",
                                    post_id: validatedData.post_id,
                                  },
                                };

                                response.group_members.forEach((member) => {
                                  userCollection
                                    .findOne({ user_id: member })
                                    .then((userDetails) => {
                                      // console.log("userId = postedBy : " + userDetails.user_id + " = " + validatedData.posted_by);
                                      if (
                                        userDetails.user_id !=
                                        validatedData.posted_by
                                      ) {
                                        // console.log("Notification yes");
                                        notify_users.push(userDetails.user_id);
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
                                          group_title: response.group_title,
                                          type: "postOnGroup",
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
                                          "Follow Request",
                                          pushData,
                                          true,
                                          email
                                        );
                                        // sendPush(
                                        //   userDetails.firebase_token,
                                        //   "Follow Request",
                                        //   pushData,
                                        //   true,
                                        // );
                                      } else {
                                        console.log("Notification no");
                                      }
                                    })
                                    .catch((err) => console.error(err));
                                });
                              })
                              .catch((err) => console.error(err));
                            /* === */

                            /**/
                            NOTIFICATION.addNotification(
                              CLIENT,
                              req,
                              res,
                              notification_type,
                              notify_users,
                              notification_details,
                              function (err, notificationResp) {
                                // console.log(err);
                                // console.log(notificationResp);
                                postCollection.insertOne(
                                  validatedData,
                                  function (err, response) {
                                    if (err) {
                                      reject(err);
                                    } else {
                                      let finalResponse = {};
                                      finalResponse.status = true;
                                      resolve(finalResponse);
                                    }
                                  }
                                );
                              }
                            );
                            /**/
                            // console.log("=== GROUP ===");
                          }
                        }
                      );
                    } else {
                      postCollection.insertOne(
                        validatedData,
                        async function (err, response) {
                          if (err) {
                            reject(err);
                          } else {
                            // let finalResponse = {};
                            // finalResponse.status = true;
                            // cb(null, finalResponse);
                            if (validatedData.tagged_id) {
                              let notification_details = {
                                text_template:
                                  "{{USER_ID_" +
                                  context.user.user_id +
                                  "}} has Tagged in post",
                                tag_id: validatedData.tagged_id,
                              };
                              let notification_type = "user_tagged";
                              let notify_users = [validatedData.tagged_id];
                              const userCollection = CONNECTION.collection(
                                USER_MODEL.collection_name
                              );
                              await userCollection
                                .findOne({ user_id: context.user.user_id })
                                .then((Details) => {
                                  let pushData = {
                                    status: "Tagged By User",
                                    title: "Tagged By User",
                                    body: `${Details.first_name} ${Details.last_name} has Tagged you`,
                                    image: postImagePath,
                                    sound: "default",
                                    mutable_content: true,
                                    content_available: true,
                                    data: {
                                      status: "Tagged By User",
                                      message: `${Details.first_name} ${Details.last_name} has Tagged you`,
                                      image: postImagePath,
                                      notification_type: notification_type,
                                      tag_id: validatedData.tag_id,
                                    },
                                  };
                                  notify_users[0].forEach((user) => {
                                    userCollection
                                      .findOne({
                                        $or: [
                                          { user_id: user },
                                          { user_name: user },
                                        ],
                                      })
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
                                          post_id: validatedData.post_id,
                                          type: "taggedByUser",
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
                                          "Tagged By User",
                                          pushData,
                                          true,
                                          email
                                        );
                                        // sendPush(
                                        //   userDetails.firebase_token,
                                        //   "Tagged By User",
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
                                async function (err, notificationResp) {
                                  /* Get followers and send notification */
                                  const userCollection = CONNECTION.collection(
                                    USER_MODEL.collection_name
                                  );
                                  let notification_type = "post_like";
                                  await userCollection
                                    .findOne({
                                      user_id: context.user.user_id,
                                    })
                                    .then((Details) => {
                                      var notify_users = Details.follower_ids;
                                      let pushData = {
                                        status: "Post created By User",
                                        title: "Post created By User",
                                        body: `${Details.first_name} ${Details.last_name} has created a new post`,
                                        image: postImagePath,
                                        sound: "default",
                                        mutable_content: true,
                                        content_available: true,
                                        data: {
                                          status: "Post created By User",
                                          message: `${Details.first_name} ${Details.last_name} has created a new post`,
                                          image: postImagePath,
                                          notification_type: notification_type,
                                          post_id: validatedData.post_id,
                                        },
                                      };
                                      // console.log(pushData);
                                      notify_users.forEach((user) => {
                                        if (context.user.user_id != user) {
                                          userCollection
                                            .findOne({ user_id: user })
                                            .then((userDetails) => {
                                              var userNameET = "";
                                              var userNameEF = "";
                                              if (userDetails.user_name) {
                                                userNameET =
                                                  userDetails.user_name;
                                              }
                                              if (Details.user_name) {
                                                userNameEF = Details.user_name;
                                              }
                                              var sendEmailVar = true;
                                              if (userDetails.isUnscribed) {
                                                if (
                                                  userDetails.isUnscribed == 1
                                                ) {
                                                  sendEmailVar = false;
                                                }
                                              }
                                              let email = {
                                                sendEmail: sendEmailVar,
                                                post_id: validatedData.post_id,
                                                type: "postCreated",
                                                toUser: {
                                                  user_id: userDetails.user_id,
                                                  first_name:
                                                    userDetails.first_name,
                                                  last_name:
                                                    userDetails.last_name,
                                                  email: userDetails.email,
                                                  user_name: userNameET,
                                                },
                                                fromUser: {
                                                  user_id: Details.user_id,
                                                  first_name:
                                                    Details.first_name,
                                                  last_name: Details.last_name,
                                                  email: Details.email,
                                                  user_name: userNameEF,
                                                },
                                              };
                                              sendPush2(
                                                userDetails.firebase_token,
                                                "Tagged By User",
                                                pushData,
                                                true,
                                                email
                                              );
                                              // sendPush(
                                              //   userDetails.firebase_token,
                                              //   "Tagged By User",
                                              //   pushData,
                                              //   true,
                                              // );
                                            })
                                            .catch((err) => console.error(err));
                                        }
                                      });
                                    })
                                    .catch((err) => console.error(err));
                                  /* *********************************** */
                                  let finalResponse = {};
                                  finalResponse.status = true;
                                  resolve(finalResponse);
                                }
                              );
                            } else {
                              // require("long-stack-traces")
                              /* Get followers and send notification */
                              const userCollection = CONNECTION.collection(
                                USER_MODEL.collection_name
                              );
                              let notification_type = "post_like";
                              userCollection
                                .findOne({ user_id: context.user.user_id })
                                .then((Details) => {
                                  var notify_users = Details.follower_ids;
                                  let pushData = {
                                    status: "Post created By User",
                                    title: "Post created By User",
                                    body: `${Details.first_name} ${Details.last_name} has created a new post`,
                                    image: postImagePath,
                                    sound: "default",
                                    mutable_content: true,
                                    content_available: true,
                                    data: {
                                      status: "Post created By User",
                                      message: `${Details.first_name} ${Details.last_name} has created a new post`,
                                      image: postImagePath,
                                      notification_type: notification_type,
                                      post_id: validatedData.post_id,
                                    },
                                  };
                                  // console.log(pushData);
                                  notify_users.forEach((user) => {
                                    if (context.user.user_id != user) {
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
                                            post_id: validatedData.post_id,
                                            type: "postCreated",
                                            toUser: {
                                              user_id: userDetails.user_id,
                                              first_name:
                                                userDetails.first_name,
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
                                            "Tagged By User",
                                            pushData,
                                            true,
                                            email
                                          );
                                          // sendPush(
                                          //   userDetails.firebase_token,
                                          //   "Tagged By User",
                                          //   pushData,
                                          //   true,
                                          // );
                                        })
                                        .catch((err) => {
                                          console.error(err);
                                        });
                                    }
                                  });
                                })
                                .catch((err) => {
                                  console.error(err);
                                });
                              /* *********************************** */

                              let finalResponse = {};
                              finalResponse.data = validatedData;
                              finalResponse.status = true;
                              resolve(finalResponse);
                            }
                          }
                        }
                      );
                    }
                  }
                }
              }
            );
          }
        );
      });
    });
  });
};
