'use strict';
let utility = require('../utilities');
const messageGroupModel = require('./message_group.json');
const messageGroupMemberModel = require('./message_group_members.json');
const USER_MODEL = require('./user.json');

module.exports.addMemberToMessageGroup = function(CLIENT, req, res, cb) { 
    let CONNECTION = CLIENT.db(utility.dbName);
    let messageGroupCollection = CONNECTION.collection(messageGroupModel.collection_name);
    let messageGroupMemberCollection = CONNECTION.collection(messageGroupMemberModel.collection_name);

    const groupId = Number(req.body.group_id) || 0;
    const userId = Number(req.authorization.user_id) || 0;
    const memberId = Number(req.body.member_id) || 0;
    const isAdmin = req.body.is_admin || false;
    
    /* CHECK GROUP AVAILABLE OR NOT */
    messageGroupCollection.findOne({ message_group_id: groupId }, function (err, group) { 
        if (err) {
            cb(err);
        } else {
            var finalResponse = {};
            finalResponse.status = false;
            if(group) {
                /* CHECK MEMBER IS AVAILABLE IN THIS GROUP AND HE/SHE HAVE ADMIN ACCESS */
                var condition = {
                    member_id : userId,
                    is_admin : true,
                    group_id : groupId
                };
                messageGroupMemberCollection.findOne(condition, function(err, member) {
                    if (err) {
                        cb(err);
                    } else {
                        if(member) {
                            /* CHECK IF MEMBER IS ALREADY MEMBER */
                            messageGroupMemberCollection.findOne({ member_id: memberId, group_id: groupId }, function(err, memberIsThere) {
                                if(memberIsThere) {
                                    let error = {};
                                    error.message = "Member already in group"
                                    error.name = "VALIDATION_ERROR";
                                    finalResponse.error = error;
                                    cb(null, finalResponse);
                                } else {
                                    const memberData = {
                                        member_id: memberId,
                                        group_id: groupId,
                                        is_admin: isAdmin
                                    }
                                    /* VALIDATE DATA */
                                    utility.validatePostData(CONNECTION, memberData, messageGroupMemberModel, 'insert', 0, function (err, validatedData2) {
                                        /* CREATE RECORD */
                                        messageGroupMemberCollection.insertOne(validatedData2, function (err, memberCreated) {
                                            if(err) {
                                                cb(err);
                                            } else {
                                                if(memberCreated) {
                                                    /* INCREASE MEMBER COUNTER */
                                                    messageGroupCollection.findOneAndUpdate({ message_group_id: groupId }, { $inc: { members: 1 } }, async function (err, resp) {
                                                        finalResponse.status = true;
                                                        finalResponse.result = validatedData2;
                                                        cb(null, finalResponse);
                                                    });
                                                } else {
                                                    let error = {};
                                                    error.message = "Something went wrong to create user"
                                                    error.name = "VALIDATION_ERROR";
                                                    finalResponse.error = error;
                                                    cb(null, finalResponse);
                                                }
                                            }
                                        });
                                    });
                                }
                            });                            
                        } else {
                            let error = {};
                            error.message = "Admin user not exists"
                            error.name = "VALIDATION_ERROR";
                            finalResponse.error = error;
                            cb(null, finalResponse);
                        }
                    }
                });
            } else {
                let error = {};
                error.message = "Group not exists"
                error.name = "VALIDATION_ERROR";
                finalResponse.error = error;
                cb(null, finalResponse);
            }
        }
    });
};

module.exports.removeMemberFromMessageGroup = function(CLIENT, req, res, cb) { 
    let CONNECTION = CLIENT.db(utility.dbName);
    let messageGroupCollection = CONNECTION.collection(messageGroupModel.collection_name);
    let messageGroupMemberCollection = CONNECTION.collection(messageGroupMemberModel.collection_name);

    const groupId = Number(req.body.group_id) || 0;
    const userId = Number(req.authorization.user_id) || 0;
    const memberId = Number(req.body.member_id) || 0;
    
    /* CHECK GROUP AVAILABLE OR NOT */
    messageGroupCollection.findOne({ message_group_id: groupId }, function (err, group) { 
        if (err) {
            cb(err);
        } else {
            var finalResponse = {};
            finalResponse.status = false;
            if(group) {
                /* CHECK MEMBER IS AVAILABLE IN THIS GROUP AND HE/SHE HAVE ADMIN ACCESS */
                var condition = {};
                if(userId==memberId) {
                    condition.member_id = userId;
                    condition.group_id = groupId;
                } else {
                    condition.member_id= userId;
                    condition.is_admin = true;
                    condition.group_id = groupId;
                }
                messageGroupMemberCollection.findOne(condition, function(err, member) {
                    if (err) {
                        cb(err);
                    } else {
                        if(member) {
                            const memberData = {
                                member_id: memberId,
                                group_id: groupId
                            }
                            /* CREATE RECORD */
                            messageGroupMemberCollection.deleteOne( memberData, function (err, memberDeleted) {
                                if(err) {
                                    cb(err);
                                } else {
                                    if(memberDeleted) {
                                        /* INCREASE MEMBER COUNTER */
                                        messageGroupCollection.findOneAndUpdate({ message_group_id: groupId }, { $inc: { members: -1 } }, async function (err, resp) {
                                            finalResponse.status = true;
                                            // finalResponse.result = memberDeleted;
                                            cb(null, finalResponse);
                                        });
                                    } else {
                                        let error = {};
                                        error.message = "Something went wrong to delete user"
                                        error.name = "VALIDATION_ERROR";
                                        finalResponse.error = error;
                                        cb(null, finalResponse);
                                    }
                                }
                            });                           
                        } else {
                            let error = {};
                            error.message = "Admin user not exists"
                            error.name = "VALIDATION_ERROR";
                            finalResponse.error = error;
                            cb(null, finalResponse);
                        }
                    }
                });
            } else {
                let error = {};
                error.message = "Group not exists"
                error.name = "VALIDATION_ERROR";
                finalResponse.error = error;
                cb(null, finalResponse);
            }
        }
    });
};

module.exports.markMemberAsAdmin = function(CLIENT, req, res, cb) { 
    let CONNECTION = CLIENT.db(utility.dbName);
    let messageGroupCollection = CONNECTION.collection(messageGroupModel.collection_name);
    let messageGroupMemberCollection = CONNECTION.collection(messageGroupMemberModel.collection_name);

    const groupId = Number(req.body.group_id) || 0;
    const userId = Number(req.authorization.user_id) || 0;
    const memberId = Number(req.body.member_id) || 0;
    
    /* CHECK GROUP AVAILABLE OR NOT */
    messageGroupCollection.findOne({ message_group_id: groupId }, function (err, group) { 
        if (err) {
            cb(err);
        } else {
            var finalResponse = {};
            finalResponse.status = false;
            if(group) {
                /* CHECK MEMBER IS AVAILABLE IN THIS GROUP AND HE/SHE HAVE ADMIN ACCESS */
                var condition = {
                    member_id : userId,
                    is_admin : true,
                    group_id : groupId
                };
                messageGroupMemberCollection.findOne(condition, function(err, member) {
                    if (err) {
                        cb(err);
                    } else {
                        if(member) {
                            const memberData = {
                                is_admin: true
                            }
                            /* VALIDATE DATA */
                            utility.validatePostData(CONNECTION, memberData, messageGroupMemberModel, 'update', 0, function (err, updateMember) {
                                /* UPDATE MEMBER AS ADMIN */
                                const condition = {
                                    member_id : memberId,
                                    group_id : groupId
                                }
                                messageGroupMemberCollection.findOneAndUpdate(condition, { $set: updateMember }, async function (err, resp) {
                                    finalResponse.status = true;
                                    // finalResponse.result = memberDeleted;
                                    cb(null, finalResponse);
                                });
                            });                            
                        } else {
                            let error = {};
                            error.message = "Admin user not exists"
                            error.name = "VALIDATION_ERROR";
                            finalResponse.error = error;
                            cb(null, finalResponse);
                        }
                    }
                });
            } else {
                let error = {};
                error.message = "Group not exists"
                error.name = "VALIDATION_ERROR";
                finalResponse.error = error;
                cb(null, finalResponse);
            }
        }
    });
};

module.exports.removeMemberFromAdmin = function(CLIENT, req, res, cb) { 
    let CONNECTION = CLIENT.db(utility.dbName);
    let messageGroupCollection = CONNECTION.collection(messageGroupModel.collection_name);
    let messageGroupMemberCollection = CONNECTION.collection(messageGroupMemberModel.collection_name);

    const groupId = Number(req.body.group_id) || 0;
    const userId = Number(req.authorization.user_id) || 0;
    const memberId = Number(req.body.member_id) || 0;
    
    /* CHECK GROUP AVAILABLE OR NOT */
    messageGroupCollection.findOne({ message_group_id: groupId }, function (err, group) { 
        if (err) {
            cb(err);
        } else {
            var finalResponse = {};
            finalResponse.status = false;
            if(group) {
                /* CHECK MEMBER IS AVAILABLE IN THIS GROUP AND HE/SHE HAVE ADMIN ACCESS */
                var condition = {
                    member_id : userId,
                    is_admin : true,
                    group_id : groupId
                };
                messageGroupMemberCollection.findOne(condition, function(err, member) {
                    if (err) {
                        cb(err);
                    } else {
                        if(member) {
                            const memberData = {
                                is_admin: false
                            }
                            /* VALIDATE DATA */
                            utility.validatePostData(CONNECTION, memberData, messageGroupMemberModel, 'update', 0, function (err, updateMember) {
                                /* UPDATE MEMBER AS ADMIN */
                                const condition = {
                                    member_id : memberId,
                                    group_id : groupId
                                }
                                messageGroupMemberCollection.findOneAndUpdate(condition, { $set: updateMember }, async function (err, resp) {
                                    finalResponse.status = true;
                                    // finalResponse.result = memberDeleted;
                                    cb(null, finalResponse);
                                });
                            });                            
                        } else {
                            let error = {};
                            error.message = "Admin user not exists"
                            error.name = "VALIDATION_ERROR";
                            finalResponse.error = error;
                            cb(null, finalResponse);
                        }
                    }
                });
            } else {
                let error = {};
                error.message = "Group not exists"
                error.name = "VALIDATION_ERROR";
                finalResponse.error = error;
                cb(null, finalResponse);
            }
        }
    });
};

module.exports.getGroupMembers = function(CLIENT, req, res, cb) { 
    let CONNECTION = CLIENT.db(utility.dbName);
    let messageGroupCollection = CONNECTION.collection(messageGroupModel.collection_name);
    let messageGroupMemberCollection = CONNECTION.collection(messageGroupMemberModel.collection_name);

    const groupId = Number(req.body.group_id) || 0;
    
    /* CHECK GROUP AVAILABLE OR NOT */
    messageGroupCollection.findOne({ message_group_id: groupId }, function (err, group) { 
        if (err) {
            cb(err);
        } else {
            var finalResponse = {};
            finalResponse.status = false;
            if(group) {
                /* CHECK MEMBER IS AVAILABLE IN THIS GROUP AND HE/SHE HAVE ADMIN ACCESS */
                var condition = {
                    group_id : groupId
                };
                messageGroupMemberCollection.aggregate(
                    [
                        { $match: condition },
                        {
                            $lookup: {
                                from: USER_MODEL.collection_name,
                                localField: "member_id",
                                foreignField: "user_id",
                                as: "memberList"
                            }
                        },
                        { 
                            $project : {
                                _id: 0,
                                "is_admin": 1,
                                "group_id": 1,
                                "message_group_member_id": 1,
                                "created_date": 1,
                                "updated_date": 1,
                                "first_name": { $arrayElemAt: ["$memberList.first_name", 0] },
                                "last_name": { $arrayElemAt: ["$memberList.last_name", 0] },
                                "user_id": { $arrayElemAt: ["$memberList.user_id", 0] },
                                "user_name": { $ifNull: [ { $arrayElemAt: ["$memberList.user_name", 0] }, "" ] },
                                "profile_image_url": { $arrayElemAt: ["$memberList.profile_image_url", 0] }
                            } 
                        }
                    ]
                ).toArray((err, members) => {
                    if (err) {
                        cb(err);
                    } else {
                        finalResponse.status = true;
                        finalResponse.result = members;
                        cb(null, finalResponse);
                    }
                });
            } else {
                let error = {};
                error.message = "Group not exists"
                error.name = "VALIDATION_ERROR";
                finalResponse.error = error;
                cb(null, finalResponse);
            }
        }
    });
};

module.exports.getGroups = function(CLIENT, req, res, cb) { 
    let CONNECTION = CLIENT.db(utility.dbName);
    let messageGroupCollection = CONNECTION.collection(messageGroupModel.collection_name);
    
    /* CHECK GROUP AVAILABLE OR NOT */
    messageGroupCollection.aggregate([
        {
            $match: {
                status: "active"
            }
        },
        {
            $lookup: {
                from: USER_MODEL.collection_name,
                localField: "created_by",
                foreignField: "user_id",
                as: "creator"
            }
        },
        { 
            $project : {
                "created_by": 1,
                "created_date": 1,
                "is_public": 1,
                "members": 1,
                "message_group_id": 1,
                "title": 1,
                "status": 1,
                "admin.first_name": { $arrayElemAt: ["$creator.first_name", 0] },
                "admin.last_name": { $arrayElemAt: ["$creator.last_name", 0] },
                "admin.user_id": { $arrayElemAt: ["$creator.user_id", 0] },
                "admin.user_name": { $ifNull: [ { $arrayElemAt: ["$creator.user_name", 0] }, "" ] },
                "admin.profile_image_url": { $arrayElemAt: ["$creator.profile_image_url", 0] }
            } 
        }
    ]).toArray ((err, groups) => { 
        if (err) {
            cb(err);
        } else {
            var finalResponse = {};
            finalResponse.status = true;
            finalResponse.result = groups;
            cb(null, finalResponse);
        }
    });
};

module.exports.getGroupById = function(CLIENT, req, res, cb) { 
    let CONNECTION = CLIENT.db(utility.dbName);
    let messageGroupCollection = CONNECTION.collection(messageGroupModel.collection_name);
    let messageGroupMemberCollection = CONNECTION.collection(messageGroupMemberModel.collection_name);

    const groupId = Number(req.body.group_id) || 0;
    
    /* CHECK GROUP AVAILABLE OR NOT */
    messageGroupCollection.aggregate([
        {
            $match: {
                status: "active",
                message_group_id: groupId
            }
        },
        {
            $lookup: {
                from: USER_MODEL.collection_name,
                localField: "created_by",
                foreignField: "user_id",
                as: "creator"
            }
        },
        { 
            $project : {
                "created_by": 1,
                "created_date": 1,
                "is_public": 1,
                "members": 1,
                "message_group_id": 1,
                "title": 1,
                "status": 1,
                "admin.first_name": { $arrayElemAt: ["$creator.first_name", 0] },
                "admin.last_name": { $arrayElemAt: ["$creator.last_name", 0] },
                "admin.user_id": { $arrayElemAt: ["$creator.user_id", 0] },
                "admin.user_name": { $ifNull: [ { $arrayElemAt: ["$creator.user_name", 0] }, "" ] },
                "admin.profile_image_url": { $arrayElemAt: ["$creator.profile_image_url", 0] }
            } 
        }
    ]).toArray ((err, groups) => { 
        if (err) {
            cb(err);
        } else {
            var finalResponse = {};
            finalResponse.status = true;
            finalResponse.result = groups[0];
            cb(null, finalResponse);
        }
    });
};

module.exports.editMessageGroup = function(CLIENT, req, res, cb) { 
    let CONNECTION = CLIENT.db(utility.dbName);
    let messageGroupCollection = CONNECTION.collection(messageGroupModel.collection_name);

    const groupId = Number(req.body.group_id) || 0;
    const title = req.body.title || "";
    const status = req.body.status || "active";
    
    /* CHECK GROUP AVAILABLE OR NOT */
    messageGroupCollection.findOne({ message_group_id: groupId }, function (err, group) { 
        if (err) {
            cb(err);
        } else {
            var finalResponse = {};
            finalResponse.status = false;
            if(group) {
                var msgGrpData = {};
                if(title!="") {
                    msgGrpData.title = title;
                }
                if(status!="") {
                    msgGrpData.status = status;
                }
                /* VALIDATE DATA */
                utility.validatePostData(CONNECTION, msgGrpData, messageGroupModel, 'update', 0, function (err, updateGroup) {
                    messageGroupCollection.findOneAndUpdate({ message_group_id: groupId }, { $set: updateGroup }, async function (err, group) {
                        messageGroupCollection.aggregate([
                            {
                                $match: {
                                    message_group_id: groupId
                                }
                            },
                            {
                                $lookup: {
                                    from: USER_MODEL.collection_name,
                                    localField: "created_by",
                                    foreignField: "user_id",
                                    as: "creator"
                                }
                            },
                            { 
                                $project : {
                                    "created_by": 1,
                                    "created_date": 1,
                                    "is_public": 1,
                                    "members": 1,
                                    "message_group_id": 1,
                                    "title": 1,
                                    "status": 1,
                                    "admin.first_name": { $arrayElemAt: ["$creator.first_name", 0] },
                                    "admin.last_name": { $arrayElemAt: ["$creator.last_name", 0] },
                                    "admin.user_id": { $arrayElemAt: ["$creator.user_id", 0] },
                                    "admin.user_name": { $ifNull: [ { $arrayElemAt: ["$creator.user_name", 0] }, "" ] },
                                    "admin.profile_image_url": { $arrayElemAt: ["$creator.profile_image_url", 0] }
                                } 
                            }
                        ]).toArray ((err, groups) => { 
                            if (err) {
                                cb(err);
                            } else {
                                var finalResponse = {};
                                finalResponse.status = true;
                                finalResponse.result = groups[0];
                                cb(null, finalResponse);
                            }
                        });
                    });
                });
            } else {
                let error = {};
                error.message = "Group not exists"
                error.name = "VALIDATION_ERROR";
                finalResponse.error = error;
                cb(null, finalResponse);
            }
        }
    });
};