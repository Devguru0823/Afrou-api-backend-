"use strict";
const Model = require("../../models/post.json");
let utility = require("../../utilities");

module.exports.updateVideoPlayCount = function (args,context, req, res, ) {
  return new Promise((resolve, reject) => {
    utility.mongoConnect(req, res, function (CLIENT) {
      let CONNECTION = CLIENT.db(utility.dbName);
      let postCollection = CONNECTION.collection(Model.collection_name);
      let post_id = Number(args.postId);

      postCollection.findOne(
        { post_id: post_id, post_type: "video" },
        function (err, result) {
          if (err) {
            reject(err);
          } else {
            if (result) {
              var min = Math.ceil(35);
              var max = Math.floor(45);
              let RanNo = Math.floor(Math.random() * (max - min) + min);
              var curCount = RanNo;
              console.log("RanNo: " + RanNo);
              if (result.video_play_count) {
                var curCount = Number(result.video_play_count);
                curCount = parseInt(curCount) + parseInt(RanNo);
                postCollection.findOneAndUpdate(
                  {
                    post_id: post_id,
                  },
                  { $set: { video_play_count: curCount } },
                  function (err, response) {
                    if (err) {
                      reject(err);
                    } else {
                      console.log(result);
                      let finalResponse = {};
                      // finalResponse.status = true;
                      finalResponse.counter = curCount;
                      resolve(finalResponse);
                    }
                  }
                );
              } else {
                postCollection.findOneAndUpdate(
                  {
                    post_id: post_id,
                  },
                  { $set: { video_play_count: curCount } },
                  function (err, response) {
                    if (err) {
                      reject(err);
                    } else {
                      console.log(result);
                      let finalResponse = {};
                      // finalResponse.status = true;
                      finalResponse.counter = curCount;
                      resolve( finalResponse);
                    }
                  }
                );
              }
            } else {
              let finalResponse = {};
              finalResponse.status = false;
              finalResponse.result = "No post found";
              reject(finalResponse);
            }
          }
        }
      );
    });
  });
};
