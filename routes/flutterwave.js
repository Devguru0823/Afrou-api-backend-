const router = require('express').Router();
const {
	handleFlutterWavePaymentCharge,
	handleFlutterWavePaymentAuthorization,
	handleFlutterWavePaymentValidation,
	handleFlutterWavePaymentRedirect,
	autoRenew,
	verifyPayment,
	createFlutterwavePayment,
	convertCurrency,
} = require('../models/flutterwave');
const payloadValidator = require('../middlewares/v2/flutterwave-payment');

router.route('/:id/auto-renew').post(autoRenew);

router
	.route('/charge')
	.post(
		payloadValidator.validatePaymentPayload,
		handleFlutterWavePaymentCharge
	);

router
	.route('/create')
	.post(payloadValidator.validateCreatePayment, createFlutterwavePayment);

router.route('/convert').post(convertCurrency);

router.route('/authorize').post(handleFlutterWavePaymentAuthorization);

router.route('/validate').post(handleFlutterWavePaymentValidation);

router.route('/verify').get(handleFlutterWavePaymentRedirect);

module.exports = router;
