'use strict';
let utility = require('../../utilities');


module.exports.getAdvertisements = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let advertCollection = CONNECTION.collection('advert');

    advertCollection
        .aggregate([
            {
                $match: {
                    status: 'active',
                    adType: {$ne: 'Mobile Ad'}
                }
            },
            {
                $sample: {
                    size: 2
                }
            }
        ])
        .toArray((err, ads)=>{
        if(err){
            cb(err);
        }else{
            let adsArr = [];
            let countShort = 0;
            ads.forEach(ad=>{
                if(ad.adType === 'Small Ad'){
                    countShort++;
                }else{
                    adsArr = [ad];
                }
            });
            if(countShort === 2){
                adsArr = ads;
            }
            let finalResponse = {};
            finalResponse.status = true;
            finalResponse.data = adsArr;
            cb(null, finalResponse);
        }
    });
};



module.exports.getMobileAdvertisements = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let advertCollection = CONNECTION.collection('advert');
    advertCollection.find({status: 'active', adType: 'Mobile Ad'})
        .toArray((err, ads)=>{
            cb(err, ads);
        });
};

