'use strict';
const Model = require("./friend_request.json");
let utility = require("../utilities");
const USER_MODEL = require('./user.json');
const NOTIFICATION = require('./notification.js');
const EMAIL_HANDLER = require('../_helpers/email-handler');
const { sendPush, sendPush2 } = require('../_helpers/push-notification');


module.exports.getFollowRequests = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let friendRequestCollection = CONNECTION.collection(Model.collection_name);
    friendRequestCollection
        .aggregate([
            {
                $match: {
                    requested_to: req.authorization.user_id,
                    request_status: 'sent'
                }
            },
            {
                $sort: {
                    created_date: -1
                }
            },
            {
                $lookup: {
                    from: USER_MODEL.collection_name,
                    localField: 'requested_by',
                    foreignField: 'user_id',
                    as: 'userDetails'
                }
            },
            {
                $project: {
                    first_name: { $arrayElemAt: ["$userDetails.first_name", 0] },
                    last_name: { $arrayElemAt: ["$userDetails.last_name", 0] },
                    profile_image_url: { $arrayElemAt: ["$userDetails.profile_image_url", 0] },
                    following_ids: { $arrayElemAt: ["$userDetails.following_ids", 0] },
                    follower_ids: { $arrayElemAt: ["$userDetails.follower_ids", 0] },
                    user_id: { $arrayElemAt: ["$userDetails.user_id", 0] }
                }
            }
        ])
        .toArray((err, friendRequestList) => {
            if (err) {
                cb(err);
            } else {

                if (friendRequestList && friendRequestList.length > 0) {
                    friendRequestList.forEach(friend => {
                        const acceptButton = {
                            button_text: 'Accept',
                            button_link: '/profile/' + friend.user_id + '/confirm-follow',
                            button_type: 'success'
                        };
                        const rejectButton = {
                            button_text: 'Reject',
                            button_link: '/profile/' + friend.user_id + '/cancel-follow-request',
                            button_type: 'danger'
                        };

                        friend.request_buttons = [acceptButton, rejectButton];
                    });
                }

                let finalResponse = {};
                finalResponse.status = true;
                finalResponse.data = friendRequestList;
                cb(null, finalResponse);
            }
        });
};



const sendFollowRequest = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let followRequestCollection = CONNECTION.collection(Model.collection_name);
    let requested_by = req.authorization.user_id;
    let requested_to = Number(req.params.user_id);

    let newFollowRequestData = {};
    // Generate Follow Request Object
    newFollowRequestData.requested_by = requested_by;
    newFollowRequestData.requested_to = requested_to;

    let userCollection = CONNECTION.collection(USER_MODEL.collection_name);
    userCollection.countDocuments({ user_id: requested_by, following_ids: requested_to }, async function (err, count) {
        if (count > 0) {
            let error = new Error('You are already Following this user');
            cb(error);
        } else {
            let followRequest = await followRequestCollection.findOne({ $and: [{ requested_by: requested_by }, { requested_to: requested_to }] })
            utility.validatePostData(CONNECTION, newFollowRequestData, Model, 'insert', 0, function (err, validatedData) {
                // console.log("followRequest=>>>>", followRequest)
                if (followRequest != null) {
                    let error = new Error('You have already sent Follow Request');
                    cb(error);
                } else {
                    followRequestCollection.insertOne(validatedData, function (err, response) {
                        if (err) {
                            if (err.code === 11000) {
                                let error = new Error('You have already sent Follow Request');
                                cb(error);
                            } else {
                                cb(err);
                            }
                        } else {
                            // Get Two User Details
                            userCollection.find({ user_id: { $in: [requested_by, requested_to] } }).toArray(async (err, usersData) => {
                                // Send Email
                                let fromUser = null;
                                let toUser = null;
                                usersData.forEach(user => {
                                    if (user.user_id === requested_by) {
                                        fromUser = user;
                                    }
                                    if (user.user_id === requested_to) {
                                        toUser = user;
                                    }
                                });
                                EMAIL_HANDLER.sendFollowRequestEmail(fromUser, toUser);

                                // Success, Now Send Notification
                                let notification_details = {
                                    text_template: '{{USER_ID_' + requested_by + '}} has sent you a follow request',
                                    user_id: requested_by
                                };
                                let notification_type = 'send_follow_request';
                                let notify_users = [requested_to];
                                await userCollection.findOne({ user_id: requested_by })
                                    .then(Details => {
                                        let pushData = {
                                            status: "Follow Request",
                                            title: "New follow request",
                                            body: `${Details.first_name} ${Details.last_name} has sent you a follow request`,
                                            sound: "default",
                                            mutable_content: true,
                                            content_available: true,
                                            data: {
                                                status: "Follow Request",
                                                message: `${Details.first_name} ${Details.last_name} has sent you a follow request`,
                                                notification_type: notification_type,
                                                user_id: notification_details.user_id
                                            }
                                        };
                                        notify_users.forEach(user => {
                                            userCollection.findOne({ user_id: user })
                                                .then(userDetails => {
                                                    sendPush(
                                                        userDetails.firebase_token,
                                                        "Follow Request",
                                                        pushData,
                                                        true,
                                                    );
                                                })
                                                .catch((err) => console.error(err))
                                        })
                                    })
                                    .catch((err) => console.error(err))
                                NOTIFICATION.addNotification(CLIENT, req, res, notification_type, notify_users, notification_details, function (err, notificationResp) {
                                    let finalResponse = {};
                                    finalResponse.status = true;
                                    cb(null, finalResponse);
                                });
                            });
                        }
                    });
                }
            });
        }
    });
};


/**
 * ACCEPT FRIEND REQUEST
 * @param CLIENT
 * @param req
 * @param res
 * @param cb
 */

module.exports.acceptFollowRequest = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let followRequestCollection = CONNECTION.collection(Model.collection_name);
    let userCollection = CONNECTION.collection(USER_MODEL.collection_name);

    let requested_by = Number(req.params.user_id);
    let requested_to = req.authorization.user_id;

    followRequestCollection.findOneAndDelete({ requested_to: requested_to, requested_by: requested_by }, (err, deletedRequest) => {
        if (deletedRequest.value) {
            userCollection.findOneAndUpdate({ user_id: requested_to }, { $addToSet: { follower_ids: requested_by } }, { returnOriginal: false }, function (err, myProfileDetails) {
                if (err) {
                    cb(err);
                } else {
                    userCollection.findOneAndUpdate({ user_id: requested_by }, { $addToSet: { following_ids: requested_to } }, { returnOriginal: false }, async function (err, updated) {
                        if (err) {
                            cb(err);
                        } else {

                            let notification_details = {
                                text_template: '{{USER_ID_' + requested_to + '}} has accepted your follow request',
                                user_id: requested_to
                            };
                            let notification_type = 'accept_follow_request';
                            let notify_users = [requested_by];
                            await userCollection.findOne({ user_id: requested_to })
                                .then(Details => {
                                    let pushData = {
                                        status: "Accept Follow Request",
                                        title: "Accepted Follow Request",
                                        body: `${Details.first_name} ${Details.last_name} has accepted your follow request`,
                                        sound: "default",
                                        mutable_content: true,
                                        content_available: true,
                                        data: {
                                            status: "Accept Follow Request",
                                            message: `${Details.first_name} ${Details.last_name} has accepted your follow request`,
                                            notification_type: notification_type,
                                            user_id: notification_details.user_id
                                        }
                                    };
                                    notify_users.forEach(user => {
                                        userCollection.findOne({ user_id: user })
                                            .then(userDetails => {
                                                var userNameET = "";
                                                var userNameEF = "";
                                                if(userDetails.user_name) {
                                                    userNameET = userDetails.user_name;
                                                }
                                                if(Details.user_name) {
                                                    userNameEF = Details.user_name;
                                                }
                                                let email = {
                                                    sendEmail: true,
                                                    type: "acceptFollowRequest",
                                                    toUser: {
                                                        user_id: userDetails.user_id,
                                                        first_name: userDetails.first_name,
                                                        last_name: userDetails.last_name,
                                                        email: userDetails.email,
                                                        user_name: userNameET
                                                    },
                                                    fromUser: {
                                                        user_id: Details.user_id,
                                                        first_name: Details.first_name,
                                                        last_name: Details.last_name,
                                                        email: Details.email,
                                                        user_name: userNameEF
                                                    }
                                                };
                                                sendPush2(
                                                    userDetails.firebase_token,
                                                    "Accept Follow Request",
                                                    pushData,
                                                    true,
                                                    email
                                                );
                                                // sendPush(
                                                //     userDetails.firebase_token,
                                                //     "Accept Follow Request",
                                                //     pushData,
                                                //     true,
                                                // );
                                            })
                                            .catch((err) => console.error(err))
                                    })
                                })
                                .catch((err) => console.error(err))
                            NOTIFICATION.addNotification(CLIENT, req, res, notification_type, notify_users, notification_details, function (err, notificationResp) {
                                let finalResponse = {};
                                finalResponse.status = true;
                                if (myProfileDetails.value) {
                                    finalResponse.data = {
                                        friend_ids: myProfileDetails.value.friend_ids,
                                        following_ids: myProfileDetails.value.following_ids,
                                        follower_ids: myProfileDetails.value.follower_ids
                                    };
                                }
                                cb(null, finalResponse);
                            });
                        }
                    });
                }
            });
        }
    });
};


/**
 * DELETE FRIEND REQUEST
 * @param CLIENT
 * @param req
 * @param res
 * @param cb
 */

module.exports.deleteFollowRequest = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let friendRequestCollection = CONNECTION.collection(Model.collection_name);

    let requested_by = Number(req.params.user_id);
    let requested_to = req.authorization.user_id;

    friendRequestCollection
        .deleteOne({
            request_status: 'sent',
            requested_by: requested_by,
            requested_to: requested_to
        }, function (err, friendRequestData) {
            if (err) {
                cb(err);
            } else {
                /* Cancel by sender */
                friendRequestCollection
                .deleteOne({
                    request_status: 'sent',
                    requested_by: requested_to,
                    requested_to: requested_by
                }, function (err, friendRequestData) {
                    if (err) {
                        cb(err);
                    } else {
                        let finalResponse = {};
                        finalResponse.status = true;
                        cb(null, finalResponse);
                    }
                });
                /********/
                // let finalResponse = {};
                // finalResponse.status = true;
                // cb(null, finalResponse);
            }

        });
    /* Cancel by sender *
    friendRequestCollection
        .deleteOne({
            request_status: 'sent',
            requested_by: requested_to,
            requested_to: requested_by
        }, function (err, friendRequestData) {
            if (err) {
                cb(err);
            } else {
                let finalResponse = {};
                finalResponse.status = true;
                cb(null, finalResponse);
            }

        });
    /********/
};




/**
 * DELETE FRIEND
 * @param CLIENT
 * @param req
 * @param res
 * @param cb
 */

module.exports.deleteFriend = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let userCollection = CONNECTION.collection(USER_MODEL.collection_name);

    let currentUserId = req.authorization.user_id;
    const friend_id = Number(req.params.user_id);

    userCollection.findOneAndUpdate({ user_id: currentUserId, friend_ids: friend_id }, { $pull: { friend_ids: friend_id } }, { returnOriginal: false }, function (err, myProfileDetails) {
        if (err) {
            cb(err);
        } else {
            let finalResponse = {};
            finalResponse.status = true;
            if (myProfileDetails.value) {
                finalResponse.data = {
                    friend_ids: myProfileDetails.value.friend_ids,
                    following_ids: myProfileDetails.value.following_ids,
                    follower_ids: myProfileDetails.value.follower_ids

                };
            }
            cb(null, finalResponse);
        }
    });
};



module.exports.unFollowUser = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let userCollection = CONNECTION.collection(USER_MODEL.collection_name);

    let currentUserId = req.authorization.user_id;
    const friend_id = Number(req.params.user_id);

    userCollection.findOneAndUpdate({ user_id: currentUserId }, { $pull: { following_ids: friend_id, friend_ids: friend_id } }, { returnOriginal: false }, function (err, myProfileDetails) {
        if (err) {
            cb(err);
        } else {
            userCollection.findOneAndUpdate({ user_id: friend_id }, { $pull: { follower_ids: currentUserId } }, function (err, updated) {
                if (err) {
                    cb(err);
                } else {
                    let finalResponse = {};
                    finalResponse.status = true;
                    if (myProfileDetails.value) {
                        finalResponse.data = {
                            friend_ids: myProfileDetails.value.friend_ids,
                            following_ids: myProfileDetails.value.following_ids,
                            follower_ids: myProfileDetails.value.follower_ids

                        };
                    }
                    cb(null, finalResponse);
                }
            });
        }
    });
};


module.exports.followUser = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let userCollection = CONNECTION.collection(USER_MODEL.collection_name);

    let currentUserId = req.authorization.user_id;
    const friend_id = Number(req.params.user_id);
    userCollection.findOne({ user_id: friend_id }, (err, followUserDetails) => {
        // console.log(followUserDetails)
        if (err) {
            cb(err);
            return;
        }
        if (followUserDetails.private === true) {
            // Send Follow Request
            sendFollowRequest(CLIENT, req, res, cb);
        } else {
            // Directly Follow
            userCollection.findOneAndUpdate({ user_id: currentUserId, following_ids: { $ne: friend_id } }, { $push: { following_ids: friend_id } }, { returnOriginal: false }, function (err, myProfileDetails) {
                if (err) {
                    cb(err);
                } else {
                    userCollection.findOneAndUpdate({ user_id: friend_id, follower_ids: { $ne: currentUserId } }, { $push: { follower_ids: currentUserId } }, { returnOriginal: false }, function (err, updated) {
                        if (err) {
                            cb(err);
                        } else {

                            userCollection.find({ user_id: { $in: [currentUserId, friend_id] } }).toArray(async (err, usersData) => {
                                // Send Email
                                let fromUser = null;
                                let toUser = null;
                                usersData.forEach(user => {
                                    if (user.user_id === currentUserId) {
                                        fromUser = user;
                                    }
                                    if (user.user_id === friend_id) {
                                        toUser = user;
                                    }
                                });

                                // Success, Now Send Notification
                                let notification_details = {
                                    text_template: '{{USER_ID_' + currentUserId + '}} has started following you',
                                    user_id: currentUserId
                                };
                                let notification_type = 'follow_user';
                                let notify_users = [friend_id];
                                await userCollection.findOne({ user_id: currentUserId })
                                    .then(Details => {
                                        var userName = Details.first_name + ' ' + Details.last_name;
                                        if(Details.user_name && Details.user_name!="") {
                                            userName = Details.user_name;
                                        }
                                        let pushData = {
                                            status: "Follow",
                                            title: "New Follower",
                                            body: `${userName} has started following you`,
                                            sound: "default",
                                            mutable_content: true,
                                            content_available: true,
                                            data: {
                                                status: "Follow",
                                                message: `${Details.first_name} ${Details.last_name} has started following you`,
                                                notification_type: notification_type,
                                                user_id: notification_details.user_id
                                            }
                                        };
                                        notify_users.forEach(user => {
                                            userCollection.findOne({ user_id: user })
                                                .then(userDetails => {

                                                    if(userDetails) {
                                                        var userNameET = "";
                                                        var userNameEF = "";
                                                        if(userDetails.user_name) {
                                                            userNameET = userDetails.user_name;
                                                        }
                                                        if(Details.user_name) {
                                                            userNameEF = Details.user_name;
                                                        }
                                                        var userName2 = Details.first_name + ' ' + Details.last_name;
                                                        if(Details.user_name && Details.user_name!="") {
                                                            userName2 = Details.user_name;
                                                        }
                                                        var emailMessage = `${userName2} has started following you`;
                                                        let email = {
                                                            sendEmail: true,
                                                            message: emailMessage,
                                                            type: "follow",
                                                            toUser: {
                                                                user_id: userDetails.user_id,
                                                                first_name: userDetails.first_name,
                                                                last_name: userDetails.last_name,
                                                                email: userDetails.email,
                                                                user_name: userNameET
                                                            },
                                                            fromUser: {
                                                                user_id: Details.user_id,
                                                                first_name: Details.first_name,
                                                                last_name: Details.last_name,
                                                                email: Details.email,
                                                                user_name: userNameEF
                                                            }
                                                        };
                                                        sendPush2(
                                                            userDetails.firebase_token,
                                                            "Follow",
                                                            pushData,
                                                            true,
                                                            email
                                                        );
                                                        // sendPush(
                                                        //     userDetails.firebase_token,
                                                        //     "Follow",
                                                        //     pushData,
                                                        //     true,
                                                        // );
                                                    }
                                                })
                                                .catch((err) => console.error(err))
                                        })
                                    })
                                    .catch((err) => console.error(err))
                                NOTIFICATION.addNotification(CLIENT, req, res, notification_type, notify_users, notification_details, function (err, notificationResp) {
                                    let finalResponse = {};
                                    finalResponse.status = true;
                                    if (myProfileDetails.value) {
                                        finalResponse.data = {
                                            friend_ids: myProfileDetails.value.friend_ids,
                                            following_ids: myProfileDetails.value.following_ids,
                                            follower_ids: myProfileDetails.value.follower_ids

                                        };
                                    }
                                    cb(null, finalResponse);
                                });
                            });
                        }
                    });
                }
            });
        }

    });
};




/**
 * Add as ROLE MODEL
 * @param CLIENT
 * @param req
 * @param res
 * @param cb
 */

module.exports.addRoleModel = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let userCollection = CONNECTION.collection(USER_MODEL.collection_name);
    let requested_to = Number(req.params.user_id);
    let requested_by = req.authorization.user_id;

    userCollection.findOneAndUpdate({ user_id: requested_by, following_ids: requested_to }, { $addToSet: { friend_ids: requested_to } }, { returnOriginal: false }, function (err1, myProfileDetails) {
        let finalResponse = {};
        finalResponse.status = true;
        if (myProfileDetails.value) {
            finalResponse.data = {
                friend_ids: myProfileDetails.value.friend_ids
            };
        }
        cb(null, finalResponse);
    });
};


module.exports.blockUser = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let userCollection = CONNECTION.collection(USER_MODEL.collection_name);
    const user_id = Number(req.params.user_id);

    userCollection.findOneAndUpdate({ user_id: req.authorization.user_id }, { $addToSet: { blocked_ids: user_id } }, { returnOriginal: false }, function (err1, myProfileDetails) {
        cb(err1, myProfileDetails);
    });
};



module.exports.unblockUser = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let userCollection = CONNECTION.collection(USER_MODEL.collection_name);
    const user_id = Number(req.params.user_id);

    userCollection.findOneAndUpdate({ user_id: req.authorization.user_id }, { $pull: { blocked_ids: user_id } }, { returnOriginal: false }, function (err1, myProfileDetails) {
        cb(err1, myProfileDetails);
    });
};
