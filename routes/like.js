var express = require('express');
var router = express.Router();
var utility = require('../utilities');
var Model = require('../models/likes');
var AUTH = require('../_helpers/authentication');
const PERMISSIONS = require('../_helpers/checkAccessPermission');

/* GET Likes. */
router.get('/', function (req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getLike(client, req, res, function (err, response) {
            client.close();
            if (err) {
                next(err);
            } else {
                res.json(response);
            }
        })
    });
});

// add new like

router.post('/', function (req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.addLike(client, req, res, function (err, response) {
            client.close();
            if (err) {
                next(err);
            } else {
                res.json(response);
            }
        })
    });
});

// add new like

router.post('/story', function (req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.addStoryLike(client, req, res, function (err, response) {
            client.close();
            if (err) {
                next(err);
            } else {
                res.json(response);
            }
        })
    });
});

// message like
router.post('/message', PERMISSIONS.checkAccessPermission, function (req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.addMessageLike(client, req, res, function (err, response) {
            client.close();
            if (err) {
                next(err);
            } else {
                res.json(response);
            }
        })
    });
});

module.exports = router;