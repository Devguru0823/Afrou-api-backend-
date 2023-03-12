'use strict';
const Model = require('./user_photos.json');
const USER_MODEL = require('./user.json');
let utility = require('../utilities');

module.exports.getUserPhotos = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let userPhotoCollection = CONNECTION.collection(Model.collection_name);
    let user_id = req.authorization.user_id;
    if (req.params.user_id) {
        user_id = Number(req.params.user_id);
    }
    checkGalleryAccess(CONNECTION, req.authorization.user_id, user_id, function (allowed) {
        if (allowed) {
            userPhotoCollection.find({ user_id: user_id, photo_status: 'active' }).sort({ user_photo_id: -1 }).toArray((err, userPhotoList) => {
                if (err) {
                    cb(err);
                } else {
                    let finalResponse = {};
                    finalResponse.status = true;
                    finalResponse.data = userPhotoList;
                    cb(null, finalResponse);
                }
            });
        } else {
            let error = new Error('You don\'t have permission to access this gallery');
            cb(error);
        }

    });

};

module.exports.addUserPhoto = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let userPhotoCollection = CONNECTION.collection(Model.collection_name);

    let newUserPhotoData = utility.filterBody(req.body);
    if (newUserPhotoData === {}) {
        return cb({ error: 'invalid data' }, false);
    }
    utility.validatePostData(CONNECTION, newUserPhotoData, Model, 'insert', 0, function (err, validatedData) {
        if (err) {
            cb(err);
        } else {
            userPhotoCollection.insertOne(validatedData, function (err, response) {
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


module.exports.deleteUserPhoto = function (CLIENT, req, res, cb) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let userPhotoCollection = CONNECTION.collection(Model.collection_name);
    let user_photo_id = Number(req.params.user_photo_id);
    userPhotoCollection.deleteOne({ user_photo_id: user_photo_id }, function (err, response) {
        if (err) {
            cb(err);
        } else {
            let finalResponse = {};
            finalResponse.status = true;
            finalResponse.message = 'Photo Deleted successfully';
            cb(null, finalResponse);
        }
    });
};


let checkGalleryAccess = function (CONNECTION, currentUserId, friendUserId, callback) {
    if (currentUserId === friendUserId) {
        callback(true);
    } else {
        let userCollection = CONNECTION.collection(USER_MODEL.collection_name);
        userCollection.countDocuments({ user_id: currentUserId, friend_ids: friendUserId }, function (err, count) {
            if (err) {
                callback(false);
            } else {
                if (count === 0) {
                    callback(false);
                } else {
                    callback(true);
                }
            }

        });
    }
};
