'use strict';
let utility = require('../../utilities');
const SITE_CONFIG = require('../../configs/siteConfig');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const { sendPush, sendPush2 } = require('../../_helpers/push-notification');
const NOTIFICATION = require('../../models/notification.js');

/* For message */
const messageModel = require('./message.json');
const messageGroupModel = require('./message_group.json');
const messageGroupMemberModel = require('./message_group_members.json');
const userModel = require('./user.json');
const moment = require('moment');
const LIKE_MODEL = require('./likes.json');
let likeCollectionName = LIKE_MODEL.collection_name;
let userCollectionName = userModel.collection_name;

const SOCKET_MODEL = require('./socket.json');
let socketCollectionName = SOCKET_MODEL.collection_name;

/* For Fonts */
const fontModel = require('./fonts.json');
/* ********* */

/* For log file upload */
const logStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dirBasePath = SITE_CONFIG.mediaBasePath;
        let dirPath = dirBasePath + "iPhoneLog";
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath);
        }
        cb(null, dirPath);
    },
    filename: (req, file, cb) => {
        console.log(file);
        let extension = path.extname(file.originalname);
        cb(null, file.originalname);
    }
});

module.exports.uploadLog = multer({ storage: logStorage }).array('file', 5);

module.exports.afterUploadLog = async function (req, res, next) {
    const dirBasePath = SITE_CONFIG.mediaBasePath;
    let dirPath = dirBasePath + "iPhoneLog";
    // console.log(req.files[0].originalname);
    // let extension = path.extname(req.file.originalname);
    res.json({ status: true, data: dirPath + "/" + req.files[0].originalname });
};

module.exports.addMessage = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let messageCollection = CONNECTION.collection(messageModel.collection_name);

    let newMessageData = utility.filterBody(req.body);
    if (newMessageData === {}) {
        return cb({ error: 'invalid data' }, false);
    }
    newMessageData.from_id = Number(newMessageData.from_id);
    newMessageData.to_id = Number(newMessageData.to_id);

    utility.validatePostData(CONNECTION, newMessageData, messageModel, 'insert', 0, function (err, validatedData) {
        if (err) {
            cb(err);
        } else {
            messageCollection.insertOne(validatedData, async function (err, response) {
                if (err) {
                    cb(err);
                } else {
                    let userCollection = CONNECTION.collection(userModel.collection_name);
                    let socketCollection = CONNECTION.collection(socketCollectionName);
                    await userCollection.findOne({ user_id: newMessageData.from_id })
                        .then(async Details => {
                            await userCollection.findOne({ user_id: newMessageData.to_id })
                                .then(Details_to => {
                                    /*Blocked sender by receiver logic*/
                                    if (Details_to.blocked_ids && Details_to.blocked_ids.indexOf(Details.user_id) !== -1) {
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
                                        profile_image_url: Details.profile_image_url
                                    };
                                    result.like_count = 0;
                                    result.liked = false;
                                    result.liked_by = [];
                                    result.message_id = validatedData.message_id;
                                    result.message_image = validatedData.message_image ? validatedData.message_image : "";
                                    result.message_status = validatedData.message_status;
                                    result.message_text = validatedData.message_text;
                                    result.to_id = validatedData.to_id;
                                    result._id =validatedData?._id;
                                    /**********************************/
                                    var userName = Details.first_name + " " + Details.last_name;
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
                                            user_info: { first_name: Details.first_name, last_name: Details.last_name, user_id: Details.user_id, blocked_by_me: Details_to.blocked_by_me, profile_image_url: `https://cdn.afrocamgist.com/${Details.profile_image_url}` }
                                        }
                                    };
                                    userCollection.findOne({ user_id: newMessageData.to_id })
                                        .then(userDetails => {
                                            socketCollection.findOne({ user_id: userDetails.user_id, status: "active" })
                                                .then(socketUser => {
                                                    var socketId = socketUser ? socketUser.socket : '';
                                                    // if(socketUser) {
                                                    //     socketId = socketUser.socket;
                                                    // }
                                                    console.log('to user socket id: ', socketId);
                                                    var userNameET = "";
                                                    var userNameEF = "";
                                                    var emailMessage = `You got new message from ${userName}`;
                                                    if (userDetails.user_name) {
                                                        userNameET = userDetails.user_name;
                                                    }
                                                    if (Details.user_name) {
                                                        userNameEF = Details.user_name;
                                                    }
                                                    let email = {
                                                        sendEmail: true,
                                                        message: emailMessage,
                                                        // post_id: notification_details.post_id,
                                                        type: "newMessage",
                                                        toUser: {
                                                            user_id: userDetails.user_id,
                                                            first_name: userDetails.first_name,
                                                            last_name: userDetails.last_name,
                                                            email: userDetails.email,
                                                            user_name: userNameET,
                                                            socketId: socketId
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
                                                });
                                        })
                                        .catch((err) => console.error(err))
                                    let finalResponse = result;
                                    cb(null, finalResponse);
                                }).catch((err) => console.error(err))
                        })
                        .catch((err) => console.error(err))
                    // let finalResponse = {};
                    // finalResponse.status = true;
                    // cb(null, finalResponse);
                }
            });
        }
    });
};

/* Get Message START */
module.exports.getMessages = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let messageCollection = CONNECTION.collection(messageModel.collection_name);
    let userCollection = CONNECTION.collection(userModel.collection_name);

    let page = Number(req.body.page) || 1;
    let limit = SITE_CONFIG.messageLimitPerPage * page;
    let skip = 0; //(page - 1) * limit;

    const user_id = Number(req.body.to_id);
    const currentLoggedInUser = Number(req.body.from_id);
    userCollection.findOne({ user_id: currentLoggedInUser }, function (err, userDetails) {
        messageCollection
            .aggregate([
                {
                    $match: {
                        $or: [
                            { to_id: currentLoggedInUser, from_id: user_id },
                            { to_id: user_id, from_id: currentLoggedInUser }
                        ],
                        message_status: { $ne: "deleted" }
                    }
                },
                {
                    $sort: { created_date: -1 }
                },
                {
                    $skip: skip
                },
                {
                    $limit: limit
                },
                {
                    $lookup: {
                        from: userModel.collection_name,
                        localField: "from_id",
                        foreignField: "user_id",
                        as: "fromUserDetails"
                    }
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
                        "from_user.first_name": { $arrayElemAt: ["$fromUserDetails.first_name", 0] },
                        "from_user.last_name": { $arrayElemAt: ["$fromUserDetails.last_name", 0] },
                        "from_user.user_name": { $ifNull: [{ $arrayElemAt: ["$fromUserDetails.user_name", 0] }, ""] },
                        "from_user.profile_image_url": { $arrayElemAt: ["$fromUserDetails.profile_image_url", 0] },
                        "from": { $cond: [{ $eq: ["$from_id", currentLoggedInUser] }, "me", "friend"] },
                        message_reply_id: 1,
                        message_reply_text: 1,
                        like_count: { $ifNull: ["$like_count", 0] },
                        liked: { $cond: [{ $eq: [{ $arrayElemAt: ['$liked.count', 0] }, 1] }, true, false] },
                        liked_by: 1
                    }
                }

            ]).toArray((err, messageList) => {
                if (err) {
                    cb(err);
                } else {
                    messageList.forEach((friend, MLindex) => {
                        if (friend.from == "me") {
                            if (userDetails.blocked_ids && userDetails.blocked_ids.indexOf(friend.to_id) !== -1) {
                                friend.blocked_by_me = true;
                            } else {
                                friend.blocked_by_me = false;
                            }
                        } else {
                            if (userDetails.blocked_ids && userDetails.blocked_ids.indexOf(friend.from_id) !== -1) {
                                friend.blocked_by_me = true;
                            } else {
                                friend.blocked_by_me = false;
                            }
                        }
                    });
                    messageCollection.updateMany({ to_id: currentLoggedInUser, from_id: user_id, message_status: { $ne: "deleted" } }, { $set: { message_status: 'read' } }, function (err, readMessages) {
                        let finalResponse = {};
                        // finalResponse.status = true;
                        finalResponse.data = messageList.reverse();
                        finalResponse.count = messageList.length;
                        finalResponse.currentPage = page;
                        finalResponse.nextPage = page + 1;
                        cb(null, finalResponse);
                    });

                }
            });
    });
};

const likesLookup = (like_type, currentUserId) => {
    return {
        $lookup: {
            from: likeCollectionName,
            let: {
                messageId: "$message_id"
            },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $eq: ["$message_id", "$$messageId"]
                        }
                    }
                },
                {
                    $match: {
                        $expr: {
                            $eq: ["$like_type", like_type]
                        }
                    }
                },
                {
                    $limit: 5
                },
                {
                    $lookup: {
                        from: userCollectionName,
                        localField: "liked_by",
                        foreignField: "user_id",
                        as: "users"
                    }
                },
                {
                    $project: {
                        _id: 0,
                        user_id: { $arrayElemAt: ["$users.user_id", 0] },
                        first_name: { $arrayElemAt: ["$users.first_name", 0] },
                        last_name: { $arrayElemAt: ["$users.last_name", 0] },
                        profile_image_url: { $arrayElemAt: ["$users.profile_image_url", 0] },
                        user_name: { $ifNull: [{ $arrayElemAt: ["$users.user_name", 0] }, ""] }
                    }
                }
            ],
            as: "liked_by"
        }
    };
};

const likedByMeLookup = (currentUserId) => {
    return {
        $lookup: {
            from: likeCollectionName,
            let: {
                messageId: "$message_id"
            },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $eq: ["$message_id", "$$messageId"]
                        }
                    }
                },
                {
                    $match: {
                        $expr: {
                            $eq: ["$liked_by", currentUserId]
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 }
                    }
                }
            ],
            as: "liked"
        }
    };
};
/* Get Message END */

module.exports.createMessageGroup = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let messageGroupCollection = CONNECTION.collection(messageGroupModel.collection_name);
    let messageGroupMemberCollection = CONNECTION.collection(messageGroupMemberModel.collection_name);

    let newGroupData = utility.filterBody(req.body);
    if (newGroupData === {}) {
        return cb({ error: 'invalid data' }, false);
    }
    newGroupData.created_by = Number(newGroupData.created_by);
    newGroupData.members = 1;

    utility.validatePostData(CONNECTION, newGroupData, messageGroupModel, 'insert', 0, function (err, validatedData) {
        if (err) {
            cb(err);
        } else {
            messageGroupCollection.insertOne(validatedData, function (err, response) {
                if (err) {
                    cb(err);
                } else {
                    // console.log(response);
                    const memberData = {
                        member_id: validatedData.created_by,
                        group_id: validatedData.message_group_id,
                        is_admin: true
                    }
                    utility.validatePostData(CONNECTION, memberData, messageGroupMemberModel, 'insert', 0, function (err, validatedData2) {
                        messageGroupMemberCollection.insertOne(validatedData2, function (err, response2) {
                            if (err) {
                                cb(err);
                            } else {
                                // console.log(response2);
                                let finalResponse = {};
                                finalResponse.status = true;
                                finalResponse.result =validatedData;
                                cb(null, finalResponse);
                            }
                        });
                    });
                }
            });
        }
    });
};


/** #####################
 * FONT SECTION START
 ##################### */

/**
 * Get Fonts
 */
module.exports.getFonts = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let fontCollection = CONNECTION.collection(fontModel.collection_name);

    fontCollection.find({ "status": "active" }).toArray((err, fonts) => {
        if (err) {
            cb(err);
        } else {
            const dirBasePath = SITE_CONFIG.mediaBasePath;
            var font_path = dirBasePath.replace("uploads/", "fonts/webfonts/");
            fonts.forEach(font => {
                var fontFiles = {
                    eot: "",
                    svg: "",
                    ttf: "",
                    woff: "",
                    woff2: ""
                };
                if (font.fontfile == "") {
                    font.fontfile = fontFiles;
                } else {
                    var font_eot = font_path + font.fontfile + ".eot";
                    var font_svg = font_path + font.fontfile + ".svg";
                    var font_ttf = font_path + font.fontfile + ".ttf";
                    var font_woff = font_path + font.fontfile + ".woff";
                    var font_woff2 = font_path + font.fontfile + ".woff2";
                    console.log(font_eot);
                    console.log("===");

                    if (fs.existsSync(font_eot)) {
                        fontFiles.eot = "fonts/webfonts/" + font.fontfile + ".eot";
                    }
                    if (fs.existsSync(font_svg)) {
                        fontFiles.svg = "fonts/webfonts/" + font.fontfile + ".svg";
                    }
                    if (fs.existsSync(font_ttf)) {
                        fontFiles.ttf = "fonts/webfonts/" + font.fontfile + ".ttf";
                    }
                    if (fs.existsSync(font_woff)) {
                        fontFiles.woff = "fonts/webfonts/" + font.fontfile + ".woff";
                    }
                    if (fs.existsSync(font_woff2)) {
                        fontFiles.woff2 = "fonts/webfonts/" + font.fontfile + ".woff2";
                    }
                    font.fontfile = fontFiles;
                }
            });
            let finalResponse = {};
            finalResponse.status = true;
            finalResponse.data = fonts;
            cb(null, finalResponse);
        }
    });
};

/**
 * Add Font
 */
module.exports.addFont = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let fontCollection = CONNECTION.collection(fontModel.collection_name);

    let fontData = utility.filterBody(req.body);
    if (fontData === {}) {
        return cb({ error: 'invalid data' }, false);
    }

    utility.validatePostData(CONNECTION, fontData, fontModel, 'insert', 0, function (err, validatedData) {
        if (err) {
            cb(err);
        } else {
            fontCollection.insertOne(validatedData, async function (err, response) {
                if (err) {
                    cb(err);
                } else {
                    let finalResponse = {};
                    finalResponse.status = true;
                    finalResponse.data = validatedData;
                    cb(null, finalResponse);
                }
            });
        }
    });
};

/** #####################
 * FONT SECTION END
 ##################### */