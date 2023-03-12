var express = require('express');
var router = express.Router();
const autobotModel = require('../../models/v2/autobot');
const Model = require('../../models/v2/autobot');
// const AUTH = require('../_helpers/authentication');

router.post('/register', function(req, res, next) {
    autobotModel.registerUser(req, res, function (err, response) {
        if(err) {
            next(err);
        } else {
            res.json(response);
        }
    });
});

router.post('/followuser', function(req, res, next) {
    autobotModel.usertofollow(req, res, function (err, response) {
        if(err) {
            next(err);
        } else {
            res.json(response);
        }
    });
});

router.post('/followcelebrityuser', function(req, res, next) {
    Model.celebrityusertofollow(req, res, function (err, response) {
        if(err) {
            next(err);
        } else {
            res.json(response);
        }
    });
});

module.exports = router;