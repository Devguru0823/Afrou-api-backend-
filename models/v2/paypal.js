// jshint esversion:9
const paypalSDK = require('@paypal/checkout-server-sdk');
const axios = require('axios').default;
const paypalClient = require('../../_helpers/paypalClient');
const ErrorResponse = require('../../_helpers/v2/errorResponse');
const utility = require('../../utilities');
const uuid = require('uuid');
const logger = require('../../_helpers/logger');
const transactionModel = require('../transaction.json');
const asyncHandler = require('../../middlewares/v2/async');
const { createHistory } = require('./history');
const { PaypalPayments } = require('./PaypalPayments.model');
const userModel = require('./user.json');
const { addUser } = require('./user');
const { sendInvoiceEmail } = require('../../_helpers/email-handler');
const ip = require('ip');

const BASE_URL = paypalClient.BASE_URL;

const createPaypalOrder = async (amount, currency) => {
	// process paypal order creation
	// const request = new paypalSDK.orders.OrdersCreateRequest();
	// request.prefer('return=representation');
	// request.requestBody({
	// 	intent: 'CAPTURE',
	// 	purchase_units: [
	// 		{
	// 			reference_id: uuid.v4(),
	// 			amount: {
	// 				currency_code: currency ? currency : 'USD',
	// 				value: `${amount}`
	// 			}
	// 		}
	// 	]
	// });

	let access_token;
	try {
		access_token = await (
			await paypalClient.getPayPalAccessToken()
		).access_token;
	} catch (error) {
		if (error.response) {
			console.log(error.response.data);
			return { error: error.response.data };
		}
		console.log(error.message);
		return { error: error };
	}

	const config = {
		headers: {
			authorization: `Bearer ${access_token}`,
		},
	};

	const order_details = {
		intent: 'CAPTURE',
		purchase_units: [
			{
				reference_id: uuid.v4(),
				amount: {
					currency_code: currency ? currency : 'USD',
					value: `${amount}`,
				},
			},
		],
	};

	let order;
	try {
		let endpoint = '/v2/checkout/orders';
		const url = `${BASE_URL}${endpoint}`;
		order = await (await axios.post(url, order_details, config)).data;
	} catch (err) {
		console.error(err);
		if (err.response) {
			return { error: err.response.data };
		}
		return { error: err };
	}

	console.log('created order', order);
	return order;
};

module.exports.handleGetOrderDetails = asyncHandler(async (req, res) => {
	const { orderID, amount } = req.query;
	if (!orderID || !amount) {
		return res.status(400).json({
			status: false,
			error: 'BAD REQUEST: missing orderID or amount',
		});
	}
	// get order from paypal with ID
	let request = new paypalSDK.orders.OrdersGetRequest(orderID);
	let order;
	try {
		order = await paypalClient.client().execute(request);
	} catch (err) {
		const errorMessage = JSON.parse(err.message);
		return res.status(err.statusCode).json({
			status: false,
			error: errorMessage.details[0].description || 'NOT FOUND',
		});
	}

	console.log('ORDER DETAILS: ', order);
	// validate the amount is the same
	if (order.result.purchase_units[0].amount.value !== amount) {
		return res.status(400).json({
			status: false,
			error: 'BAD REQUEST: Incorrect amount value',
		});
	}

	if (req.sendInvoice) {
		// Send invoice email to user
		const paymentInDB = await PaypalPayments.findOne({
			'order.id': order.result.id,
		});
		if (!paymentInDB) {
			return next(new ErrorResponse('Invalid order id', 422));
		}
		try {
			const historyData = {
				type: 'purchase',
				ip: ip.address(),
				transaction: paymentInDB._id,
				plan: paymentInDB.plan,
				user: paymentInDB.user_id,
				model_type: 'PaypalPayments',
			};
			const transactionHistory = await createHistory(historyData);

			if (!transactionHistory.status) {
				return next(new ErrorResponse(error.message), 422);
			}
			sendInvoiceEmail(transactionHistory.history._id, {
				name: `${order.result.payer.name.given_name} ${order.result.payer.name.surname}`,
				email: order.result.payer.email_address,
				user_id: paymentInDB.user_id,
			});
		} catch (error) {
			console.log(error);
		}
	}

	return res.status(200).json({
		status: true,
		data: order.result,
	});
});

module.exports.handleCreateOrder = asyncHandler(async (req, res, next) => {
	const { amount, currency, customer, plan_id } = req.body;

	console.log(req.body);

	if (!amount || !currency || !customer || !plan_id) {
		return next(
			new ErrorResponse(
				'BAD REQUEST: Make sure to pass in all required fields',
				400
			)
		);
	}

	const {
		email,
		first_name,
		last_name,
		phone_number,
		isNewCustomer,
		user_id,
		password,
	} = customer;

	const order = await createPaypalOrder(amount, currency);

	if (order.error) {
		console.log(JSON.stringify(order.error));
		return next(new ErrorResponse(order.error.message, 422));
	}

	if (order.id) {
		const transaction_data = {
			transaction_id: uuid.v4(),
			order,
			user_id,
			plan: plan_id,
		};

		if (isNewCustomer) {
			utility.mongoConnect(req, res, async function (client) {
				const db = client.db(utility.dbName);
				const userCollection = db.collection(userModel.collection_name);

				//? find user query
				const query = {
					$or: [{ email }, { phone: phone_number }],
				};

				const userExists = await userCollection.findOne(query);
				console.log(userExists);
				if (userExists) {
					return next(
						new ErrorResponse('User with email or phone already exists', 400)
					);
				}

				const addUserBody = {
					first_name: first_name,
					last_name: last_name,
					username: email || phone_number,
					password: password,
				};

				const newReq = { body: { ...addUserBody } };

				addUser(client, newReq, {}, async function (err, user) {
					console.log(user);
					if (err) {
						client.close();
						return next(new ErrorResponse(err.message || err, 400));
					} else {
						const db = client.db(utility.dbName);
						const userCollection = db.collection(userModel.collection_name);

						const newUser = await userCollection.findById(user.insertedId);

						console.log('New user: ', newUser);

						client.close(); // close mongodb connection

						//* set user id in transaction data
						transaction_data.user_id = newUser.user_id;

						// create transaction in db
						const new_transaction = await PaypalPayments.create(
							transaction_data
						);

						return res.status(201).json({
							status: true,
							data: {
								order: order,
								transaction: {
									transaction_id: new_transaction._id,
								},
							},
						});
					}
				});
			});
		}

		const new_transaction = await PaypalPayments.create(transaction_data);

		return res.status(201).json({
			status: true,
			data: {
				order: order,
				transaction: {
					transaction_id: new_transaction._id,
				},
			},
		});
	}
});

module.exports.handlePaymentCapture = asyncHandler(async (req, res, next) => {
	const { orderID } = req.body;

	if (!orderID) {
		return next(new ErrorResponse('BAD REQUEST: missing order id', 400));
	}

	let access_token;

	try {
		access_token = req.body.access_token
			? req.body.access_token
			: await (
					await paypalClient.getPayPalAccessToken()
			  ).access_token;
	} catch (error) {
		if (error.response) {
			console.log(error.response.data);
			return res.sendStatus(500);
		}
		return res.sendStatus(500);
	}

	const config = {
		headers: {
			authorization: `Bearer ${access_token}`,
			'PayPal-Request-Id': uuid.v4(),
		},
	};

	// create paypal capture request
	let capture;
	try {
		// execute order capture
		const endpoint = `/v2/checkout/orders/${orderID}/capture`;
		const url = `${BASE_URL}${endpoint}`;
		capture = await (await axios.post(url, {}, config)).data;

		if (capture.error) {
			logger.error(capture.error);
			return next(new ErrorResponse('An error occured', 422));
		}
	} catch (error) {
		if (error.response) {
			console.log(error.response.data);
			logger.error(error.response.data);
			return res.status(error.response.status).json({
				status: false,
				details: error.response.data.details,
			});
		}
		console.log(error.message);
		return res.status(500).json({
			status: false,
			error: 'INTERNAL SERVER ERROR',
		});
	}

	// Save the capture ID to database.
	const captureID = capture.purchase_units[0].payments.captures[0].id;

	if (req.body.Transaction) {
		// came from webhook
		let transactionUpdate;
		try {
			console.log('capture data: ', capture);
			const update = await req.body.Transaction.findOneAndUpdate(
				{ 'order.id': orderID, user_id: req.authorization.user_id },
				{ $set: { captureID, order: capture } }
			);
			req.body.CLIENT.close();
			console.log('transaction update:', update);
			if (!update) {
				return res.status(422).json({
					status: false,
					error: 'could not save capture id',
				});
			}

			if (update.lastErrorObject && !update.lastErrorObject.updatedExisting) {
				return res.status(500).json({
					status: false,
					error: 'could not update transaction',
				});
			}
			transactionUpdate = update;
		} catch (error) {
			console.log(error);
			return res.sendStatus(500);
		}
		return res.status(200).json({
			status: true,
			capture,
			transactionUpdate,
		});
	}

	const transactionUpdate = await PaypalPayments.findOneAndUpdate(
		{ 'order.id': orderID },
		{ $set: { captureID, order: capture } },
		{ new: true }
	);

	return res.status(200).json({
		status: true,
		capture,
		orderID: transactionUpdate.order.id,
		transaction_id: transactionUpdate._id,
	});
});
