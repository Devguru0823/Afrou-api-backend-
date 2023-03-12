'use strict';
const Model = require('./user.json');
const FRIEND_REQUEST_MODEL = require("./friend_request.json");
let utilities = require('../../utilitie');
const bcrypt = require('bcryptjs');

const NOTIFICATION = require('./notification.js');
const EMAIL_HANDLER = require('../../_helpers/email-handler');
const { sendPush } = require('../../_helpers/push-notification');

module.exports.registerUser = function(req, res, cb) {
    if(req.body.users) {
        var typeAcc = "autobot";
        if(req.body.type && req.body.type!="") {
            typeAcc = "autobot-celebrity";
        }
        JSON.parse(req.body.users).forEach((user, index) => {
            var tempUser = user;
            var finalUser = {};
            finalUser.body = tempUser;
            finalUser.body.password = "Hello@123";
            finalUser.body.registerFrom = typeAcc;
            utilities.MysqlConnect(req, res, function (client) {
                UserRegisterFunction(client, finalUser, res, function (err, response) {
                    client.close();
                });
            });
        });
    }
    cb(null, "true");
};

function UserRegisterFunction(CLIENT, req, res, cb) {

    /* Remove blank space from left and right of string */
    req.body.first_name = req.body.first_name.trim();
    req.body.last_name = req.body.last_name.trim();
    req.body.username = req.body.username.trim();
    let newUserData = req.body;

    if (!newUserData.user_name) {
        newUserData.user_name = "";
    } else {
        let unique_user_name = {}
        unique_user_name.user_name = newUserData.user_name;
        unique_user_name.status = 'active';
        CLIENT.query(`SELECT * FROM user WHERE user_name =? AND status =?`, unique_user_name, function(err, user){
            if (err) {
                cb(err);
            } else {
                if(user) {
                    let error = new Error("User with this username already exists");
                    error.name = "VALIDATION_ERROR";
                    cb(error);
                    return;
                }
            }
        });
    }
    if (!newUserData.username) {
        let error = new Error("Email / Phone Can not be Empty");
        error.name = "VALIDATION_ERROR";
        cb(error);
        return;
    }
    /*** EMAIL/ Mobile***/
    let loginString = newUserData.username;
    const isEmail = loginString.includes("@");
    if (isEmail) {
        let emailRe = /\S+@\S+\.\S+/;
        if (!emailRe.test(loginString)) {
            let error = new Error("Invalid Email Id");
            error.name = "VALIDATION_ERROR";
            cb(error);
            return;
        }
        newUserData.email = loginString.toLowerCase();
        newUserData.contact_number = '';
        newUserData.registered_with = 'email';
    } else {
        // Mobile Number
        loginString = loginString.replace("+", "");
        let phoneRe = /^\s*(?:\+?(\d{1,3}))?[- (]*(\d{3})[- )]*(\d{3})[- ]*(\d{4})(?: *[x/#]{1}(\d+))?\s*$/;
        if (!phoneRe.test(loginString)) {
            let error = new Error("Invalid Phone Number");
            error.name = "VALIDATION_ERROR";
            cb(error);
            return;
        }
        newUserData.contact_number = loginString;
        newUserData.email = '';
        newUserData.registered_with = 'contact_number';
    }

    delete newUserData.username;

    utilities.validatePostData(CONNECTION, newUserData, Model, 'insert', 0, function (err, validatedData) {
        if (err) {
            cb(err);
        } else {
            // Encrypt Password in bCrypt
            var salt = bcrypt.genSaltSync(10);
            validatedData.password = bcrypt.hashSync(validatedData.password, salt);
            validatedData.email_verified = false;
            validatedData.verification_token = null;
            validatedData.verification_otp = null;
            validatedData.phone_verified = false;
            validatedData.introduced = false;
            if(newUserData.registered_with == 'email') {
                validatedData.email_verified = true;
            } else {
                validatedData.phone_verified = true;
            }
            if (newUserData.firebase_token) { validatedData.firebase_token = newUserData.firebase_token; }
            let condition = {}
            if (newUserData.email) {
                condition.email = newUserData.email;
            }
            else if (newUserData.contact_number) {
                condition.contact_number = newUserData.contact_number;
            }
            CLIENT.query(`SELECT * FROM user WHERE email =? AND contact_number =?`, condition, function (err, user) {
                if (err) {
                    cb(err);
                }
                else if (user && user.status === 'active') {
                    cb('User Already Exists');
                }
                else {
                    condition.status = 'inactive';
                    validatedData.status = 'active';
                    userCollection.deleteOne(condition
                        , function (err, inactiveUser) {
                            if (err) {
                                cb(err);
                            }
                            userCollection.insertOne(validatedData, function (err, response) {
                                if (err) {
                                    cb(err);
                                } else {

                                    let finalResponse = {};
                                    finalResponse.status = true;
                                    finalResponse.registered_with = validatedData?.registered_with;
                                    cb(null, finalResponse);
                                }
                            });
                        });
                }                
            })
        }
    });
}

module.exports.usertofollow = function(req, res, cb) {
    utilities.MysqlConnect(req, res, function (CLIENT) {
        CLIENT.query(`SELECT * FROM ${Model.collection_name} WHERE registerFrom = 'autobot' AND status = 'active' ORDER BY RAND() LIMIT 1`, function(err, autoRegUser){
            if (err) {
                cb(err);
            } else {
                var currentUserProfile = autoRegUser[0];
                CLIENT.query(`SELECT user_id, first_name, last_name, status, last_active, firebase_token, private WHERE last_active >= ${new Date(Date.now() - 30*24*60*60*1000)} AND status = 'active' AND user_id != ${currentUserProfile.user_id} ORDER BY RAND() LIMIT 1`, function(err, userList){
                    if (err) {
                        cb(err);
                    } else {
                        var otherUserProfile = userList[0];
                        // Check for friend
                        let isMyFriend = utilities.checkFriend(otherUserProfile.user_id, currentUserProfile);
                        let isFollowing = false;
                        if (currentUserProfile.following_ids && currentUserProfile.following_ids.indexOf(otherUserProfile.user_id) !== -1) {
                            isFollowing = true;
                        }
                        let isOFollowing = false;
                        if (otherUserProfile.following_ids && otherUserProfile.following_ids.indexOf(currentUserProfile.user_id) !== -1) {
                            isOFollowing = true;
                        }

                        if(!isMyFriend && !isFollowing && !isOFollowing) {
                            if (otherUserProfile.private === true) {
                                // Send Follow Request
                                sendFollowRequest(CLIENT, req, res, currentUserProfile.user_id, otherUserProfile.user_id, cb);
                            } else {
                                // Directly Follow
                                var currentUserId = currentUserProfile.user_id;
                                var friend_id = otherUserProfile.user_id;
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
                                                            let pushData = {
                                                                status: "Follow",
                                                                title: "New Follower",
                                                                body: `${Details.first_name} ${Details.last_name} has started following you`,
                                                                sound: "default",
                                                                mutable_content: true,
                                                                content_available: true,
                                                                data: {
                                                                    status: "Follow",
                                                                    message: `${Details.first_name} ${Details.last_name} has started following you`,
                                                                    notification_type:notification_type,
                                                                    user_id:notification_details.user_id
                                                                }
                                                            };
                                                            notify_users.forEach(user => {
                                                                userCollection.findOne({ user_id: user })
                                                                    .then(userDetails => {
                                                                        sendPush(
                                                                            userDetails.firebase_token,
                                                                            "Follow",
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
                        } else {
                            cb(null, {"status": true, "data":[{"result":"already sent"}]});
                        }

                    }
                });
            }
        });

    });
};

module.exports.celebrityusertofollow = function(req, res, cb) {
    utilities.mongoConnect(req, res, function (CLIENT) {
        let CONNECTION = CLIENT.db(utilities.dbName);
        let userCollection = CONNECTION.collection(Model.collection_name);

        /**
         * Get an auto register user in random order
         */
        userCollection.aggregate(
            [
                { $match: { "registerFrom" : "autobot-celebrity", "status": "active" } },
                { $sample: { size: 1 } } 
            ]
        ).toArray(async (err, autoRegUserCeleb) => {
            if (err) {
                cb(err);
            } else {
                console.log("Auto User");
                console.log(autoRegUserCeleb[0].user_id);
                var currentUserProfile = autoRegUserCeleb[0];
                
                /**
                 * Get autoregister user in random order but not following celebrity user
                 */
                 userCollection.aggregate(
                    [
                        { $match: { "registerFrom" : "autobot", "status": "active", "following_ids": { $nin: [currentUserProfile.user_id] } } },
                        { $sample: { size: 1 } } 
                    ]
                ).toArray(async (err, autoRegUser) => {
                    if (err) {
                        cb(err);
                    } else {
                        if(autoRegUser[0]) {
                            console.log("Auto User");
                            console.log(autoRegUser[0].user_id);
                            var currentUserProfile1 = autoRegUser[0];
                            if (currentUserProfile.private === true) {
                                // Send Follow Request
                                sendFollowRequest(CLIENT, req, res, currentUserProfile1.user_id, currentUserProfile.user_id, cb);
                            } else {
                                // Directly Follow
                                var currentUserId = currentUserProfile1.user_id;
                                var friend_id = currentUserProfile.user_id;
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
                                                            let pushData = {
                                                                status: "Follow",
                                                                title: "New Follower",
                                                                body: `${Details.first_name} ${Details.last_name} has started following you`,
                                                                sound: "default",
                                                                mutable_content: true,
                                                                content_available: true,
                                                                data: {
                                                                    status: "Follow",
                                                                    message: `${Details.first_name} ${Details.last_name} has started following you`,
                                                                    notification_type:notification_type,
                                                                    user_id:notification_details.user_id
                                                                }
                                                            };
                                                            notify_users.forEach(user => {
                                                                userCollection.findOne({ user_id: user })
                                                                    .then(userDetails => {
                                                                        sendPush(
                                                                            userDetails.firebase_token,
                                                                            "Follow",
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
                                                        if (myProfileDetails.value) {
                                                            finalResponse.data = {
                                                                friend_ids: myProfileDetails.value.friend_ids,
                                                                following_ids: myProfileDetails.value.following_ids,
                                                                follower_ids: myProfileDetails.value.follower_ids

                                                            };
                                                        }
                                                        console.log(finalResponse);
                                                        cb(null, finalResponse);
                                                    });
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        } else {
                            console.log("NO");
                            userCollection.aggregate(
                                [
                                    { $project : { "user_id" : 1, "first_name":1, "last_name":1, "status":1, "last_active" : 1, "firebase_token": 1, "private": 1, "following_ids": 1 } },
                                    { $match: { "last_active":{$lt:new Date(Date.now() - 60*24*60*60*1000)}, "status": "active", "user_id":{ $ne: currentUserProfile.user_id }, "following_ids": { $nin: [currentUserProfile.user_id] } } }
                                ]
                            ).toArray(async (err, autoRegUser) => {
                                if (err) {
                                    cb(err);
                                } else {
                                    if(autoRegUser[0]) {
                                        console.log("User");
                                        console.log(autoRegUser[0].user_id);
                                        var currentUserProfile1 = autoRegUser[0];
                                        if (currentUserProfile.private === true) {
                                            // Send Follow Request
                                            sendFollowRequest(CLIENT, req, res, currentUserProfile1.user_id, currentUserProfile.user_id, cb);
                                        } else {
                                            // Directly Follow
                                            var currentUserId = currentUserProfile1.user_id;
                                            var friend_id = currentUserProfile.user_id;
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
                                                                        let pushData = {
                                                                            status: "Follow",
                                                                            title: "New Follower",
                                                                            body: `${Details.first_name} ${Details.last_name} has started following you`,
                                                                            sound: "default",
                                                                            mutable_content: true,
                                                                            content_available: true,
                                                                            data: {
                                                                                status: "Follow",
                                                                                message: `${Details.first_name} ${Details.last_name} has started following you`,
                                                                                notification_type:notification_type,
                                                                                user_id:notification_details.user_id
                                                                            }
                                                                        };
                                                                        notify_users.forEach(user => {
                                                                            userCollection.findOne({ user_id: user })
                                                                                .then(userDetails => {
                                                                                    sendPush(
                                                                                        userDetails.firebase_token,
                                                                                        "Follow",
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
                                                                    if (myProfileDetails.value) {
                                                                        finalResponse.data = {
                                                                            friend_ids: myProfileDetails.value.friend_ids,
                                                                            following_ids: myProfileDetails.value.following_ids,
                                                                            follower_ids: myProfileDetails.value.follower_ids
            
                                                                        };
                                                                    }
                                                                    console.log(finalResponse);
                                                                    cb(null, finalResponse);
                                                                });
                                                            });
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    } else {
                                        cb(null, {"status": true});
                                    }
                                }
                            });
                        }
                    }
                });
            }
        });

    });
};

function getUserToFollow(curUser, userCollection, cb) {
    var result = {};
    result.continueLoop = true;
    console.log("curUser");
    // console.log(curUser);
    userCollection.aggregate(
        [
            { $project : { "user_id" : 1, "first_name":1, "last_name":1, "status":1, "last_active" : 1, "firebase_token": 1 } },
            { $match: { "last_active":{$lt:new Date(Date.now() - 30*24*60*60 * 1000)}, "status": "active" } },
            { $sample: { size: 1 } } 
        ]
    ).toArray(async(err, userList) => {
        if (err) {
            cb(err);
        } else {
            result.user = userList[0];
            cb(null, result);
        }
    });
}

const sendFollowRequest = function (CLIENT, req, res, requested_by_user_id, requested_to_user_id, cb) {
    let CONNECTION = CLIENT.db(utilities.dbName);
    let followRequestCollection = CONNECTION.collection(FRIEND_REQUEST_MODEL.collection_name);
    let requested_by = requested_by_user_id;
    let requested_to = requested_to_user_id;

    let newFollowRequestData = {};
    // Generate Follow Request Object
    newFollowRequestData.requested_by = requested_by;
    newFollowRequestData.requested_to = requested_to;

    let userCollection = CONNECTION.collection(Model.collection_name);
    userCollection.countDocuments({ user_id: requested_by, following_ids: requested_to }, function (err, count) {
        if (count > 0) {
            let error = new Error('You are already Following this user');
            cb(error);
        } else {
            /**
             * Check already request sent or not
             */
            followRequestCollection.countDocuments({ 
                $or: [
                    { $and: [{ requested_by: requested_by }, { requested_to: requested_to }] }, 
                    { $and: [{ requested_by: requested_to }, { requested_to: requested_by }] }
                ] 
            }, function (err, count) {
                if (count > 0) {
                    let error = new Error('You have already send request');
                    cb(error);
                } else {
                    utilities.validatePostData(CONNECTION, newFollowRequestData, FRIEND_REQUEST_MODEL, 'insert', 0, function (err, validatedData) {
                        if (err) {
                            cb(err);
                        } else {
                            validatedData.requestFrom = "autobot";
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
        }
    });
};
