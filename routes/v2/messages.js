var express = require('express');
var router = express.Router();
var utility = require('../../utilities');
var Model = require('../../models/v2/message');
var AUTH = require('../../_helpers/v2/authentication');

const MEDIA = require('../../models/v2/media');

/* GET message listing. */
router.get('/', function (req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getMessagesList(client, req, res, function (err, response) {
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
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
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
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
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
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
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
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
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
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
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
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
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
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
                res.json(response);
            }
        })
    });
});

router.post('/upload', MEDIA.addMessageMedia, MEDIA.afterMessageMediaUpload);

module.exports = router;
