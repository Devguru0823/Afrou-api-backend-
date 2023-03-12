'use strict';
const Model = require('./ad_request.json');
const sqldbConn = require('../../config/SqldbConnection');
let utilities = require('../../utilitie');


module.exports.addAdRequest = function (CLIENT, req, res, cb) {   
    let newAd_requestData = utilities.filterBody(req.body);
    if (newAd_requestData === {}) {
        return cb({ error: 'invalid data' }, false);
    }
    newAd_requestData.requested_by = req.authorization.user_id;
    utilities.validatePostData(CLIENT, newAd_requestData, Model, 'insert', 0, function (err, validatedData) {
        if (err) {
            cb(err);
        } else {
            CLIENT.query(`INSERT INTO ${Model.collection_name} SET ?`, validatedData, function (err, res) {
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

