"use strict";
let utility = require("../../utilities");
const { userCollectionName } = require("../../models/message");

module.exports.removeArchiveUsers = function (args, context, req, res, cb) {
  return new Promise((resolve, reject) => {
    utility.mongoConnect(req, res, function (CLIENT) {
      let CONNECTION = CLIENT.db(utility.dbName);
      let userCollection = CONNECTION.collection(userCollectionName);

      let from_id = Number(context.user.user_id);
      let to_id = args.toId;

      if (args.toId) {
        args.toId.forEach((toId, index) => {
          args.toId[index] = Number(toId);
        });
      }
console.log(to_id)
      let addToArchive = {
        archived_users: { $in: to_id },
      };

      userCollection.findOneAndUpdate(
        { user_id: from_id },
        { $pull: addToArchive },
        { returnOriginal: false },
        async function (err, response) {
          if (err) {
            // cb(err);
            reject(err)
          } else {
            // let finalResponse = {};
            // finalResponse.status = true;
            // finalResponse.data = response.value;
            resolve(response.value);
          }
        }
      );
    });
  });
};
