var express = require('express');
var router = express.Router();
var utility = require('../utilities');
var AUTH = require('../_helpers/authentication');

let POST_MODEL = require('../models/post.js');
let PROFILE_MODEL = require('../models/profile.js');
let FRIEND_REQUEST_MODEL = require('../models/friend_request.js');
const MEDIA = require('../models/media');
const USER_PHOTO = require('../models/user_photos.js');

/**
 * MY PROFILE POSTS
 */
router.get('/posts', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        POST_MODEL.getPosts(client, req, res, 'profile', function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});


router.get('/my-hashtags', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        PROFILE_MODEL.getMyHashTags(client, req, res, function (err, response) {
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
 * My PROFILE Details
 */
router.get('/', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        let user_id = req.authorization.user_id;
        PROFILE_MODEL.getUserProfile(client, req, res, user_id,function (err, response) {
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
 * My PROFILE SETTINGS
 */
router.get('/settings', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        PROFILE_MODEL.getProfileSetting(client, req, res,function (err, response) {
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
 * UPDATE PROFILE SETTINGS
 */
router.put('/settings', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        PROFILE_MODEL.updateProfileSetting(client, req, res,function (err, response) {
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
 * FRIENDS
 */
router.get('/friends', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        PROFILE_MODEL.getFriendList(client, req, res, function (err, response) {
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
 * Followers
 */
router.get('/followers', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        PROFILE_MODEL.getFollowerList(client, req, res, function (err, response) {
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
 * Followings
 */
router.get('/followings', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        PROFILE_MODEL.getFollowingList(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});


// GET SUGGESTED PEOPLE

router.get('/suggested-people', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        PROFILE_MODEL.getSuggestedPeople(client, req, res, function (err, response) {
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
 * Upload Profile Photo
 */

router.post('/update-profile-picture', MEDIA.addProfileMedia, function (req, res, next){
    utility.mongoConnect(req, res, function (client) {
        MEDIA.afterProfileMediaUpload(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});

router.post('/update-profile-cover', MEDIA.addProfileMedia, function (req, res, next){
    utility.mongoConnect(req, res, function (client) {
        MEDIA.afterProfileCoverMediaUpload(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});


/*** PHOTO GALLERY****/


/**
 * Upload Profile Photo
 */

router.post('/photos', MEDIA.addUserPhoto, function (req, res, next){
    utility.mongoConnect(req, res, function (client) {
        MEDIA.afterUserPhotoUpload(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});


router.get('/photos', function (req, res, next){
    utility.mongoConnect(req, res, function (client) {
        USER_PHOTO.getUserPhotos(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});

router.get('/find-friends', function (req, res, next){
    utility.mongoConnect(req, res, function (client) {
        PROFILE_MODEL.findFriends(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});

// Get My Friend Requests
router.get('/follow-requests', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        FRIEND_REQUEST_MODEL.getFollowRequests(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});




// Get My Friend Requests
router.get('/follow-requests', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        FRIEND_REQUEST_MODEL.getFollowRequests(client, req, res, function (err, response) {
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
 * Other User PROFILE Details
 */
router.get('/:user_id', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        let user_id = Number(req.params.user_id);
        PROFILE_MODEL.getUserProfile(client, req, res, user_id,function (err, response) {
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
 * Other User Posts
 */
router.get('/:user_id/posts', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        let user_id = Number(req.params.user_id);
        POST_MODEL.getUserPosts(client, req, res, user_id,false, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});

// Block User
router.get('/:user_id/block', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        FRIEND_REQUEST_MODEL.blockUser(client, req, res, function (err, response) {
            FRIEND_REQUEST_MODEL.deleteFollowRequest(client, req, res, function (err, response2) {
                FRIEND_REQUEST_MODEL.deleteFriend(client, req, res, function (err, response3){
                    FRIEND_REQUEST_MODEL.unFollowUser(client, req, res, function (err, response4) {
                        client.close();
                        if(err){
                            next(err);
                        }else{
                            res.json({status: true, message: "Block Successful"});
                        }
                    });
                });
            });
        })
    });
});



router.get('/:user_id/unblock', function (req, res, next){
    utility.mongoConnect(req, res, function (client) {
        FRIEND_REQUEST_MODEL.unblockUser(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json({status: true, message: "Unblock Successful"});
            }
        })
    });
});


/**
 * OTHER USER GALLERY
 */

router.get('/:user_id/photos', function (req, res, next){
    utility.mongoConnect(req, res, function (client) {
        USER_PHOTO.getUserPhotos(client, req, res, function (err, response) {
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
 * SEND FRIEND REQUEST
 * Changed to ROLE MODEL
 */
router.get('/:user_id/add-friend', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        FRIEND_REQUEST_MODEL.addRoleModel(client, req, res, function (err, response) {
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
 * ACCEPT FRIEND REQUEST
 */
router.get('/:user_id/confirm-follow', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        FRIEND_REQUEST_MODEL.acceptFollowRequest(client, req, res, function (err, response) {
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
 * DELETE FOLLOW REQUEST FROM EITHER USER
 */
router.get('/:user_id/cancel-follow-request', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        FRIEND_REQUEST_MODEL.deleteFollowRequest(client, req, res, function (err, response) {
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
 * DELETE FRIEND
 */
router.get('/:user_id/cancel-friend', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        FRIEND_REQUEST_MODEL.deleteFriend(client, req, res, function (err, response) {
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
 * Follow User
 */
router.get('/:user_id/follow', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        FRIEND_REQUEST_MODEL.followUser(client, req, res, function (err, response) {
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
 * Unfollow User
 */
router.get('/:user_id/cancel-follow', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        FRIEND_REQUEST_MODEL.unFollowUser(client, req, res, function (err, response) {
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
