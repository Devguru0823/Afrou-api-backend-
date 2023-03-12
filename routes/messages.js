var express = require('express');
var router = express.Router();
var utility = require('../utilities');
var Model = require('../models/message');
var AUTH = require('../_helpers/authentication');

const MEDIA = require('../models/media');

/* GET message listing. */
router.get('/', function (req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getMessagesListSocket(client, req, res, function (err, response) {
            client.close();
            if (err) {
                next(err);
            } else {
                res.json(response);
            }
        })

    });
});

// add new message
router.post('/conversation/:to_id', function (req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.addMessage(client, req, res, function (err, response) {
            client.close();
            if (err) {
                if (err.error === 'invalid data') {
                    return res.status(400).json({
                        status: false,
                        error: err.error
                    })
                }
                next(err);
            } else {
                res.json(response);
            }
        })
    });
});

/* Get message conversation */
router.get('/conversation/:user_id', function (req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getMessagesByUserId(client, req, res, function (err, response) {
            client.close();
            if (err) {
                next(err);
            } else {
                res.json(response);
            }
        })

    });
});

/* Get message conversation V2 */
router.get('/conversation/v2/:user_id', function (req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getMessagesByUserIdV2(client, req, res, function (err, response) {
            client.close();
            if (err) {
                next(err);
            } else {
                res.json(response);
            }
        })

    });
});

router.get('/:message_id', function (req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getMessagesStatusByUserId(client, req, res, function (err, response) {
            client.close();
            if (err) {
                next(err);
            } else {
                res.json(response);
            }
        })

    });
});

/* Edit message */
router.put('/:message_id', function (req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.updateMessage(client, req, res, function (err, response) {
            client.close();
            if (err) {
                next(err);
            } else {
                res.json(response);
            }
        })
    });
});

/* Delete message */
router.delete('/:message_id', function (req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.deleteMessage(client, req, res, function (err, response) {
            client.close();
            if (err) {
                next(err);
            } else {
                res.json(response);
            }
        })
    });
});

/* Reply message */
router.post('/conversation/:to_id/:message_id', function (req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.replyMessage(client, req, res, function (err, response) {
            client.close();
            if (err) {
                next(err);
            } else {
                res.json(response);
            }
        })
    });
});

/**
 * Delete all messages
 * from_id: <number>
 * to_id: <number>
 * delete_for: <1=Only for me, 2=For all>
 */
router.post('/deleteAll', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.deleteAllMessages(client, req, res,function (err, response) {
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
 * Delete Selected Messages
 * from_id: <number>
 * to_id: <number>
 * message_ids": <id array>
 * delete_for: <1=Only for me, 2=For all>
 */
router.post('/deleteSelected', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.deleteSelectedMessages(client, req, res,function (err, response) {
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
 * Get archived users/messages
 * from_id: <number>
 * type: "archivedAll"
 */
router.post('/getArchivedUsers', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getMessagesListSocket(client, req, res,function (err, response) {
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
 * Archive users
 * from_id: <number>
 * to_id: <array of id>
 */
router.post('/archiveUsers', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.archiveUsers(client, req, res,function (err, response) {
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
 * Remove archive users
 * from_id: <number>
 * to_id: <array of id>
 */
router.post('/removeArchiveUsers', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.removeArchiveUsers(client, req, res,function (err, response) {
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
 * Delete user from message list
 * from_id: <number>
 * to_id: <array of id>
 */
router.post('/deleteUserfromList', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.deleteUserfromMessageList(client, req, res,function (err, response) {
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
 * Delete all messages
 * from_id: <number>
 * to_id: <number>
 * delete_for: <1=Only for me, 2=For all>
 */
router.post('/deleteAll', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.deleteAllMessages(client, req, res,function (err, response) {
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
 * Delete Selected Messages
 * from_id: <number>
 * to_id: <number>
 * message_ids": <id array>
 * delete_for: <1=Only for me, 2=For all>
 */
router.post('/deleteSelected', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.deleteSelectedMessages(client, req, res,function (err, response) {
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
 * Get archived users/messages
 * from_id: <number>
 * type: "archivedAll"
 */
router.post('/getArchivedUsers', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getMessagesListSocket(client, req, res,function (err, response) {
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
 * Archive users
 * from_id: <number>
 * to_id: <array of id>
 */
router.post('/archiveUsers', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.archiveUsers(client, req, res,function (err, response) {
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
 * Remove archive users
 * from_id: <number>
 * to_id: <array of id>
 */
router.post('/removeArchiveUsers', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.removeArchiveUsers(client, req, res,function (err, response) {
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
 * Delete user from message list
 * from_id: <number>
 * to_id: <array of id>
 */
router.post('/deleteUserfromList', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.deleteUserfromMessageList(client, req, res,function (err, response) {
            client.close();
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});

router.post('/upload', MEDIA.addMessageMedia, MEDIA.afterMessageMediaUpload);

module.exports = router;
