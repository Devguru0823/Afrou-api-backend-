"use strict";
const Model = require("../../models/post.json");
let utility = require("../../utilities");
const HASHTAG_MODULE = require("../../models/hashtag");

module.exports.editPost = function (args, context, req, res, ) {
  return new Promise((resolve, reject) => {
    utility.mongoConnect(req, res, function (CLIENT) {
      let CONNECTION = CLIENT.db(utility.dbName);
      let postCollection = CONNECTION.collection(Model.collection_name);
      let post_id = Number(args.postId);
      let body = utility.filterBody(args.post);
      if (body === {}) {
        return reject({ error: "invalid data" },);
      }

      const hashTags = utility.getHashTags(body.post_text);
      HASHTAG_MODULE.addUpdateHashtags(CLIENT, hashTags, (err, hashtagsArr) => {
        /* If not follower then follow */
        if (hashtagsArr[0]) {
          if (
            hashtagsArr[0].followers.indexOf(context.user.user_id) == -1
          ) {
            HASHTAG_MODULE.followHashtagFromPost(
              CLIENT,
              hashtagsArr[0].hashtag_slug,
              context.user.user_id,
              function (err, result) {
                console.log(result);
              }
            );
          }
        }
        /* *********** */
        if (!Array.isArray(hashtagsArr)) {
          hashtagsArr = [];
        }
        body.hashtags = hashtagsArr.map((x) => x.hashtag_slug);
        utility.validatePostData(
          CONNECTION,
          body,
          Model,
          "update",
          post_id,
          function (err, validatedData) {
            if (err) {
              reject(err);
            } else {
              postCollection.findOneAndUpdate(
                {
                  post_id: post_id,
                  posted_by: context.user.user_id,
                },
                { $set: validatedData },
                function (err, response) {
                  if (err) {
                    reject(err);
                  } else {
                    let finalResponse = {};
                    finalResponse.status = true;
                    resolve( finalResponse);
                  }
                }
              );
            }
          }
        );
      });
    });
  });
};
