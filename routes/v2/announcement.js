var express = require('express');
var router = express.Router();
var utilities = require('../../utilitie');
var announcementModel = require('../../models/v2/announcement');
/**
 * Get announcement
 */
router.get('/', function(req, res, next) {
    utilities.MysqlConnect(req, res, function (client) {
        announcementModel.getAnnouncement(client, req, res, function (err, response) {
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
    utilities.MysqlConnect(req, res, function (client) {
        announcementModel.addUpdateAnnouncement(client, req, res, function (err, response) {
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