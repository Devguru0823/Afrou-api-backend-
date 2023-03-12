'use strict';
const Model = require('./hashtag.json');
let utility = require('../../utilities');
const moment = require('moment');
const asyncLoop = require('node-async-loop');
const userModel = require('./user.json');
const postModel = require('./post.json');

module.exports.getHashtags = function(CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let hashtagCollection = CONNECTION.collection(Model.collection_name);
    const currentLoggedInUser = req.authorization.user_id;
    let page = req.query.page;
    if(!page || Number(page) < 1) {
        page = 1;
    }else {
        page = Number(page);
    }
    const limit = 15;
    const skip = (page - 1) * limit;

    hashtagCollection.aggregate([
        {
            $match: {
                hashtag_slug: new RegExp(req.query.search, "i")
            }
        },
        {
            $sort: {
                created_date: -1
            }
        },
        {
            $skip: skip
        },
        {
            $limit: limit
        },
        {
            $lookup: {
                from: postModel.collection_name,
                let: {
                    hashtag_slug: "$hashtag_slug"
                },
                pipeline: [
                    {
                        $addFields: {
                            hashtags: {$ifNull: ["$hashtags", []]}
                        }
                    },
                    {
                        $match: {
                            $expr: {
                                $in: ["$$hashtag_slug", "$hashtags"]
                            }
                        }
                    },
                    {
                        $match: {
                            $expr: {
                                $eq: ["$post_type", "image"]
                            }
                        }
                    },
                    {
                        $project: {
                            cover_image: {$arrayElemAt: ["$post_image", 0]}
                        }
                    }
                ],
                as: "postDetails"
            }
        },
    ]).toArray((err, hashtags) => {
        console.log(err);
        if(!err){
            hashtags.forEach(hashtag => {
                hashtag.followed_by_me = hashtag.followers && hashtag.followers.indexOf(currentLoggedInUser) !== -1;
                if(hashtag.postDetails.length === 0) {
                    hashtag.cover_image = 'default-hashtag-cover.jpg'
                }else {
                    hashtag.cover_image = hashtag.postDetails[0].cover_image
                }

                delete hashtag.postDetails;
            });
        }
        const finalOutput = {
            count: hashtags.length,
            currentPage: page,
            data: hashtags,
            nextPage: page + 1,
            status: true
        };
       cb(err, finalOutput);
    });
};

module.exports.getAllHashtags = function(CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let hashtagCollection = CONNECTION.collection(Model.collection_name);
    const currentLoggedInUser = req.authorization.user_id;

    hashtagCollection.aggregate([
        {
            $match: {
                hashtag_status: "active"
            }
        },
        {
            $sort: {
                hashtag_slug: 1
            }
        },
        // {
        //     $lookup: {
        //         from: postModel.collection_name,
        //         let: {
        //             hashtag_slug: "$hashtag_slug"
        //         },
        //         pipeline: [
        //             {
        //                 $addFields: {
        //                     hashtags: {$ifNull: ["$hashtags", []]}
        //                 }
        //             },
        //             {
        //                 $match: {
        //                     $expr: {
        //                         $in: ["$$hashtag_slug", "$hashtags"]
        //                     }
        //                 }
        //             },
        //             {
        //                 $match: {
        //                     $expr: {
        //                         $eq: ["$post_type", "image"]
        //                     }
        //                 }
        //             },
        //             {
        //                 $project: {
        //                     cover_image: {$arrayElemAt: ["$post_image", 0]}
        //                 }
        //             }
        //         ],
        //         as: "postDetails"
        //     }
        // },
    ]).toArray((err, hashtags) => {
        console.log(err);
        if(!err){
            hashtags.forEach(hashtag => {
                hashtag.followed_by_me = hashtag.followers && hashtag.followers.indexOf(currentLoggedInUser) !== -1;
                // if(hashtag.postDetails.length === 0) {
                //     hashtag.cover_image = 'default-hashtag-cover.jpg'
                // }else {
                //     hashtag.cover_image = hashtag.postDetails[0].cover_image
                // }

                // delete hashtag.postDetails;
            });
        }
        const finalOutput = {
            count: hashtags.length,
            currentPage: 1,
            data: hashtags,
            nextPage: false,
            status: true
        };
       cb(err, finalOutput);
    });
};

module.exports.getTrendingHashtags = function(CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let hashtagCollection = CONNECTION.collection(Model.collection_name);
    const currentLoggedInUser = req.authorization.user_id;
    const limit = 4;

    hashtagCollection.aggregate([
        {
            $sort: {
                post_count: -1
            }
        },
        {
            $limit: limit
        },
        {
            $lookup: {
                from: postModel.collection_name,
                let: {
                    hashtag_slug: "$hashtag_slug"
                },
                pipeline: [
                    {
                        $addFields: {
                            hashtags: {$ifNull: ["$hashtags", []]}
                        }
                    },
                    {
                        $match: {
                            $expr: {
                                $in: ["$$hashtag_slug", "$hashtags"]
                            }
                        }
                    },
                    {
                        $match: {
                            $expr: {
                                $eq: ["$post_type", "image"]
                            }
                        }
                    },
                    {
                        $project: {
                            cover_image: {$arrayElemAt: ["$post_image", 0]}
                        }
                    }
                ],
                as: "postDetails"
            }
        },
    ]).toArray((err, hashtags) => {
        if(!err){
            hashtags.forEach(hashtag => {
                hashtag.followed_by_me = hashtag.followers && hashtag.followers.indexOf(currentLoggedInUser) !== -1;
                if(hashtag.postDetails.length === 0) {
                    hashtag.cover_image = 'default-hashtag-cover.jpg'
                }else {
                    hashtag.cover_image = hashtag.postDetails[0].cover_image
                }

                delete hashtag.postDetails;
            });
        }
        const finalOutput = {
            data: hashtags,
            status: true
        };
        cb(err, finalOutput);
    });
};



module.exports.getMyHashtags = function(CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let userCollection = CONNECTION.collection(userModel.collection_name);
    const currentLoggedInUser = req.authorization.user_id;
    let hashtagCollection = CONNECTION.collection(Model.collection_name);
    userCollection.findOne({user_id: currentLoggedInUser}, (err, userDetails) => {
        const hashtags = userDetails.following_hashtags || [];

        hashtagCollection.aggregate([
            {
                $match: {
                    hashtag_slug: {$in: hashtags}
                }
            },
            {
                $sort: {
                    post_count: -1
                }
            }
        ]).toArray((err, hashtags) => {
            if(!err){
                hashtags.forEach(hashtag => {
                    hashtag.followed_by_me = hashtag.followers && hashtag.followers.indexOf(currentLoggedInUser) !== -1;
                });
            }
            const finalOutput = {
                data: hashtags,
                status: true
            };
            cb(err, finalOutput);
        });
    });
};

module.exports.getHashtagDetails = function(CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let hashtagCollection = CONNECTION.collection(Model.collection_name);
    const currentLoggedInUser = req.authorization.user_id;
    let {hashtag_slug} = req.params;
    const accountsCollection = CONNECTION.collection(userModel.collection_name);
    const postCollection = CONNECTION.collection(postModel.collection_name);


    hashtagCollection.findOne({hashtag_slug: hashtag_slug}, (err, hashtagDetails) => {
        if(err || !hashtagDetails){
            let error = new Error();
            error.name = 'NOT_FOUND_ERROR';
            cb(error);
        }else{
            const followers = hashtagDetails.followers || [];
            accountsCollection.find({user_id: {$in: followers}}, {projection: {first_name: 1, user_id: 1, last_name: 1, email: 1, profile_image_url: 1}}).toArray((err, users) => {
                postCollection.aggregate([
                    {
                        $match: {
                            post_type: 'image',
                            post_status: 'active',
                            hashtags: hashtag_slug
                        }
                    },
                    {
                        $sample: {
                            size: 1
                        }
                    }
                ]).toArray((err, randomImagePosts) => {
                    const finalResponse = { ...hashtagDetails};
                    finalResponse.profile_image = 'default-hashtag-profile.jpg';
                    if(err || randomImagePosts.length === 0) {
                        // set Default Image
                        finalResponse.cover_image = 'default-hashtag-cover.jpg'
                    }else {
                        finalResponse.cover_image = randomImagePosts[0].post_image[0]
                    }

                    finalResponse.followers_users = users;
                    cb(null, finalResponse);
                });

            });
        }

    });
};


module.exports.addUpdateHashtags = function(CLIENT, hashtags=[], cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let hashtagCollection = CONNECTION.collection(Model.collection_name);
    if(!hashtags || !Array.isArray(hashtags)){
        hashtags = []
    }
    hashtags.map(hashtag => hashtag.toLowerCase());
    const hashtagsToReturn = [];
    if(hashtags.length > 0){
        asyncLoop(hashtags, (hashtag, next)=> {
            hashtagCollection.findOne({hashtag_slug: hashtag}, (err, foundTag) => {
                if(err){
                    next(err);
                    return;
                }
                if(foundTag) {
                    // Already have the tag so update
                    hashtagCollection.findOneAndUpdate({hashtag_slug: hashtag}, {$inc: {post_count: 1}}, (err, hashtagData) => {
                        if(!err) {
                            hashtagsToReturn.push(hashtagData.value);
                        }
                        next(err);
                    });
                } else{
                    utility.validatePostData(CONNECTION, {hashtag_slug: hashtag}, Model, 'insert', 0, (err, validatedData) => {
                        hashtagCollection.insertOne(validatedData, (err, insertedData) => {
                            if(!err) {
                                hashtagsToReturn.push(validatedData);
                            }
                            next(err);
                        })
                    });
                }
            });
        }, err => {
            cb(err, hashtagsToReturn);
        });
    }else{
        cb(null, []);
    }


};

module.exports.followHashtagFromPost = function(CLIENT, hashtag, user_id, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let hashtagCollection = CONNECTION.collection(Model.collection_name);
    const currentLoggedInUser = user_id;
    hashtagCollection.findOneAndUpdate({hashtag_slug: hashtag}, {$addToSet: {followers: currentLoggedInUser}}, (err, updated) => {
        if(updated.value) {
            const userCollection = CONNECTION.collection(userModel.collection_name);
            userCollection.findOneAndUpdate({user_id: currentLoggedInUser}, {$addToSet: {following_hashtags: hashtag}}, (err, updatedUser) => {
                cb(null, {status: true})
            });
        }else{
            cb(new Error("Error Following"))
        }
    })
};



module.exports.followHashtag = function(CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let hashtagCollection = CONNECTION.collection(Model.collection_name);
    const currentLoggedInUser = req.authorization.user_id;
    const { hashtag } = req.body;
    hashtagCollection.findOneAndUpdate({hashtag_slug: hashtag}, {$addToSet: {followers: currentLoggedInUser}}, (err, updated) => {
        if(updated.value) {
            const userCollection = CONNECTION.collection(userModel.collection_name);
            userCollection.findOneAndUpdate({user_id: currentLoggedInUser}, {$addToSet: {following_hashtags: hashtag}}, (err, updatedUser) => {
                cb(null, {status: true})
            });
        }else{
            cb(new Error("Error Following"))
        }
    })
};



module.exports.unFollowHashtag = function(CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let hashtagCollection = CONNECTION.collection(Model.collection_name);
    const currentLoggedInUser = req.authorization.user_id;
    const { hashtag } = req.body;
    hashtagCollection.findOneAndUpdate({hashtag_slug: hashtag}, {$pull: {followers: currentLoggedInUser}}, (err, updated) => {
        if(updated.value) {
            const userCollection = CONNECTION.collection(userModel.collection_name);
            userCollection.findOneAndUpdate({user_id: currentLoggedInUser}, {$pull: {following_hashtags: hashtag}}, (err, updatedUser) => {
                cb(null, {status: true})
            });
        }else{
            cb(new Error("Error Following"))
        }
    })
};
