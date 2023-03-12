var express = require('express');
var router = express.Router();
var utility = require('../../utilities');
var Model = require('../../models/v2/post');
var AUTH = require('../../_helpers/v2/authentication');

const MEDIA = require('../../models/v2/media');


/**
 * AFRO SWAGGER
 */
router.get('/afroswagger', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        // Model.getPosts(client, req, res, 'afroswagger', function (err, response) {
        Model.getAfroswaggerPosts(client, req, res, 'afroswagger', function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
                res.json(response);
            }
        })
    });
});

/**
 * AFROU TALENT
 */

router.get('/afrotalent', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getPosts(client, req, res, 'afrotalent', function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
                res.json(response);
            }
        })
    });
});

router.get('/entertainment', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getEntertainmentPosts(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
                res.json(response);
            }
        })
    });
});

router.get('/post-backgrounds', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getPostBackgrounds(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
                res.json(response);
            }
        })
    });
});


router.get('/hashtag/:hashtag_slug', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getHashtagPosts(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
                res.json(response);
            }
        })
    });
});


/**
 * MOST POPULAR POSTS
 */

router.get('/most-popular', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getMostPopulatPosts(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
                res.json(response);
            }
        })
    });
});

router.get('/most-popular/v2', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getMostPopulatPostsV2(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
                res.json(response);
            }
        })
    });
});

router.get('/most-popular-mobile', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getMostPopulatPostsNew(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
                res.json(response);
            }
        })
    });
});



// add new post

router.post('/', function(req, res, next) {
  utility.mongoConnect(req, res, function (client) {
      Model.addPost(client, req, res,function (err, response) {
          client.close();
          if(err){
              next(err);
          }else{
            response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
              res.json(response);
          }
      })
  });
});


router.post('/upload', MEDIA.addPostMedia, MEDIA.afterPostMediaUpload);

router.post('/upload-video', MEDIA.addPostVideo, MEDIA.afterPostVideoUpload);

router.post('/upload-video-new', MEDIA.addPostVideoNew, MEDIA.afterPostVideoUploadNew);

router.get('/get-posts', (req, res, next) => {
    utility.mongoConnect(req, res, (CLIENT) => {
        Model.getUserPosts(CLIENT, req, res, req.authorization.user_id, (err, posts) => {
            CLIENT.close();
            if(err) {
                next(err);
                return;
            }
            posts.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
            return res.status(200).json(posts);
        });
    });
})

router.get('/:post_id', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getPostById(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
                res.json(response);
            }
        })
    });
});

router.put('/:post_id', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.editPost(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
                res.json(response);
            }
        })
    });
});

router.put('/:post_id/videoplaycount', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.updateVideoPlayCount(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
                res.json(response);
            }
        })
    });
});

router.put('/:post_id/postviewcount', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.updatePostViewCount(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
                res.json(response);
            }
        })
    });
});

router.delete('/:post_id', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.deletePost(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
                res.json(response);
            }
        })
    });
});


router.post('/:post_id/report', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.reportPostByPostId(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
                res.json(response);
            }
        })
    });
});


router.delete('/:post_id/hide', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.hidePostByPostId(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
                res.json(response);
            }
        })
    });
});


router.get('/:post_id/likes', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getPostLikes(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
                res.json(response);
            }
        })
    });
});


router.put('/:post_id/afroswagger', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.updatePostSeenuser(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
                res.json(response);
            }
        })
    });
});

router.get('/afroswagger/seen', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getPostSeenuser(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
                res.json(response);
            }
        })
    });
});

router.put('/:post_id/most-popular-seen', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.updateMostPopularSeen(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
                res.json(response);
            }
        })
    });
});

module.exports = router;

