'use strict';
const Model = require('./announcement.json');

module.exports.getAnnouncement = function(CLIENT, req, res, cb) {
  CLIENT.query(`SELECT message, link, status, announcement_id FROM ${Model.collection_name}`, function(err, annList){
    if (err) {
      cb(err);
    } else { 
      let finalResponse = {};
      finalResponse.status = true;
      finalResponse.data = annList;
      cb(null, finalResponse);
    }
  })

};
  const getQuery = async (CLIENT) => {
    return await new Promise((resolve, reject) =>{
    CLIENT.query(`SELECT * FROM announcement WHERE announcement_id=?`,1, function (err, result) {
      resolve(result);
    });
    });
  }
module.exports.addUpdateAnnouncement = async function(CLIENT, req, res, cb) {
  let message = req.body.message ? req.body.message : "";
  let link = req.body.link ? req.body.link : "";
  let status = req.body.status ? parseInt(req.body.status) : 0;
  var check = await getQuery(CLIENT);
  if(check[0]) {
    CLIENT.query(`UPDATE announcement SET message=?, link=?, status=?  WHERE announcement_id = ?`, [message, link, status, 1],  function(err, res){
      if(err) {
        cb(err);
      } else {
      }
    });
  } else {
    var validatedData = {
      announcement_id: 1,
      message: message,
      link: link,
      status: status
    }
    CLIENT.query('INSERT INTO announcement SET ?', validatedData,  function (err, res) {
      if(err) {
        cb(err);
      } else {
      }
    });
  }
  let finalResponse = {};
  finalResponse.status = true;
  finalResponse.data = [];
  cb(null, finalResponse);
};
