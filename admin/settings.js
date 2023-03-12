'use strict';
var express = require('express');
var router = express.Router();
var utility = require('../utilities');

router.get('/autolike', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        let CONNECTION = client.db(utility.dbName);
        let settingCollection = CONNECTION.collection('settings');

        settingCollection.aggregate([
            {
                $match: {
                    "setting_id": 1,
                    "setting_type": "autolike"
                }
            }
        ]).toArray((err, settingData) => {
            if(err){
                next(err);
            }else{
                if(settingData) {
                    res.json({data: settingData});
                } else {
                    res.json({ data: "No data available" });
                }
            }
        });
    });
});

router.post('/autolike', function(req, res, next) {
    utility.mongoConnect(req, res, async function (client) {
        let CONNECTION = client.db(utility.dbName);
        let settingCollection = CONNECTION.collection('settings');

        let last24Hours = Number(req.body.last24Hours) ? Number(req.body.last24Hours) : 0;
        let last7Days = Number(req.body.last7Days) ? Number(req.body.last7Days) : 0;
        let last30Days = Number(req.body.last30Days) ? Number(req.body.last30Days) : 0;

        const query = { "setting_id": 1, "setting_type": "autolike" };
        const update = { $set: { last24Hours: last24Hours, last7Days: last7Days, last30Days: last30Days }};
        const options = { upsert: true };
        const settingData = await settingCollection.updateOne(query, update, options);
        if(settingData) {
            res.json({data: {
                last24Hours: last24Hours,
                last7Days: last7Days,
                last30Days: last30Days
            }});
        } else {
            res.json({ data: "No data available" });
        }
    });
});

module.exports = router;
