var express = require('express');
var router = express.Router();
var utility = require('../utilities');
var Model = require('../models/emoney.js');
var AUTH = require('../_helpers/authentication');
console.log({ stripe: process.env.STRIPE_SECRETE_KEY });
const stripe = require('stripe')(process.env.STRIPE_SECRETE_KEY);
const MEDIA = require('../models/media');

/**
 * Send Money
 * Sender:
 *  - Id (If member then pass)
 *  - Name, Date of birth (mm/dd/yyyy), Country of Residence, Currency, IDproof (Picture)
 * Receiver:
 *  - Id (If member then pass)
 *  - Name, Email (optional), Postal Address (Optional), Country of residence, Currency
 */
router.post('/sendMoney', function (req, res, next) {
	utility.mongoConnect(req, res, function (client) {
		Model.sendMoney(client, req, res, function (err, response) {
			client.close();
			if (err) {
				next(err);
			} else {
				res.json(response);
			}
		});
	});
});

router.post('/upload', MEDIA.addEmoneyMedia, MEDIA.afterEmoneyMediaUpload);

/** STRIPE APIs */
router.post('/stripe/create-payment-intent', async function (req, res, next) {
	const amount = req.body.amount ? req.body.amount : 0;
	const currency = req.body.currency ? req.body.currency : 'gbp';

	const paymentIntent = await stripe.paymentIntents.create({
		amount: Number(amount),
		currency: currency,
		payment_method_types: ['card'],
	});

	res.json({
		status: true,
		clientSecret: paymentIntent.client_secret,
	});
});

module.exports = router;
