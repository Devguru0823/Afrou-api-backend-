var express = require('express');
var router = express.Router();
var utility = require('../utilities');
var Model = require('../models/reports');
var AUTH = require('../_helpers/authentication');

const MEDIA = require('../models/media');

/**
 * User's interest of the poster
 * Get report for users who have created posts.
 * return user_id, first_name, last_name, user_name, interests
 */
router.get('/userInterestOfPoster', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.userInterestOfPoster(client, req, res, function (err, response) {
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
 * User's interest of the post liker
 * Get report for users who have commented on posts.
 * return user_id, first_name, last_name, user_name, interests, nationality
 */
router.get('/userInterestOfPostLiker', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.userInterestOfPostLiker(client, req, res, function (err, response) {
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
 * User's interest of the poste commenter
 * Get report for users who have commented on posts.
 * return user_id, first_name, last_name, user_name, interests
 */
router.get('/userInterestOfPostCommenter', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.userInterestOfPostCommenter(client, req, res, function (err, response) {
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