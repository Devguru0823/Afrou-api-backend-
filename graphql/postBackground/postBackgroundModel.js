// const utilities = require
const { getPostBackgrounds } = require("../../models/post");
let utility = require("../../utilities");

module.exports.postBackgrounds = function (req, res) {
  return new Promise((resolve, reject) => {
    utility.mongoConnect(req, res, function (client) {
      getPostBackgrounds(client, req, res, function (err, response) {
          console.log({err,response})
        if (err) return reject(err);
        else return resolve(response);
      });
    });
  });
};
