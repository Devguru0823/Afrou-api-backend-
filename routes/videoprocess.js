const express = require('express');
const router = express.Router();
const utility = require('../utilities');
const Model = require('../models/videoprocess');
const AUTH = require('../_helpers/authentication');

router.post('/addwatermark', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.addWaterMark(client, req, res, function (err, response) {
            if(err){
                next(err);
            }else{
                res.json(response);
            }
        })
    });
});

router.delete('/deleteVideo', function(req, res, next) {
    Model.deleteVideo(req, res, function (err, response) {
        if(err){
            next(err);
        }else{
            res.json(response);
        }
    })
});

module.exports = router;