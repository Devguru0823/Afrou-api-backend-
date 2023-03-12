'use strict';
var express = require('express');
var router = express.Router();
var utility = require('../utilities');

router.get('/', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        let CONNECTION = client.db(utility.dbName);
        let emoneyCollection = CONNECTION.collection('emoney');
        
        let skip = 0;
        let limit = 20;
        let page = 1;
        if(req.query.page){
            page = Number(req.query.page);
            skip = (page - 1) * limit;
        }
        emoneyCollection.aggregate([
            {
                $skip: skip
            },
            {
                $limit: limit
            },
            {
                $lookup: {
                    from: "transaction",
                    localField: "transaction_id",
                    foreignField: "transaction_id",
                    as: "transactionDetails"
                }
            }
        ]).toArray((err, emoneyArray) => {
            if(err){
                next(err);
            }else{
                res.json({data: emoneyArray});
            }
        });
    });
});

router.put('/update_status', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        let CONNECTION = client.db(utility.dbName);
        let emoneyCollection = CONNECTION.collection('emoney');
        
        let adminStatus = req.body.status;
        let adminTransactionId = req.body.transaction_id;
        let adminTransactionDetail = req.body.transaction_detail;
        let adminTransactionScreenshot = req.body.transaction_screenshot;

        let updateData = {
            admin_status: adminStatus,
            admin_transaction_id: adminTransactionId,
            admin_transaction_detail: adminTransactionDetail,
            admin_transaction_image: adminTransactionScreenshot
        }

        emoneyCollection.findOneAndUpdate(
            { emoney_id: Number(req.body.emoney_id) }, 
            { $set: updateData}, 
            { returnOriginal: false }, 
            function (err, updatedData) { 
                if(err) {
                    console.log(err);
                    next(err);
                }
                console.log(updatedData)
                res.json({ data: updatedData.value });
            }
        );
    });
});

module.exports = router;
