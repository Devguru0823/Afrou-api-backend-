var express = require('express');
var router = express.Router();
var utility = require('../utilities');
var Model = require('../models/advert_transaction');

// add new ad_request

router.post('/create', function (req, res, next) {
	utility.mongoConnect(req, res, function (client) {
		console.log(req.body);
		Model.addTransaction(client, req, res, function (err, response) {
			client.close();
			if (err) {
				next(err);
			} else {
				res.json(response);
			}
		});
	});
});

router.post('/get', function (req, res, next) {
	// getTransaction
	utility.mongoConnect(req, res, function (client) {
		console.log(req.body);
		Model.getTransaction(client, req, res, function (err, response) {
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
