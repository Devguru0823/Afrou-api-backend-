'use strict';
const express = require('express');
const router = express.Router();
const utility = require('../utilities');
router.get('/admin-posts', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        let CONNECTION = client.db(utility.dbName);
        let postCollection = CONNECTION.collection('post');
        let skip = 0;
        let limit = 10;
        let page = 1;
        if(req.query.page){
            page = Number(req.query.page);
            skip = (page - 1) * limit;
        }
        postCollection.find({posted_by: 1}).skip(skip).limit(limit).sort({post_id: -1}).toArray((err, postsArray)=>{
            client.close();
            if(err){
                next(err);
            }else{
                res.json({data: postsArray});
            }
        });
    });
});


router.get('/:posted_for', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        let CONNECTION = client.db(utility.dbName);
        let postCollection = CONNECTION.collection('post');
        let status = 'active';
        if(req.query.status && req.query.status === 'inactive'){
            status = 'inactive';
        }
        let skip = 0;
        let limit = 10;
        let page = 1;
        if(req.query.page){
            page = Number(req.query.page);
            skip = (page - 1) * limit;
        }
        let posted_for = req.params.posted_for;
        postCollection.find({post_status: status, posted_for: posted_for}).skip(skip).limit(limit).sort({post_id: -1}).toArray((err, postsArray)=>{
            client.close();
            if(err){
                next(err);
            }else{
                res.json({data: postsArray});
            }
        });
    });
});




router.put('/admin-posts/:post_id', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        let CONNECTION = client.db(utility.dbName);
        let postCollection = CONNECTION.collection('post');
        let post_id = Number(req.params.post_id);
        const postData = utility.filterBody(req.body);
        const HASHTAG_MODULE = require('../models/hashtag');
        const postModel = require('../models/post.json');
        const hashTags = utility.getHashTags(postData.post_text);
        HASHTAG_MODULE.addUpdateHashtags(client, hashTags, (err, hashtagsArr) => {
            if (!Array.isArray(hashtagsArr)) {
                hashtagsArr = [];
            }
            postData.hashtags = hashtagsArr.map(x => x.hashtag_slug);
            utility.validatePostData(CONNECTION, postData, postModel, 'update', post_id, function (err, validatedData) {
                if (err) {
                    next(err);
                } else {
                    postCollection.findOneAndUpdate({
                        post_id: post_id
                    }, {$set: validatedData}, function (err, response) {
                        client.close();
                        if (err) {
                            next(err);
                        } else {
                            let finalResponse = {};
                            finalResponse.status = true;
                            res.json(finalResponse);
                        }
                    });
                }
            });
        });
    });
});



router.delete('/admin-posts/:post_id', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        let CONNECTION = client.db(utility.dbName);
        let postCollection = CONNECTION.collection('post');
        let post_id = Number(req.params.post_id);

        postCollection.findOneAndDelete({
            post_id: post_id
        }, function (err, response) {
            client.close();
            if (err) {
                next(err);
            } else {
                let finalResponse = {};
                finalResponse.status = true;
                res.json(finalResponse);
            }
        });
    });
});


router.get('/:post_id/togglestatus', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        let CONNECTION = client.db(utility.dbName);
        let postCollection = CONNECTION.collection('post');
        let post_id = Number(req.params.post_id);
        postCollection.findOne({post_id: post_id}, (err, postData)=>{
            if(err){
                next(err);
            }else if(!postData){
                client.close();
                let error = new Error('No Posts Found');
                error.status = 404;
                next(error);
            }else{
                const post_status = postData.post_status === 'active'? 'inactive': 'active';
                postCollection.findOneAndUpdate({post_id: post_id}, {$set: {post_status: post_status}}, (err, postData)=>{
                    client.close();
                    res.json({status: true});
                });
            }
        });
    });
});

router.post('/admin-posts', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        addPost(client, req, res, (err, resp) => {
            if(err) {
                next(err);
            }else{
                res.json(resp);
            }
        })
    });
});



const addPost = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let postCollection = CONNECTION.collection('post');

    let newPostData = utility.filterBody(req.body);
    newPostData.posted_by = 1;
    newPostData.post_privacy = 'public';
    const hashTags = utility.getHashTags(newPostData.post_text);
    const HASHTAG_MODULE = require('../models/hashtag');
    const postModel = require('../models/post.json');
    HASHTAG_MODULE.addUpdateHashtags(CLIENT, hashTags, (err, hashtagsArr) => {
        if(!Array.isArray(hashtagsArr)) {
            hashtagsArr = [];
        }
        newPostData.hashtags = hashtagsArr.map(x => x.hashtag_slug);
        utility.validatePostData(CONNECTION, newPostData, postModel, 'insert', 0, function (err, validatedData) {
            if (err) {
                cb(err);
            } else {
                postCollection.insertOne(validatedData, function (err, response) {
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
    });

};

router.get('/hashtags', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        let CONNECTION = client.db(utility.dbName);
        let hashtagCollection = CONNECTION.collection('hashtags');
        let skip = 0;
        let limit = 10;
        let page = 1;
        if(req.query.page){
            page = Number(req.query.page);
            skip = (page - 1) * limit;
        }
        hashtagCollection.find({}).skip(skip).limit(limit).sort({post_id: -1}).toArray((err, hashtagsArray)=>{
            client.close();
            if(err){
                next(err);
            }else{
                res.json({data: hashtagsArray});
            }
        });
    });
});

module.exports = router;
