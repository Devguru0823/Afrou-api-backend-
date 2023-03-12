const Model = require('../models/user.js');
let utility = require('../utilities');
var MongoClient = require('mongodb').MongoClient;
// var url = "mongodb://afrouDbUser:2wDJm4Rx9qBdMJ6a@68.183.39.212:33888/?authSource=afrou_db";
const CONFIG = require("../configs/dbConfig.json")
const url = 'mongodb://' + CONFIG.username + ':' + CONFIG.password + '@' + CONFIG.host + ':' + CONFIG.port + '/' + CONFIG.database;
// const url = `${CONFIG.protocol}${CONFIG.username}:${CONFIG.password}@${CONFIG.host}/${CONFIG.database}`
const { sendPush } = require('./push-notification');
const blockipsModel = require('../models/blockips.json');
const userModel = require('../models/user.json');

const NOTIFICATION = require('../models/notification.js');

const promoNotification = () => new Promise((resolve, reject) => {
    MongoClient.connect(url, { useNewUrlParser: true }, function (err, db) {
        if (err) throw err;
        var dbo = db.db("afrou_db");
        dbo.collection("user").find({
            "last_active":{$lt:new Date(Date.now() - 24*60*60 * 1000)}
        }).toArray((err, userList) => {
            if (err) {
                console.log("err===>", err);
                reject();
            } else {
                userList.forEach(user => {
                    let pushData = {
                        status: "We Care ❤️",
                        title: `We Care ❤️`,
                        body: `${user.first_name}, Afrocamgist misses you, trust you're okay. Why not check out the latest post.`,
                        sound: "default",
                        mutable_content: true,
                        content_available: true,
                        data: {
                            status: "We Care ❤️",
                            message: `${user.first_name}, Afrocamgist misses you, trust you're okay. Why not check out the latest post.`,
                            notification_type: "Promo"
                        }
                    };
                    sendPush(
                        user.firebase_token,
                        "Promo",
                        pushData,
                        true,
                    );
                })
                resolve();
            }
        });
    });
});

const getRandomLike = function() {
    const rndInt = randomIntFromInterval(1, 20);
    MongoClient.connect(url, { useNewUrlParser: true }, function (err, CLIENT) {
        if (err) throw err;
        let CONNECTION = CLIENT.db("afrou_db");
        let userCollection = CONNECTION.collection("user");
        let postCollection = CONNECTION.collection("post");
        let likeCollection = CONNECTION.collection("likes");
        let ALNCollection = CONNECTION.collection("autolikenotifylimites");

        // let CONNECTION = CLIENT.db(utility.dbName);
        // let userCollection = CONNECTION.collection(Model.collection_name);
        // let postCollection = CONNECTION.collection(Model_Post.collection_name);
        // let likeCollection = CONNECTION.collection(Model_Like.collection_name);
        for(var i=0; i<10; i++) {
            userCollection.aggregate(
                [
                    { $project : { "user_id" : 1, "first_name":1, "last_name":1, "status":1, "last_active" : 1, "firebase_token": 1 } },
                    { $match: { "last_active":{$lt:new Date(Date.now() - 15*24*60*60 * 1000)}, "status": "active" } },
                    { $sample: { size: 1 } } 
                ]
            ).toArray((err, userList) => {
                if (err) {
                    // cb(err);
                } else {
                    // console.log(userList[0]);
                    let user_id = userList[0].user_id;
                    /* postCollection */
                    postCollection.aggregate(
                        [ 
                            { $project : { "post_id" : 1, "posted_by":1, "post_date":1, "post_status":1, "posted_for": 1, "post_type": 1, "like_count": 1, "video_play_count": 1 } },
                            { $match: { 
                                "post_date":{ $gt:new Date(Date.now() - rndInt*24*60*60 * 1000) }, 
                                "post_status": "active", 
                                "posted_for" : "afroswagger",
                                "posted_by": { $ne: user_id } 
                            } },
                            { $sample: { size: 1 } }
                        ]
                    ).toArray( async (errP, postLists) => {
                        if (errP) {
                            // cb(errP);
                        } else {
                            if(postLists[0].post_type!="video" || (postLists[0].post_type=="video" && postLists[0].video_play_count)) {
                                const post_id_results = [];
                                await postLists.forEach( (postList) => {
                                    post_id_results.push(postList.post_id);
                                });
                                // console.log(post_id_results);
                                /* Find post with the selected post_id */
                                likeCollection.aggregate(
                                    [ 
                                        { $match: { 
                                            "post_id": { $in: post_id_results },
                                            "like_type" : "post",
                                            "liked_by": user_id
                                        } },
                                    ]
                                ).toArray(async (errP, likeLists) => {
                                    if (errP) {
                                        // cb(errP);
                                    } else {
                                        /* If like found then remove from list */
                                        likeLists.forEach( (likeList) => {
                                            // console.log("likeList: " + likeList);
                                            // console.log(likeList);
                                            const index = post_id_results.indexOf(likeList.post_id);
                                            if (index > -1) {
                                                post_id_results.splice(index, 1);
                                            }
                                        });
                                        // console.log(post_id_results);
                                        const post_id_result = post_id_results[0];
                                        if(post_id_result!=null) {
                                        // post_id_results.forEach( async (post_id_result) => {
                                            // console.log("==> " + post_id_result);
                                            await generatePrimaryKey(CONNECTION, 'likes', async function (err, primaryKeyValue) {
                                                if (err) {
                                                    // cb(err);
                                                } else {
                                                
                                                    var validatedData = {
                                                        "post_id": post_id_result,
                                                        "comment_id": 0,
                                                        "liked_by": user_id,
                                                        "like_type": "post",
                                                        "like_date": new Date(Date.now()).toISOString(),
                                                        "created_date": new Date(Date.now()).toISOString(),
                                                        "like_id": primaryKeyValue,
                                                        "like_from": "Cron"
                                                    };
                                                    // console.log(validatedData);
                                                    await likeCollection.insertOne(validatedData, async function (err, response) {
                                                        if (err) {
                                                            // cb(err);
                                                        } else {
                                                            /* Update like counter */
                                                            postCollection.findOneAndUpdate({ post_id: post_id_result }, { $inc: { like_count: 1 } }, async function (err, resp) { });
                                                            /* ******************* */
                                                            // console.log("Liked: " + post_id_result);

                                                            let requested_by = user_id;
                                                            let requested_to = postLists[0].posted_by;
                                                            let notification_details = {
                                                                text_template: '{{USER_ID_' + requested_by + '}} liked  your post',
                                                                post_id: postLists[0].post_id
                                                            };
                                                            let notification_type = 'post_like';
                                                            let notify_users = [requested_to];
                                                            let pushData = {};

                                                            var userName = userList[0].first_name + " " + userList[0].last_name;
                                                            if(userList[0].user_name && userList[0].user_name!="") {
                                                                userName = userList[0].user_name;
                                                            }

                                                            /* Add image to notification */
                                                            var postImagePath = "";
                                                            if(postLists[0].post_type=="image") {
                                                                if(postLists[0].post_image) {
                                                                    if(postLists[0].post_image[0]) {
                                                                    postImagePath = postLists[0].post_image[0];
                                                                    }
                                                                }
                                                            } else if(postLists[0].post_type=="video") {
                                                                if(postLists[0].thumbnail) {
                                                                    postImagePath = postLists[0].thumbnail;
                                                                }
                                                            }
                                                            if(postImagePath!="") {
                                                                postImagePath = "https://cdn.afrocamgist.com/" + postImagePath;
                                                            }
                                                            /* ========================= */

                                                            pushData = {
                                                                status: "Like",
                                                                title: "Like on post",
                                                                body: `${userName} liked your post`,
                                                                image: postImagePath,
                                                                sound: "default",
                                                                mutable_content: true,
                                                                content_available: true,
                                                                data: {
                                                                    status: "Like",
                                                                    message: `${userName} liked your post`,
                                                                    image: postImagePath,
                                                                    notification_type: notification_type,
                                                                    post_id:notification_details.post_id
                                                                }
                                                            };
                                                            /** Get notification counter in last 2 hours */
                                                            let isSendNotification = true;
                                                            let now = new Date();
                                                            let expiry = new Date();
                                                            expiry.setHours(expiry.getHours() + 2);
                                                            let ALNuser = await ALNCollection.findOne({ user_id: requested_to });
                                                            if(ALNuser) {
                                                                // Check counter and set flag.
                                                                if(ALNuser.notify_counter<2) {
                                                                    // increase counter
                                                                    let updateRec = await ALNCollection.findOneAndUpdate({ user_id: requested_to }, { $inc: { notify_counter: 1 } });
                                                                } else {
                                                                    if(now>ALNuser.limit_date) {
                                                                        var ALNvalidatedData = {
                                                                            "start_date": new Date(Date.now()).toISOString(),
                                                                            "notify_counter": 1,
                                                                            "limit_date": expiry
                                                                        };
                                                                        let updateRec = await ALNCollection.findOneAndUpdate({ user_id: requested_to }, { $set:  ALNvalidatedData });
                                                                    } else {
                                                                        isSendNotification = false;
                                                                    }
                                                                }
                                                            } else {
                                                                // create new entry in db
                                                                await generatePrimaryKey(CONNECTION, 'autolikenotifylimites', async function (err, ALNprimaryKeyValue) {
                                                                    if (err) {
                                                                        // cb(err);
                                                                    } else {
                                                                        var ALNvalidatedData = {
                                                                            "start_date": new Date(Date.now()).toISOString(),
                                                                            "created_date": new Date(Date.now()).toISOString(),
                                                                            "aln_id": ALNprimaryKeyValue,
                                                                            "user_id": requested_to,
                                                                            "notify_counter": 1,
                                                                            "limit_date": expiry
                                                                        };
                                                                        await ALNCollection.insertOne(ALNvalidatedData);
                                                                    }
                                                                });
                                                            }
                                                            /** ************* **/
                                                            if(isSendNotification) {
                                                                notify_users.forEach(user => {
                                                                    userCollection.findOne({ user_id: user })
                                                                        .then(userDetails => {
                                                                            sendPush(
                                                                                userDetails.firebase_token,
                                                                                "Like",
                                                                                pushData,
                                                                                true,
                                                                            );
                                                                        })
                                                                        .catch((err) => console.error(err))
                                                                })
                                                                var req = {};
                                                                var res = {};
                                                                NOTIFICATION.addNotification(CLIENT, req, res, notification_type, notify_users, notification_details, function (err, notificationResp) {
                                                                    let finalResponse = {};
                                                                    finalResponse.status = true;
                                                                    finalResponse.data = "Done";
                                                                    // cb(null, finalResponse);
                                                                });
                                                            } else {
                                                                let finalResponse = {};
                                                                finalResponse.status = true;
                                                                finalResponse.data = "Done";
                                                            }
                                                        }
                                                    });
                                                }
                                            });
                                        // });
                                        }
                                    }
                                });
                            }
                        }
                    });
                    /* ************** */
                }
            });
        }
    });
};

/**
 * Random number generate function
 */
function randomIntFromInterval(min, max) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min)
}

/*
 Deactivate storyline posts which are morethen 24 hours.
 */
const deActivateStoryLine = function() {
    MongoClient.connect(url, { useNewUrlParser: true }, async function (err, CLIENT) {
        if (err) throw err;
        let CONNECTION = CLIENT.db("afrou_db");
        let storylineCollection = CONNECTION.collection("storyline");
        storylineCollection.aggregate(
            [ 
                { $match: { 
                    "post_date":{ $lt:new Date(Date.now() - 1*24*60*60 * 1000) }, 
                    "post_status": "active", 
                } }
            ]
        ).toArray((err, stories) => {
            if (err) {
                // cb(err);
            } else {
                /* Update Posts */
                stories.forEach(( story ) =>{
                    // console.log("==> ");
                    // console.log(story.story_id);
                    storylineCollection.findOneAndUpdate({
                        story_id: story.story_id
                      }, { $set: { post_status: "inactive" } }, function (err, response) {
                        if (err) {
                          cb(err);
                        } else {
                        //   console.log(response);
                        }
                      });
                });
                /* ************** */
            }
        });    
    });
};

/**
 * GENERATE PRIMARY KEY
 * @param CONNECTION
 * @param Model
 * @param cb
 */
let generatePrimaryKey = function (CONNECTION, Model, cb) {
    let sequenceCollection = CONNECTION.collection('sequence');
    let collectionName = Model; //Model.collection_name;

    sequenceCollection.findOneAndUpdate({ collection: collectionName }, { $inc: { counter: 1 } }, {
        upsert: true,
        returnOriginal: false
    }, function (err, updatedSequence) {
        cb(err, updatedSequence.value.counter);
    });
};

const checkRegistrationIPs = function() {
    MongoClient.connect(url, { useNewUrlParser: true }, function (err, db) {
        if (err) throw err;
        var dbo = db.db("afrou_db");
        dbo.collection("user").aggregate([
            {
                $match: {
                    ipaddress: { $exists: true },
                    "created_date":{ $gt:new Date(Date.now() - 1*60*60 * 1000) }
                }
            },
            {
                $group: {
                    _id : "$ipaddress",
                    count: { $sum: 1 }
                }
            }
        ]).toArray(function(err, results){
            results.forEach(res => {
                if(res.count>=15) {
                    var newUserData = {
                        "ipaddress": res._id
                    };
                    utility.validatePostData(dbo, newUserData, blockipsModel, 'insert', 0, function (err, validatedData) {
                        if (err) {
                            cb(err);
                        } else {
                            dbo.collection("blockips").insertOne(validatedData, function (err, response) {
                                if (err) {
                                    cb(err);
                                } else {
                                    // console.log(response);
                                }
                            });
                        }
                    });
                }
            });
        });
    });
}

module.exports = { 
    promoNotification, 
    getRandomLike,
    deActivateStoryLine,
    checkRegistrationIPs
};