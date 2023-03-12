'use strict'
const Model = require('./post_comment.json');
let utility = require('../../utilities');
const { sendPush, sendPush2 } = require('../../_helpers/push-notification');

const POST_MODEL = require('./post.json');
const STORY_MODEL = require('./storyline.json');

const NOTIFICATION = require('./notification.js');
const commentValidator = require('../../validators/v2/comment');

module.exports.getPostComment = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let postCommentCollection = CONNECTION.collection(Model.collection_name);
    postCommentCollection.find({}).toArray((err, postCommentList) => {
        if (err) {
            cb(err);
        } else {
            let finalResponse = {};
            finalResponse.status = true;
            finalResponse.data = postCommentList;
            cb(null, finalResponse);
        }
    });
};

module.exports.addPostComment = async function (CLIENT, req, res, cb) {
  // validate request body
  try {
      await commentValidator.validateAsync(req.body);
  } catch (error) {
      const vErr = new Error();
      vErr.name = error.name,
      vErr.message = error.message;
  }
    req.body.story_id = Number(req.body.story_id);
    if (req.body.comment_parent_id) {
        req.body.comment_parent_id = Number(req.body.comment_parent_id);
    }
    let CONNECTION = CLIENT.db(utility.dbName);
    let postCommentCollection = CONNECTION.collection(Model.collection_name);
    let postCollection = CONNECTION.collection(POST_MODEL.collection_name);
    let newPostCommentData = utility.filterBody(req.body);
    if (newPostCommentData === {}) {
        return cb({ error: 'invalid data' }, false);
    }
    newPostCommentData.commented_by = req.authorization.user_id;
    utility.validatePostData(CONNECTION, newPostCommentData, Model, 'insert', 0, function (err, validatedData) {
        if (err) {
            cb(err);
        } else {
            postCommentCollection.insertOne(validatedData, function (err, response) {
                if (err) {
                    cb(err);
                } else {
                    // console.log(response.ops);
                    postCollection.findOneAndUpdate({ post_id: validatedData.post_id }, { $inc: { comment_count: 1 } }, async function (err, resp) {
                        // Success, Now Send Notification
                        // console.log(resp);
                        let requested_by = req.authorization.user_id;
                        let requested_to = resp.value.posted_by;

                        /* Add image to notification */
                        var postImagePath = "";
                        if(resp.value.post_type=="image") {
                            if(resp.value.post_image) {
                                if(resp.value.post_image[0]) {
                                postImagePath = resp.value.post_image[0];
                                }
                            }
                        } else if(resp.value.post_type=="video") {
                            if(resp.value.thumbnail) {
                                postImagePath = resp.value.thumbnail;
                            }
                        }
                        if(postImagePath!="") {
                            postImagePath = "https://cdn.staging.afrocamgist.com/" + postImagePath;
                        }
                        /* ========================= */

                        if (requested_to !== requested_by) {
                            let notification_details = {
                                text_template: '{{USER_ID_' + requested_by + '}} commented on your post',
                                post_id: validatedData.post_id
                            };
                            if (validatedData.comment_parent_id > 0) {
                                notification_details.text_template = '{{USER_ID_' + requested_by + '}} replied to your comment';
                            }
                            if (resp.value.posted_for === 'group') {
                                notification_details.text_template = '{{USER_ID_' + requested_by + '}} commented on your post in a Group';
                            }
                            let notification_type = 'post_comment';
                            let notify_users = [requested_to];
                            const userModel = require('./user.json');
                            let userCollection = CONNECTION.collection(userModel.collection_name);
                            await userCollection.findOne({ user_id: req.authorization.user_id })
                                .then(Details => {
                                    let pushData = {
                                        status: "Post Comment",
                                        title: "Post Comment",
                                        body: `${Details.first_name} ${Details.last_name} commented on your post`,
                                        image: postImagePath,
                                        sound: "default",
                                        mutable_content: true,
                                        content_available: true,
                                        data: {
                                            status: "Post Comment",
                                            message: `${Details.first_name} ${Details.last_name} commented on your post`,
                                            image: postImagePath,
                                            notification_type: notification_type,
                                            post_id: notification_details.post_id
                                        }
                                    };
                                    if (validatedData.comment_parent_id > 0) {
                                        pushData.body = `${Details.first_name} ${Details.last_name} replied to your comment`;
                                        pushData.data.message = `${Details.first_name} ${Details.last_name} replied to your comment`;
                                    }
                                    if (resp.value.posted_for === 'group') {
                                        pushData.body = `${Details.first_name} ${Details.last_name} commented on your post in a Group`;
                                        pushData.data.message = `${Details.first_name} ${Details.last_name} commented on your post in a Group`;
                                    }
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
                                                if(userDetails.isUnscribed) {
                                                    if(userDetails.isUnscribed==1) {
                                                        sendEmailVar = false;
                                                    }
                                                }
                                                let email = {
                                                    sendEmail: sendEmailVar,
                                                    message: emailMessage,
                                                    post_id: notification_details.post_id,
                                                    type: "postComment",
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
                                                    "Post Comment",
                                                    pushData,
                                                    true,
                                                    email
                                                );
                                                // sendPush(
                                                //     userDetails.firebase_token,
                                                //     "Post Comment",
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
                                finalResponse.data = validatedData;
                                cb(null, finalResponse);
                            });
                        } else {
                            let finalResponse = {};
                            finalResponse.status = true;
                            finalResponse.data = validatedData;
                            cb(null, finalResponse);
                        }

                    });
                }
            });
        }
    });
};

module.exports.editPostComment = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let postCommentCollection = CONNECTION.collection(Model.collection_name);
    let body = utility.filterBody(req.body);
    if (body === {}) {
        return cb({ error: 'invalid data' }, false);
    }
    const comment_id = Number(req.params.comment_id);
    utility.validatePostData(CONNECTION, body, Model, 'update', comment_id, function (err, validatedData) {
        if (err) {
            cb(err);
        } else {
            postCommentCollection.findOneAndUpdate({ comment_id: comment_id, commented_by: req.authorization.user_id }, { $set: validatedData }, function (err, response) {
                if (err) {
                    cb(err);
                } else {
                    let finalResponse = {};
                    finalResponse.status = true;
                    finalResponse.data = response.value;
                    cb(null, finalResponse);
                }
            });
        }
    });
};

module.exports.deletePostComment = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let postCommentCollection = CONNECTION.collection(Model.collection_name);
    const comment_id = Number(req.params.comment_id);
    postCommentCollection.findOneAndDelete({ comment_id: comment_id, commented_by: req.authorization.user_id }, function (err, response) {
        if (err) {
            cb(err);
        } else {
            postCommentCollection.deleteMany({ comment_parent_id: comment_id }, function (err, deleted) {
                let totalDeletedCount = 1 + deleted.deletedCount;
                let postCollection = CONNECTION.collection(POST_MODEL.collection_name);
                postCollection.findOneAndUpdate({ post_id: response.value.post_id }, { $inc: { comment_count: -totalDeletedCount } }, { returnOriginal: false }, function (err, resp) {
                    let finalResponse = {};
                    finalResponse.status = true;
                    finalResponse.data = { comment_count: resp.value.comment_count };
                    cb(null, finalResponse);
                });
            });
        }
    });
};

/* Story comment */
module.exports.addStoryComment = function (CLIENT, req, res, cb) {
    req.body.story_id = parseInt(req.body.story_id);
    if (req.body.comment_parent_id) {
        req.body.comment_parent_id = Number(req.body.comment_parent_id);
    }
    let CONNECTION = CLIENT.db(utility.dbName);
    let postCommentCollection = CONNECTION.collection(Model.collection_name);
    let storyCollection = CONNECTION.collection(STORY_MODEL.collection_name);
    let newPostCommentData = utility.filterBody(req.body);
    if (newPostCommentData === {}) {
        return cb({ error: 'invalid data' }, false);
    }
    newPostCommentData.commented_by = req.authorization.user_id;

    utility.validatePostData(CONNECTION, newPostCommentData, Model, 'insert', 0, function (err, validatedData) {
        if (err) {
            cb(err);
        } else {
            postCommentCollection.insertOne(validatedData, function (err, response) {
                if (err) {
                    cb(err);
                } else {
                    storyCollection.findOneAndUpdate({ story_id: validatedData.story_id }, { $inc: { comment_count: 1 } }, async function (err, resp) {
                        // let requested_by = req.authorization.user_id;
                        // let requested_to = resp.value.posted_by;
                        // if (requested_to !== requested_by) {
                        //     let notification_details = {
                        //         text_template: '{{USER_ID_' + requested_by + '}} commented on your storyline',
                        //         story_id: validatedData.story_id
                        //     };
                        //     if (validatedData.comment_parent_id > 0) {
                        //         notification_details.text_template = '{{USER_ID_' + requested_by + '}} replied to your comment';
                        //     }
                        //     let notification_type = 'storyline_comment';
                        //     let notify_users = [requested_to];
                        //     const userModel = require('./user.json');
                        //     let userCollection = CONNECTION.collection(userModel.collection_name);
                        //     await userCollection.findOne({ user_id: req.authorization.user_id })
                        //         .then(Details => {
                        //             let pushData = {
                        //                 status: "Storyline Comment",
                        //                 title: "Storyline Comment",
                        //                 body: `${Details.first_name} ${Details.last_name} commented on your storyline`,
                        //                 sound: "default",
                        //                 mutable_content: true,
                        //                 content_available: true,
                        //                 data: {
                        //                     status: "Storyline Comment",
                        //                     message: `${Details.first_name} ${Details.last_name} commented on your storyline`,
                        //                     notification_type: notification_type,
                        //                     post_id: notification_details.post_id
                        //                 }
                        //             };
                        //             if (validatedData.comment_parent_id > 0) {
                        //                 pushData.body = `${Details.first_name} ${Details.last_name} replied to your comment`;
                        //                 pushData.data.message = `${Details.first_name} ${Details.last_name} replied to your comment`;
                        //             }
                        //             notify_users.forEach(user => {
                        //                 userCollection.findOne({ user_id: user })
                        //                     .then(userDetails => {
                        //                         sendPush(
                        //                             userDetails.firebase_token,
                        //                             "Post Comment",
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
                        //         finalResponse.data = response.ops[0];
                        //         cb(null, finalResponse);
                        //     });
                        // } else {
                        //     let finalResponse = {};
                        //     finalResponse.status = true;
                        //     finalResponse.data = response.ops[0];
                        //     cb(null, finalResponse);
                        // }
                        let finalResponse = {};
                        finalResponse.status = true;
                        finalResponse.data = validatedData;
                        cb(null, finalResponse);
                    });
                }
            });
        }
    });
};

module.exports.editStoryComment = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let postCommentCollection = CONNECTION.collection(Model.collection_name);
    let body = utility.filterBody(req.body);
    if (body === {}) {
        return cb({ error: 'invalid data' }, false);
    }
    const comment_id = Number(req.params.comment_id);
    utility.validatePostData(CONNECTION, body, Model, 'update', comment_id, function (err, validatedData) {
        if (err) {
            cb(err);
        } else {
            postCommentCollection.findOneAndUpdate({ comment_id: comment_id, commented_by: req.authorization.user_id }, { $set: validatedData }, function (err, response) {
                if (err) {
                    cb(err);
                } else {
                    let finalResponse = {};
                    finalResponse.status = true;
                    finalResponse.data = response.value;
                    cb(null, finalResponse);
                }
            });
        }
    });
};

module.exports.deleteStoryComment = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let postCommentCollection = CONNECTION.collection(Model.collection_name);
    let storyCollection = CONNECTION.collection(STORY_MODEL.collection_name);
    const comment_id = Number(req.params.comment_id);
    postCommentCollection.findOneAndDelete({ comment_id: comment_id, commented_by: req.authorization.user_id }, function (err, response) {
        if (err) {
            cb(err);
        } else {
            postCommentCollection.deleteMany({ comment_parent_id: comment_id }, function (err, deleted) {
                let totalDeletedCount = 1 + deleted.deletedCount;
                storyCollection.findOneAndUpdate({ story_id: response.value.story_id }, { $inc: { comment_count: -totalDeletedCount } }, { returnOriginal: false }, function (err, resp) {
                    let finalResponse = {};
                    finalResponse.status = true;
                    finalResponse.data = { comment_count: resp.value.comment_count };
                    cb(null, finalResponse);
                });
            });
        }
    });
};

/**
 * Comment for open user
 */
module.exports.addPostCommentOpen = function (CLIENT, req, res, cb) {
    req.body.post_id = Number(req.body.post_id);
    let CONNECTION = CLIENT.db(utility.dbName);
    let postCommentCollection = CONNECTION.collection(Model.collection_name);
    let postCollection = CONNECTION.collection(POST_MODEL.collection_name);
    let newPostCommentData = utility.filterBody(req.body);
    if (newPostCommentData === {}) {
        return cb({ error: 'invalid data' }, false);
    }
    newPostCommentData.commented_by = Number(req.body.user_id);
    if (req.body.user_id) {
        delete newPostCommentData.user_id;
    }
    if (req.body.comment_parent_id) {
        newPostCommentData.comment_parent_id = Number(req.body.comment_parent_id);
    }
    utility.validatePostData(CONNECTION, newPostCommentData, Model, 'insert', 0, function (err, validatedData) {
        if (err) {
            cb(err);
        } else {
            postCommentCollection.insertOne(validatedData, function (err, response) {
                if (err) {
                    cb(err);
                } else {
                    // console.log(response.ops);
                    postCollection.findOneAndUpdate({ post_id: validatedData.post_id }, { $inc: { comment_count: 1 } }, async function (err, resp) {
                        // Success, Now Send Notification
                        // console.log(resp);
                        let requested_by = Number(req.body.user_id);
                        let requested_to = resp.value.posted_by;
                        if (requested_to !== requested_by) {
                            let notification_details = {
                                text_template: '{{USER_ID_' + requested_by + '}} commented on your post',
                                post_id: validatedData.post_id
                            };
                            if (validatedData.comment_parent_id > 0) {
                                notification_details.text_template = '{{USER_ID_' + requested_by + '}} replied to your comment';
                            }
                            if (resp.value.posted_for === 'group') {
                                notification_details.text_template = '{{USER_ID_' + requested_by + '}} commented on your post in a Group';
                            }
                            let notification_type = 'post_comment';
                            let notify_users = [requested_to];
                            const userModel = require('./user.json');
                            let userCollection = CONNECTION.collection(userModel.collection_name);
                            await userCollection.findOne({ user_id: Number(req.body.user_id) })
                                .then(Details => {
                                    let pushData = {
                                        status: "Post Comment",
                                        title: "Post Comment",
                                        body: `${Details.first_name} ${Details.last_name} commented on your post`,
                                        sound: "default",
                                        mutable_content: true,
                                        content_available: true,
                                        data: {
                                            status: "Post Comment",
                                            message: `${Details.first_name} ${Details.last_name} commented on your post`,
                                            notification_type: notification_type,
                                            post_id: notification_details.post_id
                                        }
                                    };
                                    var emailMessage = " commented on your post";
                                    if (validatedData.comment_parent_id > 0) {
                                        pushData.body = `${Details.first_name} ${Details.last_name} replied to your comment`;
                                        pushData.data.message = `${Details.first_name} ${Details.last_name} replied to your comment`;
                                        emailMessage = " replied to your comment";
                                    }
                                    if (resp.value.posted_for === 'group') {
                                        pushData.body = `${Details.first_name} ${Details.last_name} commented on your post in a Group`;
                                        pushData.data.message = `${Details.first_name} ${Details.last_name} commented on your post in a Group`;
                                        emailMessage = " commented on your post in a Group";
                                    }
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
                                                if(userDetails.isUnscribed) {
                                                    if(userDetails.isUnscribed==1) {
                                                        sendEmailVar = false;
                                                    }
                                                }
                                                let email = {
                                                    sendEmail: sendEmailVar,
                                                    message: emailMessage,
                                                    post_id: notification_details.post_id,
                                                    type: "postComment",
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
                                                    "Post Comment",
                                                    pushData,
                                                    true,
                                                    email
                                                );
                                                // sendPush(
                                                //     userDetails.firebase_token,
                                                //     "Post Comment",
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
                                finalResponse.data = validatedData;
                                cb(null, finalResponse);
                            });
                        } else {
                            let finalResponse = {};
                            finalResponse.status = true;
                            finalResponse.data = validatedData;
                            cb(null, finalResponse);
                        }

                    });
                }
            });
        }
    });
};

module.exports.editPostCommentOpen = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let postCommentCollection = CONNECTION.collection(Model.collection_name);
    let body = utility.filterBody(req.body);
    if (body === {}) {
        return cb({ error: 'invalid data' }, false);
    }
    const comment_id = Number(req.params.comment_id);
    const commented_by = Number(req.body.user_id);
    delete body.user_id;
    utility.validatePostData(CONNECTION, body, Model, 'update', comment_id, function (err, validatedData) {
        if (err) {
            cb(err);
        } else {
            postCommentCollection.findOneAndUpdate({ comment_id: comment_id, commented_by: commented_by }, { $set: validatedData }, function (err, response) {
                if (err) {
                    cb(err);
                } else {
                    let finalResponse = {};
                    finalResponse.status = true;
                    finalResponse.data = response.value;
                    cb(null, finalResponse);
                }
            });
        }
    });
};

module.exports.deletePostCommentOpen = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let postCommentCollection = CONNECTION.collection(Model.collection_name);
    const comment_id = Number(req.params.comment_id);
    const commented_by = Number(req.body.user_id);
    postCommentCollection.findOneAndDelete({ comment_id: comment_id, commented_by: commented_by }, function (err, response) {
        if (err) {
            cb(err);
        } else {
            postCommentCollection.deleteMany({ comment_parent_id: comment_id }, function (err, deleted) {
                let totalDeletedCount = 1 + deleted.deletedCount;
                let postCollection = CONNECTION.collection(POST_MODEL.collection_name);
                postCollection.findOneAndUpdate({ post_id: response.value.post_id }, { $inc: { comment_count: -totalDeletedCount } }, { returnOriginal: false }, function (err, resp) {
                    let finalResponse = {};
                    finalResponse.status = true;
                    finalResponse.data = { comment_count: resp.value.comment_count };
                    cb(null, finalResponse);
                });
            });
        }
    });
};