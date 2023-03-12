'use strict';
const Model = require('./group.json');
const USER_MODEL = require('./user.json');
const POST_MODEL = require('./post.json');
let utility = require('../../utilities');
const EMAIL_HANDLER = require('../../_helpers/email-handler');
const { sendPush, sendPush2 } = require('../../_helpers/push-notification');


const NOTIFICATION = require('./notification.js');
/**
 * GET MY GROUP LIST
 * @param CLIENT
 * @param req
 * @param res
 * @param cb
 */
module.exports.getMyGroups = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let groupCollection = CONNECTION.collection(Model.collection_name);
    groupCollection.find({ group_status: 'active', group_admins: req.authorization.user_id }).sort({ group_id: -1 }).toArray((err, groupList) => {
        if (err) {
            cb(err);
        } else {
            groupList.forEach(group => {
                group.buttons = [{
                    button_type: 'delete',
                    button_link: '/groups/' + group.group_id,
                    button_request_type: 'delete'
                }];
            });
            let finalResponse = {};
            finalResponse.status = true;
            finalResponse.data = groupList;
            cb(null, finalResponse);
        }
    });
};


/**
 *  Get My Membership Group List
 * @param CLIENT
 * @param req
 * @param res
 * @param cb
 */
module.exports.getMembershipMyGroups = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let groupCollection = CONNECTION.collection(Model.collection_name);
    groupCollection.find({ group_status: 'active', group_members: req.authorization.user_id }).sort({ group_id: -1 }).toArray((err, groupList) => {
        if (err) {
            cb(err);
        } else {
            let finalResponse = {};
            finalResponse.status = true;
            finalResponse.data = groupList;
            cb(null, finalResponse);
        }
    });
};

/**
 * GET MY JOINED GROUPS
 * @param CLIENT
 * @param req
 * @param res
 * @param cb
 */
module.exports.getMyJoinedGroups = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let groupCollection = CONNECTION.collection(Model.collection_name);
    const currentUser = req.authorization.user_id;
    groupCollection
        .aggregate([
            {
                $match: {
                    group_status: 'active',
                    group_admins: { $ne: req.authorization.user_id },
                    group_members: req.authorization.user_id
                }
            },
            {
                $sort: {
                    group_id: -1
                }
            },
            {
                $lookup: {
                    from: 'user',
                    let: {
                        members: "$group_members"
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $in: ["$user_id", "$$members"]
                                }
                            }
                        },
                        {
                            $match: {
                                status: 'active'
                            }
                        },
                        {
                            $limit: 5
                        },
                        {
                            $project: {
                                first_name: 1,
                                last_name: 1,
                                profile_image_url: 1,
                                user_id: 1
                            }
                        }
                    ],
                    as: 'group_members_details'
                }
            }
        ])
        // .find({group_status: 'active', group_admins: {$ne: req.authorization.user_id}, $or: [{group_members: req.authorization.user_id}, {group_invited_members: req.authorization.user_id}]})
        .toArray((err, groupList) => {
            if (err) {
                cb(err);
            } else {
                groupList.forEach(group => {
                    if (group.group_members.indexOf(currentUser) !== -1) {
                        group.buttons = [{
                            button_type: 'leave',
                            button_link: '/groups/leave/' + group.group_id,
                            button_request_type: 'get'
                        }];
                    } else {
                        group.buttons = [{
                            button_type: 'accept',
                            button_link: '/groups/accept/' + group.group_id,
                            button_request_type: 'get'
                        }];
                    }

                });
                let finalResponse = {};
                finalResponse.status = true;
                finalResponse.data = groupList;
                cb(null, finalResponse);
            }
        });
};



/**
 * GET MY Invited GROUPS
 * @param CLIENT
 * @param req
 * @param res
 * @param cb
 */
module.exports.getMyInvitedGroups = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let groupCollection = CONNECTION.collection(Model.collection_name);
    const currentUser = req.authorization.user_id;
    groupCollection
        .aggregate([
            {
                $match: {
                    group_status: 'active',
                    group_admins: { $ne: req.authorization.user_id },
                    group_invited_members: req.authorization.user_id
                }
            },
            {
                $sort: {
                    group_id: -1
                }
            },
            {
                $lookup: {
                    from: 'user',
                    let: {
                        members: "$group_members"
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $in: ["$user_id", "$$members"]
                                }
                            }
                        },
                        {
                            $match: {
                                status: 'active'
                            }
                        },
                        {
                            $limit: 5
                        },
                        {
                            $project: {
                                first_name: 1,
                                last_name: 1,
                                profile_image_url: 1,
                                user_id: 1
                            }
                        }
                    ],
                    as: 'group_members_details'
                }
            }
        ])
        // .find({group_status: 'active', group_admins: {$ne: req.authorization.user_id}, $or: [{group_members: req.authorization.user_id}, {group_invited_members: req.authorization.user_id}]})
        .toArray((err, groupList) => {
            if (err) {
                cb(err);
            } else {
                groupList.forEach(group => {
                    if (group.group_members.indexOf(currentUser) !== -1) {
                        group.buttons = [{
                            button_type: 'leave',
                            button_link: '/groups/leave/' + group.group_id,
                            button_request_type: 'get'
                        }];
                    } else {
                        group.buttons = [{
                            button_type: 'accept',
                            button_link: '/groups/accept/' + group.group_id,
                            button_request_type: 'get'
                        }];
                    }

                });
                let finalResponse = {};
                finalResponse.status = true;
                finalResponse.data = groupList;
                cb(null, finalResponse);
            }
        });
};



/**
 * ADD NEW GROUP
 * @param CLIENT
 * @param req
 * @param res
 * @param cb
 */
module.exports.addGroup = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    const currentUser = req.authorization.user_id;
    let groupCollection = CONNECTION.collection(Model.collection_name);

    let newGroupData = utility.filterBody(req.body);
    if (newGroupData === {}) {
        return cb({ error: 'invalid data' }, false);
    }
    newGroupData.created_by = currentUser;
    newGroupData.group_admins = [currentUser];
    newGroupData.group_members = [currentUser];
    utility.validatePostData(CONNECTION, newGroupData, Model, 'insert', 0, function (err, validatedData) {
        if (err) {
            cb(err);
        } else {
            groupCollection.insertOne(validatedData, function (err, response) {
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


/**
 * EDIT GROUP
 * @param CLIENT
 * @param req
 * @param res
 * @param cb
 */
module.exports.editGroupDetails = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    const currentUser = req.authorization.user_id;
    let groupCollection = CONNECTION.collection(Model.collection_name);
    const group_id = Number(req.params.group_id);
    let body = utility.filterBody(req.body);
    let newGroupData = {};
    if (body.group_title) {
        newGroupData.group_title = body.group_title;
    }
    if (body.group_description) {
        newGroupData.group_description = body.group_description;
    }
    if (body.group_category) {
        newGroupData.group_category = body.group_category;
    }
    if (body.private === false) {
        newGroupData.private = false;
    }
    if (body.private === true) {
        newGroupData.private = true;
    }

    utility.validatePostData(CONNECTION, newGroupData, Model, 'update', group_id, function (err, validatedData) {
        if (err) {
            cb(err);
        } else {
            groupCollection.findOneAndUpdate({ group_id: group_id, group_admins: currentUser }, { $set: validatedData }, { returnOriginal: false }, function (err, response) {
                if (err) {
                    cb(err);
                } else {
                    let finalResponse = {};
                    finalResponse.status = true;
                    finalResponse.data = newGroupData;
                    cb(null, finalResponse);
                }
            });
        }
    });
};
/**
 * DELETE MY GROUP
 * @param CLIENT
 * @param req
 * @param res
 * @param cb
 */
module.exports.deleteMyGroup = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let groupCollection = CONNECTION.collection(Model.collection_name);
    const group_id = Number(req.params.group_id);
    groupCollection.deleteOne({ group_id: group_id, group_admins: req.authorization.user_id }, (err, deletedResponse) => {
        if (err) {
            cb(err);
        } else {
            let finalResponse = {};
            finalResponse.status = true;
            cb(null, finalResponse);
        }
    });
};

/**
 * Leave Group
 * @param CLIENT
 * @param req
 * @param res
 * @param cb
 */
module.exports.leaveOthersGroup = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let groupCollection = CONNECTION.collection(Model.collection_name);
    const group_id = Number(req.params.group_id);
    groupCollection.findOneAndUpdate({ group_id: group_id, group_admins: { $ne: req.authorization.user_id }, group_members: req.authorization.user_id }, { $pull: { group_members: req.authorization.user_id } }, (err, leaveData) => {
        if (err) {
            cb(err);
        } else {
            console.log(leaveData);
            let finalResponse = {};
            finalResponse.status = true;
            cb(null, finalResponse);
        }
    });
};

/**
 * SEND GROUP INVITATION
 * @param CLIENT
 * @param req
 * @param res
 * @param cb
 */
module.exports.sendGroupInvite = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let groupCollection = CONNECTION.collection(Model.collection_name);
    const userCollection = CONNECTION.collection(USER_MODEL.collection_name);
    const group_id = Number(req.params.group_id);
    const user_id = Number(req.params.user_id);
    utility.checkGroupMembership(CONNECTION, group_id, req.authorization.user_id, function (isMember) {
        if (isMember) {
            groupCollection.findOneAndUpdate({ group_id: group_id, group_members: { $ne: user_id }, group_invited_members: { $ne: user_id } }, { $push: { group_invited_members: user_id } }, (err, groupDetailsUpdate) => {
                if (err) {
                    cb(err);
                } else {
                    if (groupDetailsUpdate.value) {
                        const requested_by = req.authorization.user_id;
                        const requested_to = user_id;
                        // Email
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
                            EMAIL_HANDLER.sendGroupInvitationEmail(fromUser, toUser, groupDetailsUpdate.value);

                            let notification_details = {
                                text_template: '{{USER_ID_' + requested_by + '}} has invited you to join a Group',
                                group_id: group_id
                            };
                            let notification_type = 'group_invite';
                            let notify_users = [user_id];
                            await userCollection.findOne({ user_id: requested_by })
                                .then(Details => {
                                    let pushData = {
                                        status: "Group Invitation",
                                        title: "Group Invitation",
                                        body: `${Details.first_name} ${Details.last_name} has invited you to join a Group`,
                                        sound: "default",
                                        mutable_content: true,
                                        content_available: true,
                                        data: {
                                            status: "Group Invitation",
                                            message: `${Details.first_name} ${Details.last_name} has invited you to join a Group`,
                                            notification_type: notification_type,
                                            group_id: notification_details.group_id
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
                                                if(userDetails.isUnscribed) {
                                                    if(userDetails.isUnscribed==1) {
                                                        sendEmailVar = false;
                                                    }
                                                }
                                                let email = {
                                                    sendEmail: sendEmailVar,
                                                    group_id: notification_details.group_id,
                                                    type: "groupInvitation",
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
                                                    "Group Invitation",
                                                    pushData,
                                                    true,
                                                    email
                                                );
                                                // sendPush(
                                                //     userDetails.firebase_token,
                                                //     "Group Invitation",
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

                        });
                    } else {
                        let finalResponse = {};
                        finalResponse.status = true;
                        cb(null, finalResponse);
                    }

                }
            });
        } else {
            let error = new Error();
            error.name = 'PERMISSION_DENIED_ERROR';
            cb(error);
        }
    });

};

/**
 * Accept Invitation
 * @param CLIENT
 * @param req
 * @param res
 * @param cb
 */
module.exports.acceptGroupInvite = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let groupCollection = CONNECTION.collection(Model.collection_name);
    const userCollection = CONNECTION.collection(USER_MODEL.collection_name);
    const group_id = Number(req.params.group_id);
    groupCollection.findOneAndUpdate({ group_id: group_id, group_admins: { $ne: req.authorization.user_id }, group_members: { $ne: req.authorization.user_id }, group_invited_members: req.authorization.user_id }, { $push: { group_members: req.authorization.user_id }, $pull: { group_invited_members: req.authorization.user_id } }, async (err, acceptedResponse) => {
        if (err) {
            cb(err);
        } if (acceptedResponse) {
            console.log("acceptedResponse===>", acceptedResponse);
            const requested_by = req.authorization.user_id;
            let notification_details = {
                text_template: '{{USER_ID_' + requested_by + '}} has accepted your Group invitation',
                group_id: group_id
            };
            let notification_type = 'group_invite_accept';
            let notify_users = await acceptedResponse.value.group_admins;
            await userCollection.findOne({ user_id: requested_by })
                .then(Details => {
                    let pushData = {
                        status: "Group Invitation Accepted",
                        title: "Group Invitation Accepted",
                        body: `${Details.first_name} ${Details.last_name} has accepted your Group invitation`,
                        sound: "default",
                        mutable_content: true,
                        content_available: true,
                        data: {
                            status: "Group Invitation Accepted",
                            message: `${Details.first_name} ${Details.last_name} has accepted your Group invitation`,
                            notification_type: notification_type,
                            group_id: notification_details.group_id
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
                                if(userDetails.isUnscribed) {
                                    if(userDetails.isUnscribed==1) {
                                        sendEmailVar = false;
                                    }
                                }
                                let email = {
                                    sendEmail: sendEmailVar,
                                    group_id: notification_details.group_id,
                                    type: "groupInvitationAccepted",
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
                                    "Group Invitation Accepted",
                                    pushData,
                                    true,
                                    email
                                );
                                // sendPush(
                                //     userDetails.firebase_token,
                                //     "Group Invitation Accepted",
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
        }
    });
};

/**
 * Get Group Details
 * @param CLIENT
 * @param req
 * @param res
 * @param cb
 */
module.exports.getGroupDetails = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let groupCollection = CONNECTION.collection(Model.collection_name);
    const group_id = Number(req.params.group_id);
    groupCollection.findOne({ group_id: group_id, group_status: 'active' }, (err, groupDetails) => {
        if (err) {
            cb(err);
        } else {
            if (groupDetails) {
                if (groupDetails.group_members.indexOf(req.authorization.user_id) === -1) {
                    // Not a member yet
                    if (groupDetails.group_invited_members && groupDetails.group_invited_members.indexOf(req.authorization.user_id) !== -1) {
                        // Not invited Yet
                        groupDetails.membership_status = 'invited';
                    } else {
                        groupDetails.membership_status = null;
                    }
                } else {
                    groupDetails.membership_status = 'member';
                }
                // Admin
                groupDetails.admin = groupDetails.group_admins.indexOf(req.authorization.user_id) !== -1;

                const postCollection = CONNECTION.collection(POST_MODEL.collection_name);
                postCollection.countDocuments({ group_id: group_id }, function (err, count) {
                    groupDetails.post_count = count;
                    let finalResponse = {};
                    finalResponse.status = true;
                    finalResponse.data = groupDetails;
                    cb(null, finalResponse);
                });

            } else {
                let error = new Error();
                error.name = 'NOT_FOUND_ERROR';
                cb(error);
            }
        }
    });
};

module.exports.getMemberList = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let groupCollection = CONNECTION.collection(Model.collection_name);
    const userCollection = CONNECTION.collection(USER_MODEL.collection_name);
    const group_id = Number(req.params.group_id);
    groupCollection.findOne({ group_id: group_id }, (err, groupDetails) => {
        if (err) {
            cb(err);
        } else {
            if (groupDetails) {
                if (groupDetails.group_status == "active") {
                    var returnUsers = [];
                    userCollection.find({ "user_id": { $in: groupDetails.group_members } }, async (err, users) => {
                        if (err) {
                            cb(err);
                        } else {
                            await users.forEach(user => {
                                returnUsers.push({
                                    "first_name": user.first_name,
                                    "last_name": user.last_name,
                                    "profile_image_url": user.profile_image_url,
                                    "user_name": user.user_name != null ? user.user_name : "",
                                    "user_id": user.user_id,
                                    "admin": groupDetails.group_admins.indexOf(user.user_id) !== -1
                                });
                            });
                            let finalResponse = {};
                            finalResponse.status = true;
                            finalResponse.data = returnUsers;
                            cb(null, finalResponse);
                        }
                    });
                } else {
                    let error = new Error();
                    error.name = 'NOT_FOUND_ERROR';
                    cb(error);
                }
            } else {
                let error = new Error();
                error.name = 'NOT_FOUND_ERROR';
                cb(error);
            }
        }
    });
};


module.exports.getFriendListForGroupInvitation = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let groupCollection = CONNECTION.collection(Model.collection_name);
    const group_id = Number(req.params.group_id);
    const currentUser = req.authorization.user_id;
    groupCollection.findOne({ group_id: group_id, group_status: 'active', group_members: currentUser }, (err, groupDetails) => {
        if (err) {
            cb(err);
        } else {
            if (groupDetails) {
                let alreadyMembers = groupDetails.group_members || [];
                let invitationSent = groupDetails.group_invited_members || [];
                const userCollection = CONNECTION.collection(USER_MODEL.collection_name);
                userCollection.findOne({ user_id: currentUser }, function (err, myDetails) {
                    if (err) {
                        cb(err);
                    } else {
                        let friendIds = myDetails.follower_ids || [];
                        friendIds = utility.subtractArrays(friendIds, alreadyMembers);
                        userCollection.find({ user_id: { $in: friendIds } }, { projection: { password: 0 } }).toArray((err, users) => {
                            if (err) {
                                cb(err);
                            } else {
                                let finalUserList = [];
                                users.forEach(user => {
                                    let tmpUser = {};
                                    tmpUser.user_id = user.user_id;
                                    tmpUser.first_name = user.first_name;
                                    tmpUser.last_name = user.last_name;
                                    tmpUser.profile_image_url = user.profile_image_url;
                                    if (invitationSent.indexOf(user.user_id) === -1) {
                                        tmpUser.button = {
                                            button_type: 'invite',
                                            button_text: 'Invite',
                                            button_link: '/groups/' + group_id + '/invite/' + user.user_id
                                        };
                                    } else {
                                        tmpUser.button = {
                                            button_type: 'sent',
                                            button_text: 'Sent',
                                        };
                                    }

                                    finalUserList.push(tmpUser);
                                });

                                let finalResponse = {};
                                finalResponse.status = true;
                                finalResponse.data = finalUserList;
                                cb(null, finalResponse);
                            }
                        });
                    }
                });
            } else {
                let error = new Error();
                error.name = 'PERMISSION_DENIED_ERROR';
                cb(error);
            }
        }
    });
};



/**
 * Find Groups LIST
 * @param CLIENT
 * @param req
 * @param res
 * @param cb
 */
module.exports.findGroups = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let user_id = req.authorization.user_id;
    let groupCollection = CONNECTION.collection(Model.collection_name);
    groupCollection.find({
        group_status: 'active',
        $and: [
            {
                $or: [
                    { private: false },
                    { private: true, group_members: user_id }
                ]
            },
            {
                $or: [
                    { group_title: new RegExp(req.query.search, "i") },
                    { group_category: new RegExp(req.query.search, "i") }
                ]
            }
        ]
    }).sort({ group_id: -1 }).toArray((err, groupList) => {
        if (err) {
            cb(err);
        } else {
            groupList.forEach(group => {
                if (group.group_members.indexOf(user_id) === -1) {
                    group.request_buttons = [{
                        button_type: 'success',
                        button_link: '/groups/join/' + group.group_id,
                        button_text: 'Join Group'
                    }];
                } else if (group.group_admins.indexOf(user_id) !== -1) {
                    group.request_buttons = [{
                        button_type: 'danger',
                        button_link: '#',
                        button_text: 'Group Admin'
                    }];
                } else {
                    group.request_buttons = [{
                        button_type: 'danger',
                        button_link: '/groups/leave/' + group.group_id,
                        button_text: 'Leave Group'
                    }];
                }
            });
            let finalResponse = {};
            finalResponse.status = true;
            finalResponse.data = groupList;
            cb(null, finalResponse);
        }
    });
};



/**
 * Join Group
 * @param CLIENT
 * @param req
 * @param res
 * @param cb
 */
module.exports.joinGroup = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let groupCollection = CONNECTION.collection(Model.collection_name);
    const userCollection = CONNECTION.collection(USER_MODEL.collection_name);
    const group_id = Number(req.params.group_id);
    groupCollection.findOneAndUpdate({ group_id: group_id, private: false, group_admins: { $ne: req.authorization.user_id }, group_members: { $ne: req.authorization.user_id } }, { $push: { group_members: req.authorization.user_id }, $pull: { group_invited_members: req.authorization.user_id } }, async (err, acceptedResponse) => {
        if (err) {
            cb(err);
        } else {
            console.log(acceptedResponse);
            if (acceptedResponse.value) {
                const requested_by = req.authorization.user_id;
                let notification_details = {
                    text_template: '{{USER_ID_' + requested_by + '}} has Joined your Group',
                    group_id: group_id
                };
                let notification_type = 'group_invite_accept';
                let notify_users = acceptedResponse.value.group_admins;
                await userCollection.findOne({ user_id: requested_by })
                    .then(Details => {
                        let pushData = {
                            status: "Group Invitation Accepted",
                            title: "Group Invitation Accepted",
                            body: `${Details.first_name} ${Details.last_name} has Joined your Group`,
                            sound: "default",
                            mutable_content: true,
                            content_available: true,
                            data: {
                                status: "Group Invitation Accepted",
                                message: `${Details.first_name} ${Details.last_name} has Joined your Group`,
                                notification_type: notification_type,
                                group_id: notification_details.group_id
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
                                    if(userDetails.isUnscribed) {
                                        if(userDetails.isUnscribed==1) {
                                            sendEmailVar = false;
                                        }
                                    }
                                    let email = {
                                        sendEmail: sendEmailVar,
                                        group_id: notification_details.group_id,
                                        type: "groupInvitationAccepted",
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
                                        "Group Invitation Accepted",
                                        pushData,
                                        true,
                                        email
                                    );
                                    // sendPush(
                                    //     userDetails.firebase_token,
                                    //     "Group Invitation Accepted",
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
                let error = new Error();
                error.name = 'PERMISSION_DENIED_ERROR';
                cb(error);
            }

        }
    });
};
