var express = require('express');
var router = express.Router();
var utility = require('../utilities');
var Model = require('../models/group');
var PostModel = require('../models/post');
var AUTH = require('../_helpers/authentication');
const MEDIA = require('../models/media');

/* GET group listing. */
router.get('/my-groups',AUTH.authenticate, function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
      Model.getMyGroups(client, req, res, function (err, response) {
          client.close();
          if(err){
              next(err);
          }else{
              res.json(response);
          }
      })

    });
  });

router.get('/my-membership-groups',AUTH.authenticate, function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getMembershipMyGroups(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })

    });
});


router.get('/my-joined-groups',AUTH.authenticate, function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getMyJoinedGroups(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })

    });
});


router.get('/my-invited-groups',AUTH.authenticate, function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getMyInvitedGroups(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })

    });
});



router.get('/find', AUTH.authenticate, function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.findGroups(client, req, res,function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});


  
  // add new group
  
  router.post('/', AUTH.authenticate, function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.addGroup(client, req, res,function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
  });

// Leave Group
router.get('/leave/:group_id', AUTH.authenticate, function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.leaveOthersGroup(client, req, res,function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});

// Send Group Invite
router.get('/:group_id/invite/:user_id', AUTH.authenticate, function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.sendGroupInvite(client, req, res,function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});

// Accept Group Invite
router.get('/accept/:group_id', AUTH.authenticate, function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.acceptGroupInvite(client, req, res,function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});



// List of friends to invite
router.get('/:group_id/invite-friends', AUTH.authenticate, function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getFriendListForGroupInvitation(client, req, res,function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});

// Delete My Group
router.delete('/:group_id', AUTH.authenticate, function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.deleteMyGroup(client, req, res,function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});


router.get('/join/:group_id', AUTH.authenticate, function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.joinGroup(client, req, res,function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});

// Group Details
router.get('/:group_id', AUTH.authenticate, function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getGroupDetails(client, req, res,function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});

// Group Details
router.get('/:group_id/memberlist', AUTH.authenticate, function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getMemberList(client, req, res,function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});

// Group Details
router.put('/:group_id', AUTH.authenticate, function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.editGroupDetails(client, req, res,function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});

// Group Posts
router.get('/posts/:group_id', AUTH.authenticate, function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        PostModel.getGroupPosts(client, req, res,function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});

// Add Group Post
router.post('/posts/:group_id', AUTH.authenticate, function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        req.body.posted_for = 'group';
        req.body.group_id = Number(req.params.group_id);

        let CONNECTION = client.db(utility.dbName);
        utility.checkGroupMembership(CONNECTION, req.body.group_id, req.authorization.user_id, function (isAllowed) {
            if(isAllowed){
                PostModel.addPost(client, req, res,function (err, response) {
                    client.close();
                    if(err){
                        next(err);
                    }else{
                        res.json(response);
                    }
                })
            }else{
                let error = new Error();
                error.name = 'PERMISSION_DENIED_ERROR';
                next(error);
            }
        });

    });
});


// GROUP Picture

router.post('/:group_id/update-group-picture', MEDIA.addGroupMedia, function (req, res, next){
    utility.mongoConnect(req, res, function (client) {
        MEDIA.afterGroupMediaUpload(client, req, res, function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});

// GROUP Cover Picture

router.post('/:group_id/update-group-cover', MEDIA.addGroupMedia, function (req, res, next){
    utility.mongoConnect(req, res, function (client) {
        MEDIA.afterGroupCoverMediaUpload(client, req, res, function (err, response) {
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
