const express = require('express');
const router = express.Router();
const utility = require('../utilities');
const Model = require('../models/call');
const AUTH = require('../_helpers/authentication');

router.post('/callNotification', function (req, res, next) {
	utility.mongoConnect(req, res, function (client) {
		Model.callNotification(client, req, res, function (err, response) {
			if (err) {
				next(err);
			} else {
				res.json(response);
			}
		});
	});
});

/**
 * Accept call
 */
router.post('/callAccept', function (req, res, next) {
	utility.mongoConnect(req, res, function (client) {
		Model.callAccept(client, req, res, function (err, response) {
			if (err) {
				next(err);
			} else {
				res.json(response);
			}
		});
	});
});

/**
 * Reject call
 */
router.post('/callReject', function (req, res, next) {
	utility.mongoConnect(req, res, function (client) {
		Model.callReject(client, req, res, function (err, response) {
			if (err) {
				next(err);
			} else {
				res.json(response);
			}
		});
	});
});

/**
 * End call
 */
router.post('/callEnd', function (req, res, next) {
	utility.mongoConnect(req, res, function (client) {
		Model.callEnd(client, req, res, function (err, response) {
			if (err) {
				next(err);
			} else {
				res.json(response);
			}
		});
	});
});

/**
 * Get call log
 */
router.get('/', function (req, res, next) {
	utility.mongoConnect(req, res, function (client) {
		Model.getCallLog(client, req, res, function (err, response) {
			if (err) {
				next(err);
			} else {
				res.json(response);
			}
		});
	});
});

module.exports = router;
