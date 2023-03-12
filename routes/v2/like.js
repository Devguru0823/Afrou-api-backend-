var express = require('express');
var router = express.Router();
var utility = require('../../utilities');
var Model = require('../../models/v2/likes');
var AUTH = require('../../_helpers/v2/authentication');
const PERMISSIONS = require('../../_helpers/checkAccessPermission');
const likeModel = require('../../models/v2/likes.json');

/* GET Likes. */
router.get('/', function (req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getLike(client, req, res, function (err, response) {
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

router.get('/all', function(req, res, next) {
    utility.mongoConnect(req, res, (client) => {
        Model.getAllUserLikes(client, req, res, (err, response) => {
            client.close();
            if(err) return next(err);
            res.json(response);
        });
    });
})
// add new like

router.post('/', function (req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.addLike(client, req, res, function (err, response) {
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

// add new like

router.post('/story', function (req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.addStoryLike(client, req, res, function (err, response) {
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

// message like
router.post('/message', PERMISSIONS.checkAccessPermission, function (req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.addMessageLike(client, req, res, function (err, response) {
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

module.exports = router;
