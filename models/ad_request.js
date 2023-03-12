'use strict';
const Model = require('./ad_request.json');
let utility = require('../utilities');


module.exports.addAdRequest = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let ad_requestCollection = CONNECTION.collection(Model.collection_name);

    let newAd_requestData = utility.filterBody(req.body);
    if (newAd_requestData === {}) {
        return cb({ error: 'invalid data' }, false);
    }
    newAd_requestData.requested_by = req.authorization.user_id;
    utility.validatePostData(CONNECTION, newAd_requestData, Model, 'insert', 0, function (err, validatedData) {
        if (err) {
            cb(err);
        } else {
            ad_requestCollection.insertOne(validatedData, function (err, response) {
                if (err) {
                    cb(err);
                } else {
                    let finalResponse = {};
                    finalResponse.status = true;
                    cb(null, finalResponse);
                }
            });
        }
    });
};

