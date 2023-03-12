'use strict';
let utility = require('../../utilities');


module.exports.getAdvertisements = function (CLIENT, req, res, cb) {

    var post  = {status: 'active', adtype: 'Mobile Ad'};
    CLIENT.query(`SELECT * FROM advert where status = 'active' AND adtype != 'Mobile Ad' ORDER BY RAND() LIMIT 2`, function(err, ads){
        if(err){
            cb(err);
        }else{
            let adsArr = [];
            let countShort = 0;
            ads.forEach(ad=>{
                if(ad.adtype === 'Small Ad'){
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
    CLIENT.query('select * from advert', function (err, ads) {
        cb(err, ads)
    });
};

