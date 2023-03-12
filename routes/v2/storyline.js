var express = require('express');
var router = express.Router();
var utility = require('../../utilities');
var Model = require('../../models/v2/storyline');
var AUTH = require('../../_helpers/v2/authentication');

const MEDIA = require('../../models/v2/media');


/**
 * Get storyline
 */
router.get('/', function(req, res, next) {
    utility.mongoConnect(req, res, function (client) {
        Model.getStoryline(client, req, res, function (err, response) {
            client.close();
            if(err) {
                next(err);
            } else {
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
                res.json(response);
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
          client.close();
          if(err) {
              next(err);
          } else {
            response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
              res.json(response);
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
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
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
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
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
                response.access_token = req.authorization.access_token ? req.authorization.access_token : undefined;
                res.json(response);
            }
        })
    });
});

module.exports = router;
