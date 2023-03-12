var express = require('express');
var router = express.Router();
var utility = require('../utilities');
var Model = require('../models/hashtag');
var AUTH = require('../_helpers/authentication');

const MEDIA = require('../models/media');

/* GET Image listing. */


router.get('/store', function(req, res, next) {
  console.log('1')
  utility.mongoConnect(req, res, function (client) {
    storeImage(client, req, res, function (err, response) {
      client.close();
      if(err){
        next(err);
      }else{
        res.json(response);
      }
    })

  });
});

router.get('/:image_name', function(req, res, next) {
  utility.mongoConnect(req, res, function (client) {
    getImage(client, req, res, function (err, response) {
      client.close();
      if(err){
        next(err);
      }else{
        if(req.query.type === 'base64') {
          res.end(response['file_content']);
        }else {
          const im = response['file_content'].split(",")[1];

          const img = Buffer.from(im, 'base64');

          res.writeHead(200, {
            'Content-Type': 'image/jpeg',
            'Content-Length': img.length
          });

          res.end(img);
        }

      }
    })

  });
});


const getImage = (client, req, res, callback) => {
  let CONNECTION = client.db(utility.dbName);
  const imageDb = CONNECTION.collection('demo_images');
  imageDb.findOne({file_name: req.params.image_name}, (err, foundImage) => {
    if(err || !foundImage) {
      callback(new Error('Invalid'));
    }else {
      callback(null, foundImage);
    }
  });

};


const storeImage = (client, req, res, callback) => {
  console.log('Store Image')
  let CONNECTION = client.db(utility.dbName);
  const imagePath = req.query['path'];
  const imageDb = CONNECTION.collection('demo_images');
  const request = require('request-promise-native');

  let jpgDataUrlPrefix = 'data:image/jpg;base64,';
  let imageUrl         = 'https://cdn.afrocamgist.com/' + imagePath;
  console.log('Inside')
  request({
    url: imageUrl,
    method: 'GET',
    encoding: null // This is actually important, or the image string will be encoded to the default encoding
  })
    .then(result => {
      let imageBuffer  = Buffer.from(result);
      let imageBase64  = imageBuffer.toString('base64');
      let imageDataUrl = jpgDataUrlPrefix+imageBase64;
      imageDb.insertOne({file_name: imageUrl.split('/').pop(), file_content: imageDataUrl}, callback);
    })
    .catch(error => {
      callback(error);
    })
};
module.exports = router;
