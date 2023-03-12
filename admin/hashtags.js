'use strict';
var express = require('express');
var router = express.Router();
var utility = require('../utilities');

router.get('/', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        let CONNECTION = client.db(utility.dbName);
        let hashtagCollection = CONNECTION.collection('hashtags');

        let skip = 0;
        let limit = 10;
        let page = 1;
        if(req.query.page){
            page = Number(req.query.page);
            skip = (page - 1) * limit;
        }
        hashtagCollection.find({}).skip(skip).limit(limit).toArray((err, hashtagsArray)=>{
            client.close();
            if(err){
                next(err);
            }else{
                res.json({data: hashtagsArray});
            }
        });
    });
});

module.exports = router;
