var express = require('express');
var router = express.Router();
var utility = require('../utilities');
var Model = require('../models/test');
var AUTH = require('../_helpers/authentication');

/**
 * Log file upload
 */
router.post('/upload', Model.uploadLog, Model.afterUploadLog);

/**
 * Get profile
 */
router.get('/getProfile', function (req, res, next) {
	utility.mongoConnect(req, res, function (client) {
		Model.getProfile(client, req, res, function (err, response) {
			client.close();
			if (err) {
				next(err);
			} else {
				res.json(response);
			}
		});
	});
});
router.post('/testImage', function (req, res, next) {
	utility.mongoConnect(req, res, function (client) {
		Model.testImage(client, req, res, function (err, response) {
			client.close();
			if (err) {
				next(err);
			} else {
				res.json(response);
			}
		});
	});
});

module.exports = router;
