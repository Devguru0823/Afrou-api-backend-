// jshint esversion:9
const router = require('express').Router();
const {
	handleGetOrderDetails,
	handleCreateOrder,
	handlePaymentCapture
} = require('../models/paypal');

// router.route('/:id/auto-renew').post(autoRenew);

router.route('/orders').get(handleGetOrderDetails).post(handleCreateOrder);

router.route('/capture').post(handlePaymentCapture);

module.exports = router;
