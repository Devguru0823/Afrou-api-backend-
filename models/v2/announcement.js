'use strict';
const Model = require('./announcement.json');
let utility = require('../../utilities');
const SITE_CONFIG = require('../../configs/siteConfig');
const request = require('request');
const bodyParser = require('body-parser');

module.exports.getAnnouncement = function(CLIENT, req, res, cb) {
  let CONNECTION = CLIENT.db(utility.dbName);
  let announcementCollection = CONNECTION.collection(Model.collection_name);

  announcementCollection.aggregate([
    // { $match: { "post_status": "active" } },
    // { $sort: { "announcement_id": -1 } },
    postProjection
  ]).toArray((err, annList) => {
    if (err) {
      cb(err);
    } else {
      let finalResponse = {};
      finalResponse.status = true;
      finalResponse.data = annList;
      cb(null, finalResponse);
    }
  });

};

module.exports.addUpdateAnnouncement = function(CLIENT, req, res, cb) {
  let CONNECTION = CLIENT.db(utility.dbName);
  let announcementCollection = CONNECTION.collection(Model.collection_name);

  let message = req.body.message ? req.body.message : "";
  let link = req.body.link ? req.body.link : "";
  let status = req.body.status ? parseInt(req.body.status) : 0;

  announcementCollection.aggregate([
    { $match: { "announcement_id": 1 } }
  ]).toArray((err, annList) => {
    if (err) {
      cb(err);
    } else {
      if(annList[0]) {
        var validatedData = {
          "message": message,
          "link": link,
          "status": status
        }
        announcementCollection.findOneAndUpdate({ announcement_id: 1 }, { $set: validatedData }, async function (err, response) { 
          if(err) {
            cb(err);
          } else {
            // console.log(response);
          }
        });
      } else {
        var validatedData = {
          "announcement_id": 1,
          "message": message,
          "link": link,
          "status": status
        }
        announcementCollection.insertOne(validatedData, async function (err, response) { 
          if(err) {
            cb(err);
          } else {
            // console.log(response);
          }
        });
      }
      let finalResponse = {};
      finalResponse.status = true;
      finalResponse.data = [];
      cb(null, finalResponse);
    }
  });

};

const postProjection = {
  $project: {
    message: 1,
    link: 1,
    status: 1,
    _id: 0,
    announcement_id: 1
  }
};

