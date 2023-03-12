var express = require('express');
var router = express.Router();
var utility = require('../utilities');
var Model = require('../models/storyline');
var AUTH = require('../_helpers/authentication');

const MEDIA = require('../models/media');

const logger = require("../_helpers/logger")
/**
 * Get storyline
 */
router.get('/', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getStoryline(client, req, res, function (err, response) {
            if(err) {
                client.close();
                // consoel.log(err)
                // logger.error(err)
                next(err);
            } else {
                res.json(response);
                // logger.info(response)
            }
        })
    });
});

/**
 * Create storyline
 */

router.post('/', function(req, res, next) {
  utility.mongoConnect(req, res, function (client) {
      Model.createStoryline(client, req, res,function (err, response) {
          if(err) {
              client.close();
              next(err);
                logger.error(err)
          } else {
              res.json(response);
                logger.info(response)
          }
      })
  });
});

/**
 * Upload media files
 */
router.post('/upload', MEDIA.addPostMedia, MEDIA.afterPostMediaUpload);

router.post('/upload-video', MEDIA.addPostVideo, MEDIA.afterPostVideoUpload);

router.post('/upload-video-new', MEDIA.addPostVideoNew, MEDIA.afterPostVideoUploadNew);

/**
 * Update storyline
 */
router.put('/:story_id', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.editStoryline(client, req, res, function (err, response) {
            client.close();
            if(err) {
                next(err);
            } else {
                res.json(response);
            }
        })
    });
});

/**
 * Delete storyline
 */
router.delete('/:story_id', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.deleteStoryline(client, req, res, function (err, response) {
            client.close();
            if(err) {
                next(err);
            } else {
                res.json(response);
            }
        })
    });
});

/**
 * Update storyline view
 */
router.put('/view/:story_id/:user_id', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.updateStorylineView(client, req, res, function (err, response) {
            client.close();
            if(err) {
                next(err);
            } else {
                res.json(response);
            }
        })
    });
});

module.exports = router;
