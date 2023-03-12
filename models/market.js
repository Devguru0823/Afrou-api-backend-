'use strict';
const Model = require('./market.json');
const userModel = require('./user.json');
const mediaModel = require('./media.js');
let utility = require('../utilities');

module.exports.getMarketPosts = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let marketCollection = CONNECTION.collection(Model.collection_name);
    let userCollection = CONNECTION.collection(userModel.collection_name);
    userCollection.findOne({ user_id: req.authorization.user_id }, function (err, userData) {
        let filteredUserIds = userData.friend_ids || [];
        filteredUserIds.push(req.authorization.user_id);
        let filters = {
            posted_by: { $in: filteredUserIds },
            market_post_status: "active"
        };
        if (req.query.search) {
            filters.item_name = new RegExp(req.query.search, "i");
        }

        if (req.query.category) {
            filters.category = req.query.category
        }
        marketCollection
            .find(filters).sort({ market_post_id: -1 })
            .toArray((err, marketPosts) => {
                let finalResponse = {};
                finalResponse.status = true;
                finalResponse.data = marketPosts;
                cb(err, finalResponse);
            });
    });
};



module.exports.getMarketPostById = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let marketCollection = CONNECTION.collection(Model.collection_name);
    let market_post_id = Number(req.params.market_post_id);
    marketCollection
        .aggregate([
            {
                $match: {
                    market_post_id: market_post_id,
                    market_post_status: "active"
                }
            },
            {
                $lookup: {
                    from: userModel.collection_name,
                    localField: "posted_by",
                    foreignField: "user_id",
                    as: "userDetails"
                }
            },
            {
                $project: {
                    "item_name": 1,
                    "type": 1,
                    "category": 1,
                    "price": 1,
                    "currency": 1,
                    "city": 1,
                    "country": 1,
                    "mobile_number": 1,
                    "description": 1,
                    "main_image": 1,
                    "sub_image1": 1,
                    "sub_image2": 1,
                    "sub_image3": 1,
                    "market_post_status": 1,
                    "created_date": 1,
                    "market_post_id": 1,
                    "posted_by.user_id": "$posted_by",
                    "posted_by.first_name": { $arrayElemAt: ["$userDetails.first_name", 0] },
                    "posted_by.last_name": { $arrayElemAt: ["$userDetails.last_name", 0] },
                    "posted_by.email": { $arrayElemAt: ["$userDetails.email", 0] },
                }
            }
        ])

        .toArray((err, marketPosts) => {
            let finalResponse = {};
            finalResponse.status = true;
            finalResponse.data = marketPosts && marketPosts.length > 0 ? marketPosts[0] : null;
            cb(err, finalResponse);
        });
};





module.exports.addMarketPost = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let marketCollection = CONNECTION.collection(Model.collection_name);
    let newMarketPost = utility.filterBody(req.body);
    if (newMarketPost === {}) {
        return cb({ error: 'invalid data' }, false);
    }
    // Manage Photos and assign
    if (req.files && req.files.main_image) {
        mediaModel.imageOrientationFixSync(req.files.main_image[0].path);
        newMarketPost.main_image = req.files.main_image[0].path.replace("cdn/", "");
    } else {
        delete newMarketPost.main_image;
    }

    if (req.files && req.files.sub_image1) {
        mediaModel.imageOrientationFixSync(req.files.sub_image1[0].path);
        newMarketPost.sub_image1 = req.files.sub_image1[0].path.replace("cdn/", "");
    } else {
        delete newMarketPost.sub_image1;
    }

    if (req.files && req.files.sub_image2) {
        mediaModel.imageOrientationFixSync(req.files.sub_image2[0].path);
        newMarketPost.sub_image2 = req.files.sub_image2[0].path.replace("cdn/", "");
    } else {
        delete newMarketPost.sub_image2;
    }

    if (req.files && req.files.sub_image3) {
        mediaModel.imageOrientationFixSync(req.files.sub_image3[0].path);
        newMarketPost.sub_image3 = req.files.sub_image3[0].path.replace("cdn/", "");
    } else {
        delete newMarketPost.sub_image3;
    }

    newMarketPost.posted_by = req.authorization.user_id;
    newMarketPost.price = Number(newMarketPost.price);
    utility.validatePostData(CONNECTION, newMarketPost, Model, 'insert', 0, function (err, validatedData) {
        if (err) {
            cb(err);
        } else {
            marketCollection.insertOne(validatedData, function (err, response) {
                if (err) {
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




module.exports.editMarketPost = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let marketCollection = CONNECTION.collection(Model.collection_name);
    let newMarketPost = utility.filterBody(req.body);
    if (newMarketPost === {}) {
        return cb({ error: 'invalid data' }, false);
    }
    let market_post_id = Number(req.params.market_post_id);
    // Manage Photos and assign
    if (req.files && req.files.main_image) {
        mediaModel.imageOrientationFixSync(req.files.main_image[0].path);
        newMarketPost.main_image = req.files.main_image[0].path.replace("cdn/", "");
    } else {
        delete newMarketPost.main_image;
    }

    if (req.files && req.files.sub_image1) {
        mediaModel.imageOrientationFix(req.files.sub_image1[0].path);
        newMarketPost.sub_image1 = req.files.sub_image1[0].path.replace("cdn/", "");
    } else {
        delete newMarketPost.sub_image1;
    }

    if (req.files && req.files.sub_image2) {
        mediaModel.imageOrientationFixSync(req.files.sub_image2[0].path);
        newMarketPost.sub_image2 = req.files.sub_image2[0].path.replace("cdn/", "");
    } else {
        delete newMarketPost.sub_image2;
    }

    if (req.files && req.files.sub_image3) {
        mediaModel.imageOrientationFixSync(req.files.sub_image3[0].path);
        newMarketPost.sub_image3 = req.files.sub_image3[0].path.replace("cdn/", "");
    } else {
        delete newMarketPost.sub_image3;
    }
    if (newMarketPost.price) {
        newMarketPost.price = Number(newMarketPost.price);
    }
    utility.validatePostData(CONNECTION, newMarketPost, Model, 'update', market_post_id, function (err, validatedData) {
        if (err) {
            cb(err);
        } else {
            marketCollection.findOneAndUpdate({ market_post_id: market_post_id }, { $set: validatedData }, { returnOriginal: false }, function (err, response) {
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

