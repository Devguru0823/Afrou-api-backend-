'use strict';
const Model = require('./notification.json');
const userModel = require('./user.json');
const messageModel = require('./message.json');
let utility = require('../../utilities');
const SITE_CONFIG = require('../../configs/siteConfig');

module.exports.getNotifications = function(CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let notificationCollection = CONNECTION.collection(Model.collection_name);
    let page = 1;
    let limit = 50;
    let skip = (page - 1) * limit;
    notificationCollection
        .find({notify_users: req.authorization.user_id})
        .sort({notification_status: -1, created_date:-1})
        .skip(skip)
        .limit(limit)
        .toArray((err, notificationList)=>{
        if(err){
            cb(err);
        }else{
            utility.getNotificationTextFromTemplate(CONNECTION, notificationList, function (err, result) {
                let finalResponse = {};
                finalResponse.status = true;
                finalResponse.data = result;
                cb(err, finalResponse);
            });
        }
    });
};

module.exports.getNotificationsV2 = function(CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let notificationCollection = CONNECTION.collection(Model.collection_name);
    let page = Number(req.query.page) || 1;
    let limit = SITE_CONFIG.notificationLimitPerPage;
    let skip = (page - 1) * limit;

    notificationCollection
    .find({notify_users: req.authorization.user_id})
    .sort({notification_status: -1, created_date:-1})
    .skip(skip)
    .limit(limit)
    .toArray((err, notificationList)=>{
        if(err) {
            cb(err);
        } else {
            utility.getNotificationTextFromTemplate(CONNECTION, notificationList, function (err, result) {
                let finalResponse = {};
                finalResponse.status = true;
                finalResponse.data = result;
                finalResponse.count = result.length;
                finalResponse.currentPage = page;
                finalResponse.nextPage = page + 1;
                cb(err, finalResponse);
            });
        }
    });
};

module.exports.addNotification = function (CLIENT, req, res, notification_type, notify_users, notification_details, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let notificationCollection = CONNECTION.collection(Model.collection_name);

    let newNotificationData = {
        notification_details: notification_details,
        notification_type: notification_type,
        notify_users: notify_users
    };
    utility.validatePostData(CONNECTION, newNotificationData, Model, 'insert', 0, function (err, validatedData) {
        if(err){
            cb(err);
        }else{
            notificationCollection.insertOne(validatedData, function (err, response) {
                if(err){
                    cb(err);
                } else {
                    let finalResponse = {};
                    finalResponse.status = true;
                    cb(null, finalResponse);
                }
            });
        }
    });
};

module.exports.readNotification = function(CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let notificationCollection = CONNECTION.collection(Model.collection_name);
    let notification_id = Number(req.params.notification_id);
    notificationCollection.findOneAndUpdate({notification_id: notification_id}, {$set: {notification_status: "read"}},(err, updated)=>{
        let finalResponse = {};
        finalResponse.status = true;
        cb(err, finalResponse);
    });
};

module.exports.markAllAsRead = function(CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    const currentUserId = req.authorization.user_id;
    let notificationCollection = CONNECTION.collection(Model.collection_name);
    let notification_id = Number(req.params.notification_id);
    notificationCollection.updateMany({notify_users: currentUserId}, {$set: {notification_status: "read"}},(err, updated)=>{
        let finalResponse = {};
        finalResponse.status = true;
        cb(err, finalResponse);
    });
};

module.exports.getCounters = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let notificationCollection = CONNECTION.collection(Model.collection_name);
    notificationCollection
        .countDocuments({notify_users: req.authorization.user_id, notification_status: "unread"}, (err, notificationCount)=>{
            if(err){
                cb(err);
            }else{

                getTopNotifications(CLIENT, req, res, function (err, resp) {
                    getNavCounters(CLIENT, req, resp, function (err, navCounters) {
                        let finalResponse = {};
                        finalResponse.status = true;
                        finalResponse.data = {
                            notification_count: notificationCount,
                            notifications: resp || [],
                            navCounters: navCounters
                        };
                        cb(err, finalResponse);
                    });

                });
            }
        });
};

let getTopNotifications = function(CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let notificationCollection = CONNECTION.collection(Model.collection_name);
    notificationCollection
        .find({notify_users: req.authorization.user_id, notification_status: 'unread'})
        .limit(5)
        .sort({notification_status: -1, created_date:-1})
        .toArray((err, notificationList)=>{
            if(err){
                cb(err);
            }else{
                utility.getNotificationTextFromTemplate(CONNECTION, notificationList, function (err, result) {
                    cb(err, result);
                });
            }
        });
};

let getNavCounters = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let userCollection = CONNECTION.collection(userModel.collection_name);
    let messagesCollection = CONNECTION.collection(messageModel.collection_name);
    userCollection.findOne({user_id: req.authorization.user_id}, function (err, userData) {
        let friendsArr = userData.friend_ids || [];
        let followingsArr = userData.following_ids || [];
        let followersArr = userData.follower_ids || [];
        let totalUserList = [ ...friendsArr, ...followingsArr, ...followersArr];
        userCollection.find({user_id: {$in: totalUserList}}, {projection: {user_id: 1, status: 1}}).toArray(function (err, totalUsersDetails) {
            if(err){
                cb(err);
            }else{
                let friendsCount = 0;
                let followingCount = 0;
                let followerCount = 0;
                totalUsersDetails.forEach(user=>{
                    if(user.status === 'active') {
                        if(friendsArr.indexOf(user.user_id) !== -1) {
                            friendsCount++;
                        }

                        if(followingsArr.indexOf(user.user_id) !== -1) {
                            followingCount++;
                        }

                        if(followersArr.indexOf(user.user_id) !== -1) {
                            followerCount++;
                        }
                    }
                    // if(user.status !== 'active'){
                    //     if(friendsArr.indexOf(user.user_id) >=0){
                    //         friendsArr.splice(friendsArr.indexOf(user.user_id), 1);
                    //     }
                    //     if(followingsArr.indexOf(user.user_id) >= 0){
                    //         followingsArr.splice(followingsArr.indexOf(user.user_id), 1);
                    //     }
                    //     if(followersArr.indexOf(user.user_id) >= 0){
                    //         followersArr.splice(followersArr.indexOf(user.user_id), 1);
                    //     }
                    //
                    // }
                });
                messagesCollection.countDocuments({to_id: req.authorization.user_id, message_status: 'unread'}, function (err, messagesCount) {
                    let finalCounters = {
                        friends: friendsCount,
                        followings: followingCount,
                        followers: followerCount,
                        messages: messagesCount
                    };
                    cb(null, finalCounters);
                })
            }
        });
    });
};
