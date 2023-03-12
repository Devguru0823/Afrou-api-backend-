var express = require('express');
var router = express.Router();
var utility = require('../utilities');
var PostModel = require('../models/post');
var UserModel = require('../models/user');
var LikeModel = require('../models/likes');
var PostCommentModel = require('../models/post_comment');
var VideoModel = require('../models/videoprocess');

/**
 * Get MostPopular posts
 */
router.get('/most-popular', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        PostModel.getMostPopulatPostsOpen(client, req, res, function (err, response) {
            client.close();
            if(err) {
                next(err);
            } else {
                res.json(response);
            }
        })
    });
});

/**
 * Create ID with first name and last name
 */
router.post('/createId', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        UserModel.createAccountId(client, req, res, function (err, response) {
            client.close();
            if(err) {
               return next(err);
            } else {
                res.json(response);
            }
        })
    });
});

/**
 * Register account using ID
 */
router.put('/register', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        UserModel.registerAccountId(client, req, res, function (err, response) {
            client.close();
            if(err) {
                next(err);
            } else {
                res.json(response);
            }
        })
    });
});

/**
 * Like / Dislike
 */
router.post('/like', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        LikeModel.addLikeOpen(client, req, res,function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});

/**
 * Comment
 */
router.post('/comment', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        PostCommentModel.addPostCommentOpen(client, req, res,function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});

/**
 * Edit comment
 */
router.put('/comment/:comment_id', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        PostCommentModel.editPostCommentOpen(client, req, res,function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});

/**
 * Delete comment
 */
router.delete('/comment/:comment_id', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        PostCommentModel.deletePostCommentOpen(client, req, res,function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});

/**
 * Add watermark
 */
router.post('/addwatermark', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        VideoModel.addWaterMark(client, req, res, function (err, response) {
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});

/**
 * Delete watermark video
 */
router.delete('/deleteVideo', function(req, res, next) {
    VideoModel.deleteVideo(req, res, function (err, response) {
        if(err){
            next(err);
        }else{
            res.json(response);
        }
    })
});

/**
 * Most popular post seen
 */
router.put('/:post_id/most-popular-seen', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        PostModel.updateMostPopularSeenOpen(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});

/**
 * Video play count
 */
router.put('/:post_id/videoplaycount', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        PostModel.updateVideoPlayCount(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});

/**
 * Post view count
 */
router.put('/:post_id/postviewcount', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        PostModel.updatePostViewCount(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});

module.exports = router;
