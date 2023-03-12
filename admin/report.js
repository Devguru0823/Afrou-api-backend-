'use strict';
const express = require('express');
const router = express.Router();
const utility = require('../utilities');


router.get('/', function (req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        let CONNECTION = client.db(utility.dbName);
        let reportCollection = CONNECTION.collection('report');
        let status = 'pending';
        if (req.query.status && req.query.status === 'resolved') {
            status = 'resolved';
        }
        let skip = 0;
        let limit = 10;
        let page = 1;
        if (req.query.page) {
            page = Number(req.query.page);
            skip = (page - 1) * limit;
        }
        let report_for = req.params.report_for;
        let condition = {
            report_status: status
        };
        if (report_for) {
            condition.report_for = report_for;
        }
        reportCollection
            .aggregate([
                {
                    $match: condition
                },
                {
                    $sort: {
                        report_time: -1
                    }
                },
                {
                    $skip: skip
                },
                {
                    $limit: limit
                },
                {
                    $lookup: {
                        from: "post",
                        localField: "post_id",
                        foreignField: "post_id",
                        as: "postDetails"
                    }
                },
                {
                    $addFields: {
                        post_details: {$arrayElemAt: ["$postDetails", 0]}
                    }
                },
                {
                    $project: {
                        postDetails: 0
                    }
                }
            ]).toArray((err, reportsArray) => {
            client.close();
            if (err) {
                next(err);
            } else {
                res.json({data: reportsArray});
            }
        });
    });
});


module.exports = router;
