var express = require('express');
var router = express.Router();
var utility = require('../../utilities');
var Model = require('../../models/v2/announcement');
var AUTH = require('../../_helpers/v2/authentication');

// const MEDIA = require('../models/media');


/**
 * Get announcement
 */
router.get('/', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getAnnouncement(client, req, res, function (err, response) {
            client.close();
            if(err) {
                next(err);
            } else {
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
                res.json(response);
            }
        })
    });
});

/**
 * Add Or Update announcement
 */
router.post('/', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.addUpdateAnnouncement(client, req, res, function (err, response) {
            client.close();
            if(err) {
                next(err);
            } else {
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
                res.json(response);
            }
        })
    });
});

module.exports = router;