var express = require('express');
var router = express.Router();
var utility = require('../../utilities');
var Model = require('../../models/v2/test');
var AUTH = require('../../_helpers/v2/authentication');


/**
 * Log file upload
 */
router.post('/upload', Model.uploadLog, Model.afterUploadLog);

/**
 * Socket message API to create message
 */
router.post('/addmessage', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.addMessage(client, req, res, function (err, response) {
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
 * Socket message API to create group
 */
router.post('/createmessagegroup', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        console.log(req.body);
        Model.createMessageGroup(client, req, res, function (err, response) {
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
 * Get fonts
 */
router.get('/getfonts', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getFonts(client, req, res, function (err, response) {
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
 * Add font
 */
router.post('/addfont', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.addFont(client, req, res, function (err, response) {
            client.close();
            if(err) {
                next(err);
            } else {
                res.json(response);
            }
        })
    });
});

module.exports = router;
