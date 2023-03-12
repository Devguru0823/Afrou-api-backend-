'use strict';
const express = require('express');
const router = express.Router();
const utility = require('../utilities');


router.get('/', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        let CONNECTION = client.db(utility.dbName);
        let postCollection = CONNECTION.collection('post');
        let userCollection = CONNECTION.collection('user');
        postCollection.countDocuments({posted_for: 'afroswagger'}, function (err, swaggerCount) {
            postCollection.countDocuments({posted_for: 'afrotalent'}, function (err, tallentCount) {
                userCollection.countDocuments({}, function (err, userCount) {
                    let finalResponse ={};
                    finalResponse.afroswagger_posts_count = swaggerCount;
                    finalResponse.afrotallent_posts_count = tallentCount;
                    finalResponse.user_count = userCount;
                    res.json(finalResponse);
                })
            })
        })
    });
});



module.exports = router;
