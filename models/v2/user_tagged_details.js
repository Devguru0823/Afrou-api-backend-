'use strict';
let utility = require('../../utilities');
const userModel = require('./user.json');
const taggedUserModel = require('./user_tagged_details.json');
const { sendPush } = require('../../_helpers/push-notification');


const NOTIFICATION = require('./notification.js');
module.exports.getUserListForTag = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let userCollection = CONNECTION.collection(userModel.collection_name);
    const currentLoggedInUser = req.authorization.user_id;
    userCollection.findOne({ user_id: currentLoggedInUser }, (err, userDetails) => {
        const followingIdArray = userDetails.following_ids || [];
        const followerIdArray = userDetails.follower_ids || [];
        const concatedIds = followingIdArray.concat(followerIdArray);
        const uniqueIdSet = new Set(concatedIds);
        userCollection.aggregate([
            {
                $match: {
                    user_id: { $in: [...uniqueIdSet] }
                }
            },
            {
                $project: {
                    user_id: 1,
                    user_name: 1,
                    first_name: 1,
                    last_name: 1,
                    full_name: { $concat: ["$first_name", " ", "$last_name"] },
                }
            },
            {
                $match: {
                    full_name: new RegExp(req.query.search, 'i')
                }
            },
            {
                $sort: {
                    post_count: -1
                }
            }
        ]).toArray((err, userlist) => {
            if (!err) {
                const finalOutput = {
                    count: userlist.length,
                    data: userlist,
                };
                cb(null, finalOutput);
            } else {
                let error = new Error();
                error.name = 'NOT_FOUND_ERROR';
                cb(error);
            }
        });
    });
};

// module.exports.addTagggedUserInfo = function (CLIENT, req, res, cb) {
//     let CONNECTION = CLIENT.db(utility.dbName);
//     let userCollection = CONNECTION.collection(userModel.collection_name);
//     let taggedUserCollection = CONNECTION.collection(taggedUserModel.collection_name);
//     const currentLoggedInUser = req.authorization.user_id;
//     let taggedUserDetails = {
//         post_id: req.body.post_id,
//         from_id: currentLoggedInUser,
//         to_id: req.body.to_id,
//         description: req.body.description
//     }
//     utility.validatePostData(CONNECTION, taggedUserDetails, taggedUserModel, 'insert', 0, function (err, validatedData) {
//         if (err) {
//             cb(err);
//         } else {
//             taggedUserCollection.insertOne(validatedData, async function(err, response) {
//                 if (err) {
//                     cb(err);
//                 } else {
//                     let notification_details = {
//                         text_template: '{{USER_ID_' + currentLoggedInUser + '}} has Tagged in post',
//                         tag_id: response.ops[0].tag_id
//                     };
//                     let notification_type = 'user_tagged';
//                     let notify_users = req.body.to_id;
//                     await userCollection.findOne({ user_id: currentLoggedInUser })
//                     .then(Details => {
//                         let pushData = {
//                             status: "Tagged By User",
//                             title: "Tagged By User",
//                             body: `${Details.first_name} ${Details.last_name} has Tagged you`,
//                             sound: "default",
//                             mutable_content: true,
//                             content_available: true,
//                             data: {
//                                 status: "Tagged By User",
//                                 message: `${Details.first_name} ${Details.last_name} has Tagged you`,
//                                 notification_type: notification_type,
//                                 tag_id: response.ops[0].tag_id
//                             }
//                         };
//                         notify_users.forEach(user => {
//                             userCollection.findOne({ user_id: user })
//                                 .then(userDetails => {
//                                     sendPush(
//                                         userDetails.firebase_token,
//                                         "Tagged By User",
//                                         pushData,
//                                         true,
//                                     );
//                                 })
//                                 .catch((err) => console.error(err))
//                         })
//                     })
//                     .catch((err) => console.error(err))
//                 NOTIFICATION.addNotification(CLIENT, req, res, notification_type, notify_users, notification_details, function (err, notificationResp) {
//                     let finalResponse = {};
//                     finalResponse.status = true;
//                     cb(null, finalResponse);
//                 });
//                 }
//             });
//         }
//     });
// };
