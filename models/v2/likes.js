'use strict'
const Model = require('./likes.json');
const CommentModel = require('./post_comment.json');
let utility = require('../../utilities');
const { sendPush, sendPush2 } = require('../../_helpers/push-notification');

const NOTIFICATION = require('./notification.js');
const likeValidator = require('../../validators/v2/like');
module.exports.getLike = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let likeCollection = CONNECTION.collection(Model.collection_name);
    likeCollection.find({}).toArray((err, likeList) => {
        if (err) {
            cb(err);
        } else {
            let finalResponse = {};
            finalResponse.status = true;
            finalResponse.data = likeList;
            cb(null, finalResponse);
        }
    });
};

module.exports.addLike = async function (CLIENT, req, res, cb) {
    if (req.body.comment_id) {
        req.body.comment_id = parseInt(req.body.comment_id);
    }
    try {
        await likeValidator.validateAsync(req.body);
    } catch (error) {
        const vErr = new Error();
        vErr.name = error.name;
        vErr.message = error.message;
        cb(vErr);
        return;
    }
    let CONNECTION = CLIENT.db(utility.dbName);
    let likeCollection = CONNECTION.collection(Model.collection_name);
    const POST_MODEL = require('./post.json');
    let postCollection = CONNECTION.collection(POST_MODEL.collection_name);
    const userModel = require('./user.json');
    let userCollection = CONNECTION.collection(userModel.collection_name);

    let newLikeData = utility.filterBody(req.body);
    if (newLikeData === {}) {
        return cb({ error: 'invalid data' }, false);
    }
    if ((!newLikeData.post_id && newLikeData.like_type !== 'comment') || (!newLikeData.comment_id && newLikeData.like_type === 'comment')) {
        let error = new Error();
        error.name = "VALIDATION_ERROR";
        error.status = 422;
        error.message = 'Invalid Like Data';
        cb(error);
        return;
    }
    newLikeData.post_id = Number(newLikeData.post_id);
    newLikeData.liked_by = req.authorization.user_id;
    utility.validatePostData(CONNECTION, newLikeData, Model, 'insert', 0, function (err, validatedData) {
        if (err) {
            cb(err);
        } else {
            likeCollection.findOne({ post_id: validatedData.post_id, liked_by: validatedData.liked_by, comment_id: validatedData.comment_id, like_type: validatedData.like_type }, function (err, likeData) {
                if (err) {
                    cb(err);
                } else if (likeData) {
                    // Unlike
                    likeCollection.deleteOne({ _id: likeData._id }, function (err, response) {
                        if (err) {
                            cb(err);
                        } else {
                            /* Comment like counter */
                            var totalCommentLikes = 0;
                            likeCollection.count({ comment_id: validatedData.comment_id, like_type: validatedData.like_type }, function (err, likeCountData) {
                                if (err) {
                                    cb(err);
                                } else {
                                    totalCommentLikes = likeCountData;
                                }
                            });
                            /* ************************* */
                            if (newLikeData.like_type === 'comment') {
                                let finalResponse = {};
                                finalResponse.status = true;
                                finalResponse.counts = totalCommentLikes;
                                cb(null, finalResponse);
                            } else {
                                postCollection.findOneAndUpdate({ post_id: validatedData.post_id }, { $inc: { like_count: -1 } }, function (err, resp) {
                                    let finalResponse = {};
                                    finalResponse.status = true;
                                    finalResponse.counts = totalCommentLikes;
                                    cb(null, finalResponse);
                                });
                            }
                        }
                    });
                } else {
                    // Like
                    likeCollection.insertOne(validatedData, function (err, response) {
                        if (err) {
                            cb(err);
                        } else {
                            /* Comment like counter */
                            var totalCommentLikes = 0;
                            likeCollection.count({ comment_id: validatedData.comment_id, like_type: validatedData.like_type }, function (err, likeCountData) {
                                if (err) {
                                    cb(err);
                                } else {
                                    totalCommentLikes = likeCountData;
                                }
                            });
                            /* ************************* */
                            if (newLikeData.like_type === 'comment') {
                                // Like on COmment
                                const commentCollection = CONNECTION.collection(CommentModel.collection_name);
                                commentCollection.findOne({ comment_id: validatedData.comment_id }, async function (err, commentData) {
                                    let requested_by = req.authorization.user_id;
                                    let requested_to = commentData.commented_by;

                                    if (requested_by !== requested_to) {
                                        let notification_details = {
                                            text_template: '{{USER_ID_' + requested_by + '}} liked  your Comment on a post',
                                            post_id: commentData.post_id
                                        };

                                        let notification_type = 'post_like';
                                        let notify_users = [requested_to];

                                        await userCollection.findOne({ user_id: requested_by })
                                            .then(Details => {
                                                let pushData = {
                                                    status: "Like",
                                                    title: "Like on Comment",
                                                    body: `${Details.first_name} ${Details.last_name} liked  your Comment`,
                                                    sound: "default",
                                                    mutable_content: true,
                                                    content_available: true,
                                                    data: {
                                                        status: "Like",
                                                        message: `${Details.first_name} ${Details.last_name} liked  your Comment`,
                                                        notification_type: notification_type,
                                                        post_id: notification_details.post_id
                                                    }
                                                };
                                                notify_users.forEach(user => {
                                                    userCollection.findOne({ user_id: user })
                                                        .then(userDetails => {
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
                                                                type: "commentLike",
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
                                                                "Like",
                                                                pushData,
                                                                true,
                                                                email
                                                            );
                                                            // sendPush(
                                                            //     userDetails.firebase_token,
                                                            //     "Like",
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
                                            finalResponse.counts = totalCommentLikes;
                                            cb(null, finalResponse);
                                        });

                                    } else {
                                        let finalResponse = {};
                                        finalResponse.status = true;
                                        finalResponse.counts = totalCommentLikes;
                                        cb(null, finalResponse);
                                    }
                                });
                            } else {
                                postCollection.findOneAndUpdate({ post_id: validatedData.post_id }, { $inc: { like_count: 1 } }, async function (err, resp) {
                                    let requested_by = req.authorization.user_id;
                                    let requested_to = resp.value.posted_by;

                                    /* Add image to notification */
                                    var postImagePath = "";
                                    if (resp.value.post_type == "image") {
                                        if (resp.value.post_image) {
                                            if (resp.value.post_image[0]) {
                                                postImagePath = resp.value.post_image[0];
                                            }
                                        }
                                    } else if (resp.value.post_type == "video") {
                                        if (resp.value.thumbnail) {
                                            postImagePath = resp.value.thumbnail;
                                        }
                                    }
                                    if (postImagePath != "") {
                                        postImagePath = "https://cdn.staging.afrocamgist.com/" + postImagePath;
                                    }
                                    /* ========================= */

                                    if (requested_by !== requested_to) {
                                        let notification_details = {
                                            text_template: '{{USER_ID_' + requested_by + '}} liked  your post',
                                            post_id: validatedData.post_id
                                        };
                                        if (resp.value.posted_for === 'group') {
                                            notification_details.text_template = '{{USER_ID_' + requested_by + '}} liked  your post in a Group';
                                        }
                                        let notification_type = 'post_like';
                                        let notify_users = [requested_to];
                                        let pushData = {};
                                        await userCollection.findOne({ user_id: requested_by })
                                            .then(Details => {
                                                pushData = {
                                                    status: "Like",
                                                    title: "Like on post",
                                                    body: `${Details.first_name} ${Details.last_name} liked  your post`,
                                                    image: postImagePath,
                                                    sound: "default",
                                                    mutable_content: true,
                                                    content_available: true,
                                                    data: {
                                                        status: "Like",
                                                        message: `${Details.first_name} ${Details.last_name} liked  your post`,
                                                        image: postImagePath,
                                                        notification_type: notification_type,
                                                        post_id: notification_details.post_id
                                                    }
                                                };
                                                notify_users.forEach(user => {
                                                    userCollection.findOne({ user_id: user })
                                                        .then(userDetails => {
                                                            var type = "postLike";
                                                            if (resp.value.posted_for === 'group') {
                                                                type = "groupPostLike";
                                                            }
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
                                                                type: type,
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
                                                                "Like",
                                                                pushData,
                                                                true,
                                                                email
                                                            );
                                                            // sendPush(
                                                            //     userDetails.firebase_token,
                                                            //     "Like",
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
                                            cb(null, finalResponse);
                                        });
                                    } else {
                                        let finalResponse = {};
                                        finalResponse.status = true;
                                        cb(null, finalResponse);
                                    }
                                });
                            }

                        }
                    });
                }
            });
        }
    });
};

module.exports.addStoryLike = async function (CLIENT, req, res, cb) {
    req.body.story_id = Number(req.body.story_id);
    req.body.comment_id = Number(req.body.comment_id);
    try {
        await likeValidator.validateAsync(req.body);
    } catch (error) {
        const vErr = new Error();
        vErr.name = error.name;
        vErr.message = error.message;
        cb(vErr);
        return;
    }
    let CONNECTION = CLIENT.db(utility.dbName);
    let likeCollection = CONNECTION.collection(Model.collection_name);
    const STORY_MODEL = require('./storyline.json');
    let storylineCollection = CONNECTION.collection(STORY_MODEL.collection_name);
    // const userModel = require('./user.json');
    // let userCollection = CONNECTION.collection(userModel.collection_name);

    let newLikeData = utility.filterBody(req.body);
    if (newLikeData === {}) {
        return cb({ error: 'invalid data' }, false);
    }
    if ((!newLikeData.story_id && newLikeData.like_type === 'story') || (!newLikeData.comment_id && newLikeData.like_type === 'storycomment')) {
        let error = new Error();
        error.name = "VALIDATION_ERROR";
        error.status = 422;
        error.message = 'Invalid Like Data';
        cb(error);
        return;
    }

    newLikeData.liked_by = req.authorization.user_id;
    utility.validatePostData(CONNECTION, newLikeData, Model, 'insert', 0, function (err, validatedData) {
        if (err) {
            cb(err);
        } else {
            likeCollection.findOne({ story_id: validatedData.story_id, liked_by: validatedData.liked_by, comment_id: validatedData.comment_id, like_type: validatedData.like_type }, function (err, likeData) {
                if (err) {
                    cb(err);
                } else if (likeData) {
                    // Unlike
                    likeCollection.deleteOne({ _id: likeData._id }, function (err, response) {
                        if (err) {
                            cb(err);
                        } else {
                            /* Comment like counter */
                            var totalCommentLikes = 0;
                            likeCollection.count({ comment_id: validatedData.comment_id, like_type: validatedData.like_type }, function (err, likeCountData) {
                                if (err) {
                                    cb(err);
                                } else {
                                    totalCommentLikes = likeCountData;
                                }
                            });
                            /* ************************* */
                            if (newLikeData.like_type === 'storycomment') {
                                let finalResponse = {};
                                finalResponse.status = true;
                                finalResponse.counts = totalCommentLikes;
                                cb(null, finalResponse);
                            } else {
                                storylineCollection.findOneAndUpdate({ story_id: validatedData.story_id }, { $inc: { like_count: -1 } }, function (err, resp) {
                                    let finalResponse = {};
                                    finalResponse.status = true;
                                    finalResponse.counts = totalCommentLikes;
                                    cb(null, finalResponse);
                                });
                            }
                            /* ************************* */
                        }
                    });
                } else {
                    // Like
                    likeCollection.insertOne(validatedData, function (err, response) {
                        if (err) {
                            cb(err);
                        } else {
                            /*********************** */
                            /* Comment like counter */
                            var totalCommentLikes = 0;
                            likeCollection.count({ comment_id: validatedData.comment_id, like_type: validatedData.like_type }, function (err, likeCountData) {
                                if (err) {
                                    cb(err);
                                } else {
                                    totalCommentLikes = likeCountData;
                                }
                            });
                            /* ************************* */
                            if (newLikeData.like_type === 'storycomment') {
                                // Like on Comment
                                const commentCollection = CONNECTION.collection(CommentModel.collection_name);
                                commentCollection.findOne({ comment_id: validatedData.comment_id }, async function (err, commentData) {
                                    let finalResponse = {};
                                    finalResponse.status = true;
                                    finalResponse.counts = totalCommentLikes;
                                    cb(null, finalResponse);
                                });
                            } else {
                                storylineCollection.findOneAndUpdate({ story_id: validatedData.story_id }, { $inc: { like_count: 1 } }, async function (err, resp) {
                                    let requested_by = req.authorization.user_id;
                                    let requested_to = resp.value.posted_by;
                                    // if (requested_by !== requested_to) {
                                    //     let notification_details = {
                                    //         text_template: '{{USER_ID_' + requested_by + '}} liked  your post',
                                    //         post_id: validatedData.post_id
                                    //     };
                                    //     if (resp.value.posted_for === 'group') {
                                    //         notification_details.text_template = '{{USER_ID_' + requested_by + '}} liked  your post in a Group';
                                    //     }
                                    //     let notification_type = 'post_like';
                                    //     let notify_users = [requested_to];
                                    //     let pushData = {};
                                    //     await userCollection.findOne({ user_id: requested_by })
                                    //         .then(Details => {
                                    //             pushData = {
                                    //                 status: "Like",
                                    //                 title: "Like on post",
                                    //                 body: `${Details.first_name} ${Details.last_name} liked  your post`,
                                    //                 sound: "default",
                                    //                 mutable_content: true,
                                    //                 content_available: true,
                                    //                 data: {
                                    //                     status: "Like",
                                    //                     message: `${Details.first_name} ${Details.last_name} liked  your post`,
                                    //                     notification_type: notification_type,
                                    //                     post_id:notification_details.post_id
                                    //                 }
                                    //             };
                                    //             notify_users.forEach(user => {
                                    //                 userCollection.findOne({ user_id: user })
                                    //                     .then(userDetails => {
                                    //                         sendPush(
                                    //                             userDetails.firebase_token,
                                    //                             "Like",
                                    //                             pushData,
                                    //                             true,
                                    //                         );
                                    //                     })
                                    //                     .catch((err) => console.error(err))
                                    //             })
                                    //         })
                                    //         .catch((err) => console.error(err))

                                    //     NOTIFICATION.addNotification(CLIENT, req, res, notification_type, notify_users, notification_details, function (err, notificationResp) {
                                    //         let finalResponse = {};
                                    //         finalResponse.status = true;
                                    //         cb(null, finalResponse);
                                    //     });
                                    // } else {
                                    //     let finalResponse = {};
                                    //     finalResponse.status = true;
                                    //     cb(null, finalResponse);
                                    // }
                                    let finalResponse = {};
                                    finalResponse.status = true;
                                    cb(null, finalResponse);
                                });
                            }
                            /*********************** */
                        }
                    });
                }
            });
        }
    });
};

module.exports.addMessageLike = async function (CLIENT, req, res, cb) {
    req.body.message_id = Number(req.body.message_id);
    try {
        await likeValidator.validateAsync(req.body);
    } catch (error) {
        const vErr = new Error();
        vErr.name = error.name;
        vErr.message = error.message;
        cb(vErr);
        return;
    }
    let CONNECTION = CLIENT.db(utility.dbName);
    let likeCollection = CONNECTION.collection(Model.collection_name);
    const MESSAGE_MODEL = require('./message.json');
    let messageCollection = CONNECTION.collection(MESSAGE_MODEL.collection_name);

    let newLikeData = utility.filterBody(req.body);
    if (newLikeData === {}) {
        return cb({ error: 'invalid data' }, false);
    }
    if ((!newLikeData.message_id && newLikeData.like_type === 'message')) {
        let error = new Error();
        error.name = "VALIDATION_ERROR";
        error.status = 422;
        error.message = 'Invalid Like Data';
        cb(error);
        return;
    }

    newLikeData.liked_by = req.authorization.user_id;

    /* Check already liked then call dislike */
    likeCollection.findOne({ message_id: newLikeData.message_id, liked_by: newLikeData.liked_by, like_type: newLikeData.like_type }, function (err, likeData) {
        if (err) {
            cb(err);
        } else if (likeData) {
            // Unlike
            likeCollection.deleteOne({ _id: likeData._id }, async function (err, response) {
                if (err) {
                    cb(err);
                } else {
                    messageCollection.findOneAndUpdate({ message_id: newLikeData.message_id }, { $inc: { like_count: -1 } }, async function (err, resp) {
                        var totalLikes = await likeCollection.find({ message_id: newLikeData.message_id, }).count();
                        resp.value.like_count = totalLikes;
                        let finalResponse = {};
                        finalResponse.status = true;
                        finalResponse.data = resp.value;
                        cb(null, finalResponse);
                    });
                }
            });
        } else {
            // validate data
            utility.validatePostData(CONNECTION, newLikeData, Model, 'insert', 0, function (err, validatedData) {
                if (err) {
                    cb(err);
                } else {
                    // Like
                    likeCollection.insertOne(validatedData, function (err, response) {
                        if (err) {
                            cb(err);
                        } else {
                            messageCollection.findOneAndUpdate({ message_id: validatedData.message_id }, { $inc: { like_count: 1 } }, async function (err, resp) {
                                var totalLikes = await likeCollection.find({ message_id: validatedData.message_id }).count();
                                resp.value.like_count = totalLikes;
                                let finalResponse = {};
                                finalResponse.status = true;
                                finalResponse.data = resp.value;
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
 * Add like for Open Users
 */
module.exports.addLikeOpen = function (CLIENT, req, res, cb) {
    req.body.comment_id = parseInt(req.body.comment_id);
    let CONNECTION = CLIENT.db(utility.dbName);
    let likeCollection = CONNECTION.collection(Model.collection_name);
    const POST_MODEL = require('./post.json');
    let postCollection = CONNECTION.collection(POST_MODEL.collection_name);
    const userModel = require('./user.json');
    let userCollection = CONNECTION.collection(userModel.collection_name);

    var newLikeData = utility.filterBody(req.body);
    if (newLikeData === {}) {
        return cb({ error: 'invalid data' }, false);
    }
    if (req.body.user_id) {
        delete newLikeData.user_id;
    }
    if ((!newLikeData.post_id && newLikeData.like_type !== 'comment') || (!newLikeData.comment_id && newLikeData.like_type === 'comment')) {
        let error = new Error();
        error.name = "VALIDATION_ERROR";
        error.status = 422;
        error.message = 'Invalid Like Data';
        cb(error);
        return;
    }
    newLikeData.post_id = Number(newLikeData.post_id);
    newLikeData.liked_by = Number(req.body.user_id);
    utility.validatePostData(CONNECTION, newLikeData, Model, 'insert', 0, function (err, validatedData) {
        if (err) {
            cb(err);
        } else {
            likeCollection.findOne({ post_id: validatedData.post_id, liked_by: validatedData.liked_by, comment_id: validatedData.comment_id, like_type: validatedData.like_type }, function (err, likeData) {
                if (err) {
                    cb(err);
                } else if (likeData) {
                    // Unlike
                    likeCollection.deleteOne({ _id: likeData._id }, function (err, response) {
                        if (err) {
                            cb(err);
                        } else {
                            /* Comment like counter */
                            var totalCommentLikes = 0;
                            likeCollection.count({ comment_id: validatedData.comment_id, like_type: validatedData.like_type }, function (err, likeCountData) {
                                if (err) {
                                    cb(err);
                                } else {
                                    totalCommentLikes = likeCountData;
                                }
                            });
                            /* ************************* */
                            if (newLikeData.like_type === 'comment') {
                                let finalResponse = {};
                                finalResponse.status = true;
                                finalResponse.counts = totalCommentLikes;
                                cb(null, finalResponse);
                            } else {
                                postCollection.findOneAndUpdate({ post_id: validatedData.post_id }, { $inc: { like_count: -1 } }, function (err, resp) {
                                    let finalResponse = {};
                                    finalResponse.status = true;
                                    finalResponse.counts = totalCommentLikes;
                                    cb(null, finalResponse);
                                });
                            }
                        }
                    });
                } else {
                    // Like
                    likeCollection.insertOne(validatedData, function (err, response) {
                        if (err) {
                            cb(err);
                        } else {
                            /* Comment like counter */
                            var totalCommentLikes = 0;
                            likeCollection.count({ comment_id: validatedData.comment_id, like_type: validatedData.like_type }, function (err, likeCountData) {
                                if (err) {
                                    cb(err);
                                } else {
                                    totalCommentLikes = likeCountData;
                                }
                            });
                            /* ************************* */
                            if (newLikeData.like_type === 'comment') {
                                // Like on COmment
                                const commentCollection = CONNECTION.collection(CommentModel.collection_name);
                                commentCollection.findOne({ comment_id: validatedData.comment_id }, async function (err, commentData) {
                                    let requested_by = Number(req.body.user_id);
                                    let requested_to = commentData.commented_by;

                                    if (requested_by !== requested_to) {
                                        let notification_details = {
                                            text_template: '{{USER_ID_' + requested_by + '}} liked  your Comment on a post',
                                            post_id: commentData.post_id
                                        };

                                        let notification_type = 'post_like';
                                        let notify_users = [requested_to];

                                        await userCollection.findOne({ user_id: requested_by })
                                            .then(Details => {
                                                let pushData = {
                                                    status: "Like",
                                                    title: "Like on Comment",
                                                    body: `${Details.first_name} ${Details.last_name} liked  your Comment`,
                                                    sound: "default",
                                                    mutable_content: true,
                                                    content_available: true,
                                                    data: {
                                                        status: "Like",
                                                        message: `${Details.first_name} ${Details.last_name} liked  your Comment`,
                                                        notification_type: notification_type,
                                                        post_id: notification_details.post_id
                                                    }
                                                };
                                                notify_users.forEach(user => {
                                                    userCollection.findOne({ user_id: user })
                                                        .then(userDetails => {
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
                                                                type: "commentLike",
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
                                                                "Like",
                                                                pushData,
                                                                true,
                                                                email
                                                            );
                                                            // sendPush(
                                                            //     userDetails.firebase_token,
                                                            //     "Like",
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
                                            finalResponse.counts = totalCommentLikes;
                                            cb(null, finalResponse);
                                        });

                                    } else {
                                        let finalResponse = {};
                                        finalResponse.status = true;
                                        finalResponse.counts = totalCommentLikes;
                                        cb(null, finalResponse);
                                    }
                                });
                            } else {
                                postCollection.findOneAndUpdate({ post_id: validatedData.post_id }, { $inc: { like_count: 1 } }, async function (err, resp) {
                                    let requested_by = Number(req.body.user_id);
                                    let requested_to = resp.value.posted_by;
                                    if (requested_by !== requested_to) {
                                        let notification_details = {
                                            text_template: '{{USER_ID_' + requested_by + '}} liked  your post',
                                            post_id: validatedData.post_id
                                        };
                                        if (resp.value.posted_for === 'group') {
                                            notification_details.text_template = '{{USER_ID_' + requested_by + '}} liked your post in a Group';
                                        }
                                        let notification_type = 'post_like';
                                        let notify_users = [requested_to];
                                        let pushData = {};
                                        await userCollection.findOne({ user_id: requested_by })
                                            .then(Details => {
                                                pushData = {
                                                    status: "Like",
                                                    title: "Like on post",
                                                    body: `${Details.first_name} ${Details.last_name} liked  your post`,
                                                    sound: "default",
                                                    mutable_content: true,
                                                    content_available: true,
                                                    data: {
                                                        status: "Like",
                                                        message: `${Details.first_name} ${Details.last_name} liked  your post`,
                                                        notification_type: notification_type,
                                                        post_id: notification_details.post_id
                                                    }
                                                };
                                                notify_users.forEach(user => {
                                                    userCollection.findOne({ user_id: user })
                                                        .then(userDetails => {
                                                            var type = "postLike";
                                                            if (resp.value.posted_for === 'group') {
                                                                type = "groupPostLike";
                                                            }
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
                                                                type: type,
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
                                                                "Like",
                                                                pushData,
                                                                true,
                                                                email
                                                            );
                                                            // sendPush(
                                                            //     userDetails.firebase_token,
                                                            //     "Like",
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
                                            cb(null, finalResponse);
                                        });
                                    } else {
                                        let finalResponse = {};
                                        finalResponse.status = true;
                                        cb(null, finalResponse);
                                    }
                                });
                            }

                        }
                    });
                }
            });
        }
    });
};

module.exports.getAllUserLikes = async (client, req, res, cb) => {
    const { user_id } = req.authorization;
    const db = client.db(utility.dbName);
    const likesCollection = db.collection(Model.collection_name);

    if (!user_id) {
        return cb({ message: 'missing user id' });
    }

    console.log(req.authorization);

    likesCollection.aggregate([
        getPostDetails(),
        getStoryDetails(),
        getCommentDetails(),
        getMessageDetails(),
        likesProjection(),
        {
            $match: {
                $or: [
                    { 'postDetails.posted_by': user_id },
                    { 'storyDetails.posted_by': user_id },
                    { 'commentDetails.commented_by': user_id },
                    { 'messageDetails.from_id': user_id },
                ]
            }
        }
    ]).toArray((err, likeData) => {
        if (err) {
            return cb(err);
        }
        console.log('processing results...')
        console.log(likeData);
        const finalData = {
            status: true,
            message: 'like data fetched successfully',
            count: likeData.length,
            data: likeData
        };
        console.log(finalData);
        return cb(null, finalData);
    })
}

const getPostDetails = () => {
    console.log('Getting post details...')
    return {
        $lookup: {
            from: 'post',
            localField: 'post_id',
            foreignField: 'post_id',
            as: 'postDetails'
        }
    }
}

const getStoryDetails = () => {
    console.log('Getting story details...')
    return {
        $lookup: {
            from: 'storyline',
            localField: 'story_id',
            foreignField: 'story_id',
            as: 'storyDetails'
        }
    }
}

const getCommentDetails = () => {
    console.log('Getting comment details...')
    return {
        $lookup: {
            from: 'post_comment',
            localField: 'comment_id',
            foreignField: 'comment_id',
            as: 'commentDetails'
        }
    }
}

const getMessageDetails = () => {
    console.log('Getting message details...')
    return {
        $lookup: {
            from: 'message',
            localField: 'message_id',
            foreignField: 'message_id',
            as: 'messageDetails'
        }
    }
}

const likesProjection = () => {
    console.log('Projecting likes details...')
    return {
        $project: {
            post_id: 1,
            story_id: 1,
            message_id: 1,
            comment_id: 1,
            'postDetails': { $arrayElemAt: ['$postDetails', 0] },
            'storyDetails': { $arrayElemAt: ['$storyDetails', 0] },
            'commentDetails': { $arrayElemAt: ['$commentDetails', 0] },
            'messageDetails': { $arrayElemAt: ['$messageDetails', 0] }
        }
    }
}

const getUserDetails = (currentUser) => {
    console.log('Getting user details...')
    console.log(currentUser);
    return {
        $lookup: {
            from: 'user',
            let: {
                likedUser: '$postDetails.posted_by' || '$storyDetails.posted_by' || '$commentDetails.commented_by' || '$messageDetails.from_id' === currentUser ? '$messageDetails.from_id' : '$messageDetails.to_id'
            },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $eq: ["$user_id", "$$likedUser"]
                        }
                    }
                },
                {
                    $project: {
                        first_name: 1,
                        last_name: 1,
                        user_id: 1,
                        user_name: { $ifNull: ["$user_name", ""] },
                        profile_image_url: 1,
                        private: 1,
                    }
                }
            ],
            as: "userDetails"
        }
    };
};