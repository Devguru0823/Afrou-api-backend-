'use strict';
let utility = require('../utilities');
const SITE_CONFIG = require('../configs/siteConfig');

const postModel = require('./post.json');
const userModel = require('./user.json');
const postcommentModel = require('./post_comment.json');
const postlikeModel = require('./likes.json');

const postCollection_name = postModel.collection_name;
const userCollection_name = userModel.collection_name;
const postcommentCollection_name = postcommentModel.collection_name;
const postlikeCollection_name = postlikeModel.collection_name;

const fastcsv = require("fast-csv");
const fs = require("fs");

const dirBasePath = SITE_CONFIG.mediaBasePath + 'reports';
if (!fs.existsSync(dirBasePath)) {
    fs.mkdirSync(dirBasePath);
}

module.exports.userInterestOfPoster = function(CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let postCollection = CONNECTION.collection(postCollection_name);
    postCollection.aggregate([
        {
            $match: {
                posted_by: { $ne: null }
            }
        },
        {
            $group: {
                _id: { posted_by: "$posted_by" },
                count:{ $sum: 1 }
            },
        },
        {
            $sort: {
                _id: 1
            }
        },
        {
            $lookup: {
                from: userCollection_name,
                localField: "_id.posted_by",
                foreignField: "user_id",
                as: "posterData"
            }
        },
        {
            $project: {
                _id: 0,
                "UserID": "$_id.posted_by",
                "First Name": { $ifNull: [ { $arrayElemAt: ["$posterData.first_name", 0] }, "" ] },
                "Last Name": { $ifNull: [ { $arrayElemAt: ["$posterData.last_name", 0] }, "" ] },
                // "Total Posts": "$count",
                "Username": { $ifNull: [ { $arrayElemAt: ["$posterData.user_name", 0] }, "" ] },
                "Sports Interests": { $ifNull: [ { $arrayElemAt: ["$posterData.sports_interests", 0] }, [] ] }
            }
        }
    ]).toArray((err, postUserData) => {
        if(err) {
            cb(err);
            return;
        }
        let ws = fs.createWriteStream(dirBasePath+"/userInterestOfThePoster.csv");
        fastcsv
            .write(postUserData, { headers: true })
            .on("finish", function() {
                console.log("Write to CSV successfully!");
            })
            .pipe(ws);
        cb(null, { "filePath": dirBasePath+"/userInterestOfThePoster.csv" });
    });
}

module.exports.userInterestOfPostLiker = function(CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let postcommentCollection = CONNECTION.collection(postlikeCollection_name);
    postcommentCollection.aggregate([
        {
            $match: {
                liked_by: { $ne: 0 },
                like_type: "post",
                post_id: { $ne: 0 }
            }
        },
        {
            $group: {
                _id: { liked_by: "$liked_by" },
                count:{ $sum: 1 }
            },
        },
        {
            $sort: {
                _id: 1
            }
        },
        {
            $lookup: {
                from: userCollection_name,
                localField: "_id.liked_by",
                foreignField: "user_id",
                as: "likerData"
            }
        },
        {
            $project: {
                _id: 0,
                "UserID": "$_id.liked_by",
                "First Name": { $ifNull: [ { $arrayElemAt: ["$likerData.first_name", 0] }, "" ] },
                "Last Name": { $ifNull: [ { $arrayElemAt: ["$likerData.last_name", 0] }, "" ] },
                // "Total Posts": "$count",
                "Username": { $ifNull: [ { $arrayElemAt: ["$likerData.user_name", 0] }, "" ] },
                "Sports Interests": { $ifNull: [ { $arrayElemAt: ["$likerData.sports_interests", 0] }, [] ] },
                "Nationality": { $ifNull: [ { $arrayElemAt: ["$likerData.nationality", 0] }, "" ] }
            }
        }
    ]).toArray((err, postLikerData) => {
        if(err) {
            cb(err);
            return;
        }
        let ws = fs.createWriteStream(dirBasePath+"/userInterestOfThePostLiker.csv");
        fastcsv
            .write(postLikerData, { headers: true })
            .on("finish", function() {
                console.log("Write to CSV successfully!");
            })
            .pipe(ws);
        cb(null, { "filePath": dirBasePath+"/userInterestOfThePostLiker.csv" });
    });
}

module.exports.userInterestOfPostCommenter = function(CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let postcommentCollection = CONNECTION.collection(postcommentCollection_name);
    postcommentCollection.aggregate([
        {
            $match: {
                commented_by: { $ne: 0 },
                comment_status: "active",
                post_id: { $ne: 0 }
            }
        },
        {
            $group: {
                _id: { commented_by: "$commented_by" },
                count:{ $sum: 1 }
            },
        },
        {
            $sort: {
                _id: 1
            }
        },
        {
            $lookup: {
                from: userCollection_name,
                localField: "_id.commented_by",
                foreignField: "user_id",
                as: "commenterData"
            }
        },
        {
            $project: {
                _id: 0,
                "UserID": "$_id.commented_by",
                "First Name": { $ifNull: [ { $arrayElemAt: ["$commenterData.first_name", 0] }, "" ] },
                "Last Name": { $ifNull: [ { $arrayElemAt: ["$commenterData.last_name", 0] }, "" ] },
                // "Total Posts": "$count",
                "Username": { $ifNull: [ { $arrayElemAt: ["$commenterData.user_name", 0] }, "" ] },
                "Sports Interests": { $ifNull: [ { $arrayElemAt: ["$commenterData.sports_interests", 0] }, [] ] }
            }
        }
    ]).toArray((err, postCommenterData) => {
        if(err) {
            cb(err);
            return;
        }
        let ws = fs.createWriteStream(dirBasePath+"/userInterestOfThePostCommenter.csv");
        fastcsv
            .write(postCommenterData, { headers: true })
            .on("finish", function() {
                console.log("Write to CSV successfully!");
            })
            .pipe(ws);
        cb(null, { "filePath": dirBasePath+"/userInterestOfThePostLiker.csv" });
    });
}