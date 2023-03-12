const router = require('express').Router();
const axios = require('axios').default;
const utility = require('../utilities');
const transactionModel = require('../models/transaction.json');
const paypalClient = require('../_helpers/paypalClient');
const { handlePayPalOrderCapture } = require('./advert.route');

const BASE_URL = paypalClient.BASE_URL;

const routes = () => {
	router.route('/')
		.post(async (req, res) => {
			// validate paypal signature headers exists
			if (!req.headers['paypal-auth-algo'] || !req.headers['paypal-cert-url'] || !req.headers['paypal-transmission-id'] || !req.headers['paypal-transmission-sig']) {
				return res.status(400).json({
					status: false,
					error: 'BAD REQUEST'
				});
			}

			/* VERIFY WEBHOOK SIGNATURE */
			// fetch access token
			let access_token;
			try {
				access_token = await (await paypalClient.getPayPalAccessToken()).access_token;
			} catch (error) {
				CLIENT.close();
				console.log('error fetching access token: ', error.message);
				return res.sendStatus(500);
			}
			// webhook verification API settings
			let endpoint = '';
			let url;
			const config = {
				headers: {
					Authorization: `Bearer ${access_token}`
				}
			};

			// fetch webhooks
			let webhooks;
			try {
				endpoint = '/v1/notifications/webhooks';
				url = `${BASE_URL}${endpoint}`;
				webhooks = await (await axios.get(url, config)).data.webhooks;
			} catch (error) {
				console.log('error fetching webhooks: ', error);
				return res.sendStatus(500);
			}

			// set webhook signature verification data
			const verify_data = {
				auth_algo: req.headers['paypal-auth-algo'],
				cert_url: req.headers['paypal-cert-url'],
				transmission_id: req.headers['paypal-transmission-id'],
				transmission_sig: req.headers['paypal-transmission-sig'],
				transmission_time: req.headers['paypal-transmission-time'],
				webhook_id: webhooks[0].id,
				webhook_event: req.body
			}

			let verification_response;
			try {
				endpoint = '/v1/notifications/verify-webhook-signature';
				url = `${BASE_URL}${endpoint}`;
				verification_response = await (await axios.post(url, verify_data, config)).data;
			} catch (error) {
				console.log('verification error', error);
				verification_response = error.message;
			}

			console.log('webhook verification response: ', verification_response);

			if (verification_response.verification_status === 'SUCCESS') {
				return utility.mongoConnect(req, res, async (CLIENT) => {
					const db = CLIENT.db(utility.dbName);
					const Transaction = db.collection(transactionModel.collection_name);
					let transaction;
					try {
						transaction = await Transaction.findOne({ 'order.id': req.body.resource.id })
					} catch (error) {
						console.log(error);
						return res.sendStatus(500);
					}

					// check if transaction has already been captured
					if (transaction.order.status === 'COMPLETED') {
						return res.status(200).json({
							status: true,
							message: 'Transaction has already been captured'
						});
					}
					// capture the order
					const newReq = {
						body: {
							orderID: req.body.resource.id,
							access_token,
							Transaction,
							CLIENT
						},
						authorization: {
							user_id: transaction.user_id
						}
					}
					return handlePayPalOrderCapture(newReq, res)
				});
			}
			console.log('Signature verification failed');
			return res.sendStatus(500);
		});
	return router;
}

module.exports = routes;