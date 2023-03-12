// jshint esversion:11
const { flwClient } = require('../../configs/flutterwaveConfig');
const { v4: uuidv4 } = require('uuid');
const ip = require('ip');
const asyncHandler = require('../../middlewares/v2/async');
const ErrorResponse = require('../../_helpers/v2/errorResponse');
const FlutterWavePayment = require('./FlutterWavePayment.model');
const { createHistory } = require('./history');
const { addUser } = require('./user');
const userModel = require('./user.json');
const utility = require('../../utilities');
const Card = require('./Card.model');
const Ehealth = require('./Ehealth.model');
const redisConnect = require('../../configs/redisConfig');
const { transactionVerificationPing } = require('../../cronjobwork');
const axios = require('axios').default;

module.exports.createFlutterwavePayment = asyncHandler(
	async (req, res, next) => {
		const { amount, currency, customer, plan_id } = req.body;

		const {
			email,
			first_name,
			last_name,
			phone_number,
			isNewCustomer,
			user_id,
			password,
		} = customer;

		console.log(req.body);

		if (!amount || !email) {
			return next(new ErrorResponse('Amount and email is required', 400));
		}

		if (Number.isNaN(Number.parseInt(amount))) {
			return next(new ErrorResponse('Invalid amount', 400));
		}

		const payload = {
			tx_ref: `AF${uuidv4()}`,
			amount: `${amount}`,
			currency,
			redirect_url:
				process.env.NODE_ENV === 'production'
					? 'https://afrocamgist.com/ehealth/verify'
					: 'https://staging.afrocamgist.com/ehealth/verify',
			customer: {
				email,
				name: `${first_name} ${last_name}`,
				phone_number: phone_number,
			},
			customizations: {
				title: 'Afrocamgist',
				logo: 'https://afrocamgist.com/images/logo.png',
			},
			meta: {
				plan_id,
				user_id: user_id ? user_id : undefined,
				isNewCustomer,
			},
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

						//* set user id in payload meta
						payload.meta.user_id = newUser.user_id;
					}
				});
			});
		}

		console.log('FLW REQUEST PAYLOAD: ', payload);

		const configs = {
			headers: {
				authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
			},
		};

		console.log(configs);

		const response = await axios.post(
			'https://api.flutterwave.com/v3/payments',
			payload,
			configs
		);

		if (response.data.status === 'error') {
			return next(new ErrorResponse(response.data.message, 422));
		}

		// create payment in db
		const data = {
			amount,
			tx_ref: payload.tx_ref,
			currency: payload.currency,
			user_id: payload.meta.user_id,
		};

		const dataInDb = await FlutterWavePayment.create(data);

		if (!dataInDb) {
			return next(
				new ErrorResponse('An error occured generating paymment link', 422)
			);
		}

		const apiResponse = {
			...response.data.data,
			tx_ref: payload.tx_ref,
			customer: payload.customer,
			meta: payload.meta,
		};

		return res.status(200).json({
			status: true,
			message: response.data.message,
			data: apiResponse,
		});
	}
);

module.exports.convertCurrency = asyncHandler(async (req, res, next) => {
	const url = 'https://api.flutterwave.com/v2/transfers/rates';

	const data = {
		amount: Number.parseInt(req.body.amount),
		desination_currency: req.body.desination_currency,
		source_currency: req.body.source_currency,
	};

	const configs = {
		headers: {
			Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
		},
	};

	const response = await (await axios.post(url, data, configs)).data;

	if (response.status === 'error') {
		return next(new ErrorResponse(response.message, 422));
	}

	console.log(response);

	return res.status(200).json({
		status: true,
		data: response,
	});
});

module.exports.handleFlutterWavePaymentCharge = asyncHandler(
	async (req, res, next) => {
		let fullname = '';

		if (req.body.customer) {
			const { firstName, lastName } = req.body.customer;
			fullname = `${firstName} ${lastName}`;
		}

		const redisClient = await redisConnect();

		// flutterwave 1.4% charge
		const charge = Math.round((1.4 / 100) * Number.parseInt(req.body.amount));

		// create payload
		const payload = {
			card_number: req.body.card_number,
			cvv: req.body.cvv,
			expiry_month: req.body.expiry_month,
			expiry_year: req.body.expiry_year,
			currency: req.body.currency,
			amount: req.body.amount + charge,
			email: req.body.email,
			fullname,
			enckey: process.env.FLUTTERWAVE_ENC_KEY,
			tx_ref: `AF-${uuidv4()}`,
			redirect_url: 'https://staging.afrocamgist.com/ehealth/payment/status',
		};

		// charge card with flutterwave sdk
		const response = await flwClient.Charge.card(payload);

		console.log('FLUTTERWAVE RESPONSE!!!!', response);

		if (response.status !== 'success') {
			return next(new ErrorResponse(response.message, 400));
		}

		if (response.status === 'success') {
			if (response.meta.authorization.mode === 'redirect') {
				// create customer if any
				if (req.body.customer) {
					const newReq = {
						body: { ...req.body.customer, fromReg: 'web' },
					};
					return utility.mongoConnect(newReq, {}, function (client) {
						return addUser(client, newReq, {}, async function (err, user) {
							client.close();
							if (err) {
								return next(new ErrorResponse(err.message, 400));
							} else {
								// save card if true
								if (req.body.saveCard) {
									await saveCard(response.data.id, user._id);
								}

								if (response.status === 'error') {
									return next(new ErrorResponse(response.message, 400));
								}

								return res.status(200).json({
									status: true,
									message: 'redirect required',
									data: {
										url: response.meta.authorization.redirect,
									},
								});
							}
						});
					});
				}
				const transaction = await FlutterWavePayment.create({
					txt_ref:
						response.data.tx_ref ||
						response.data.txt_ref ||
						response.data.txRef,
					...response.data,
				});
			}

			if (response.meta.authorization.mode === 'otp') {
				return res.status(200).json({
					status: true,
					data: {
						authorization: response.meta.authorization,
						data: response.data,
					},
				});
			}

			return res.status(200).json({
				status: true,
				// message: 'card pin required',
				data: {
					authorization: response.meta.authorization,
				},
			});
		}

		switch (response.meta.authorization.mode) {
			case 'pin':
			case 'avs_noauth':
				const [payloadRes, authFieldRes, authModeRes] = await redisClient
					.multi()
					.set(`flw-payload`, JSON.stringify(payload))
					.set(
						`flw-auth_fields`,
						JSON.stringify(response.meta.authorization.fields)
					)
					.set(`flw-auth_mode`, response.meta.authorization.mode)
					.exec();
				return res.status(200).json({
					status: true,
					message: 'charge initiated',
					data: response.meta.authorization,
				});

			case 'redirect':
				console.log('TXT REF: ', response.data.tx_ref);
				await redisClient.set(
					`txRef-${response.data.tx_ref}`,
					response.data.id
				);
				return res.status(200).json({
					status: true,
					message: 'redirect required',
					data: {
						url: response.meta.authorization.redirect,
					},
				});

			default:
				const transaction = await flwClient.Transaction.verify({
					id: response.data.id,
				});
				if (transaction.data.status === 'success') {
					// create customer if customer
					if (req.body.customer) {
						const newReq = {
							body: { ...req.body.customer, fromReg: 'web' },
						};
						return utility.mongoConnect(newReq, {}, function (client) {
							return addUser(client, newReq, {}, async function (err, user) {
								client.close();
								if (err) {
									next(err);
								} else {
									if (req.body.saveCard) {
										await saveCard(transaction.data.id, user._id);
									}

									delete response.data.card;
									// save transaction in db
									const transactionData = {
										...transaction.data,
										user: user._id,
									};
									const savedPayment = await FlutterWavePayment.create(
										transactionData
									);

									console.log('SAVED PAYMENT:', savedPayment);

									// TODO: Add plan id to the history
									const historyData = {
										type: 'purchase',
										ip: ip.address(),
										transaction: savedPayment._id,
										user: user._id,
										model_type: 'FlutterwavePayment',
									};
									const transactionHistory = await createHistory(historyData);
									return res.status(200).json({
										status: true,
										message:
											'Payment complete. Check your email or phone to verify your account',
										data: response,
									});
								}
							});
						});
					}

					if (req.body.user_id) {
						// save card
						if (req.body.saveCard) {
							await saveCard(transaction.data.id, req.body.user_id);
						}

						// delete response.data.card;
						// save transaction in db
						const transactionData = {
							...transaction.data,
							user: req.body.user_id,
						};
						const savedPayment = await FlutterWavePayment.create(
							transactionData
						);

						const historyData = {
							type: 'purchase',
							ip: ip.address(),
							transaction: savedPayment._id,
							plan: req.body.plan_id,
							user: req.body.user_id,
							model_type: 'FlutterwavePayment',
						};
						const transactionHistory = await createHistory(historyData);
						return res.status(200).json({
							status: true,
							message: 'payment complete',
							data: savedPayment,
						});
					}

					break;
				} else if (transaction.status === 'pending') {
					const savedTransaction = await FlutterWavePayment.create(
						transaction.data
					);

					// add to cronjob
					transactionVerificationPing(transaction.data.id);
					return res.status(200).json({
						status: true,
						message: 'payment pending',
						data: transaction.data,
					});
				} else {
					return res.status(422).json({
						status: false,
						message: 'payment failed',
						data: transaction.data,
					});
				}
		}
	}
);

module.exports.handleFlutterWavePaymentAuthorization = asyncHandler(
	async (req, res, next) => {
		const redisClient = await redisConnect();
		const payload = JSON.parse(await redisClient.get(`flw-payload`));
		const auth_mode = await redisClient.get(`flw-auth_mode`);
		const auth_fields = await JSON.parse(
			await redisClient.get(`flw-auth_fields`)
		);

		payload.authorization = {
			mode: auth_mode,
		};

		auth_fields.forEach((field) => {
			payload.authorization[field] = req.body[field];
		});

		console.log(payload);

		const response = await flwClient.Charge.card(payload);

		console.log('TXT REF: ', response.data.tx_ref);

		switch (response.meta.authorization.mode) {
			case 'otp':
				// Show the user a form to enter the OTP
				await redisClient.set(`flw-flw_ref`, response.data.flw_ref);
				return res.status(200).json({
					status: true,
					message: 'otp required',
				});
			case 'redirect':
				await redisClient.set(
					`txRef-${response.data.tx_ref}`,
					response.data.id
				);
				const authUrl = response.meta.authorization.redirect;
				return res.status(200).json({
					status: true,
					message: 'redirect required',
					data: {
						url: authUrl,
					},
				});
			default:
				// No validation needed; just verify the payment
				const transaction = await flwClient.Transaction.verify({
					id: response.data.id,
				});
				if (transaction.data.status === 'success') {
					// create customer if customer
					if (req.body.customer) {
						const newReq = {
							body: { ...req.body.customer, fromReg: 'web' },
						};
						return utility.mongoConnect(newReq, {}, function (client) {
							return addUser(client, newReq, {}, async function (err, user) {
								client.close();
								if (err) {
									next(err);
								} else {
									if (req.body.saveCard) {
										await saveCard(transaction.data.id, user._id);
									}

									delete response.data.card;
									// save transaction in db
									const transactionData = {
										...transaction.data,
										user: user._id,
									};
									const savedPayment = await FlutterWavePayment.create(
										transactionData
									);

									console.log('SAVED PAYMENT:', savedPayment);

									// TODO: Add plan id to the history
									const historyData = {
										type: 'purchase',
										ip: ip.address(),
										transaction: savedPayment._id,
										user: user._id,
										model_type: 'FlutterwavePayment',
									};
									const transactionHistory = await createHistory(historyData);
									return res.status(200).json({
										status: true,
										message:
											'Payment complete. Check your email or phone to verify your account',
										data: response,
									});
								}
							});
						});
					}

					if (req.body.user_id) {
						// save card
						if (req.body.saveCard) {
							await saveCard(transaction.data.id, req.body.user_id);
						}

						// delete response.data.card;
						// save transaction in db
						const transactionData = {
							...transaction.data,
							user: req.body.user_id,
						};
						const savedPayment = await FlutterWavePayment.create(
							transactionData
						);

						const historyData = {
							type: 'purchase',
							ip: ip.address(),
							transaction: savedPayment._id,
							plan: req.body.plan_id,
							user: req.body.user_id,
							model_type: 'FlutterwavePayment',
						};
						const transactionHistory = await createHistory(historyData);
						return res.status(200).json({
							status: true,
							message: 'payment complete',
							data: savedPayment,
						});
					}

					break;
				} else if (transaction.status === 'pending') {
					const savedTransaction = await FlutterWavePayment.create(
						transaction.data
					);

					// add to cronjob
					transactionVerificationPing(transaction.data.id);
					return res.status(200).json({
						status: true,
						message: 'payment pending',
						data: transaction.data,
					});
				} else {
					return res.status(422).json({
						status: false,
						message: 'payment failed',
						data: transaction.data,
					});
				}
		}
	}
);

module.exports.handleFlutterWavePaymentValidation = asyncHandler(
	async (req, res, next) => {
		const redisClient = await redisConnect();
		const response = await flwClient.Charge.validate({
			otp: req.body.otp,
			flw_ref: await redisClient.get(`flw-flw_ref`),
		});
		if (
			response.data.status === 'successful' ||
			response.data.status === 'pending'
		) {
			// Verify the payment
			const transactionId = response.data.id;
			const transaction = await flwClient.Transaction.verify({
				id: transactionId,
			});

			if (transaction.data.status == 'successful') {
				// create customer if customer
				if (req.body.customer) {
					const newReq = {
						body: { ...req.body.customer, fromReg: 'web' },
					};
					return utility.mongoConnect(newReq, {}, function (client) {
						return addUser(client, newReq, {}, async function (err, user) {
							client.close();
							if (err) {
								next(err);
							} else {
								if (req.body.saveCard) {
									await saveCard(transaction.data.id, user._id);
								}

								delete response.data.card;
								// save transaction in db
								const transactionData = {
									...transaction.data,
									user: user._id,
								};
								const savedPayment = await FlutterWavePayment.create(
									transactionData
								);

								console.log('SAVED PAYMENT:', savedPayment);

								// TODO: Add plan id to the history
								const historyData = {
									type: 'purchase',
									ip: ip.address(),
									transaction: savedPayment._id,
									user: user._id,
									model_type: 'FlutterwavePayment',
								};
								const transactionHistory = await createHistory(historyData);
								return res.status(200).json({
									status: true,
									message:
										'Payment complete. Check your email or phone to verify your account',
									data: response,
								});
							}
						});
					});
				}

				if (req.body.user_id) {
					// save card
					if (req.body.saveCard) {
						await saveCard(transaction.data.id, req.body.user_id);
					}

					// delete response.data.card;
					// save transaction in db
					const transactionData = {
						...transaction.data,
						user: req.body.user_id,
					};
					const savedPayment = await FlutterWavePayment.create(transactionData);

					const historyData = {
						type: 'purchase',
						ip: ip.address(),
						transaction: savedPayment._id,
						plan: req.body.plan_id,
						user: req.body.user_id,
						model_type: 'FlutterwavePayment',
					};
					const transactionHistory = await createHistory(historyData);
					return res.status(200).json({
						status: true,
						message: 'payment complete',
						data: savedPayment,
					});
				}
			} else if (transaction.data.status == 'pending') {
				const savedTransaction = await FlutterWave.create(transaction.data);

				// add to cronjob
				transactionVerificationPing(transaction.data.id);
				return res.status(200).json({
					status: true,
					message: 'payment pending',
					data: transaction.data,
				});
			} else {
				return res.status(422).json({
					status: false,
					message: 'payment failed',
					data: transaction.data,
				});
			}
		}
	}
);

module.exports.handleFlutterWavePaymentRedirect = asyncHandler(
	async (req, res, next) => {
		const redisClient = await redisConnect();
		if (req.body.status === 'successful' || req.body.status === 'pending') {
			// Verify the payment
			const txRef = req.body.tx_ref;
			console.log(txRef);
			const transactionId = await redisClient.get(`txRef-${txRef}`);
			const transaction = await flwClient.Transaction.verify({
				id: transactionId,
			});

			console.log('TRANSACTION: ', transaction);

			if (transaction.status === 'error') {
				return next(new ErrorResponse(transaction.message, 400));
			}

			if (transaction.data.status === 'success') {
				// create customer if customer
				if (req.body.customer) {
					const newReq = {
						body: { ...req.body.customer, fromReg: 'web' },
					};
					return utility.mongoConnect(newReq, {}, function (client) {
						return addUser(client, newReq, {}, async function (err, user) {
							client.close();
							if (err) {
								next(err);
							} else {
								if (req.body.saveCard) {
									await saveCard(transaction.data.id, user._id);
								}

								delete response.data.card;
								// save transaction in db
								const transactionData = {
									...transaction.data,
									user: user._id,
								};
								const savedPayment = await FlutterWavePayment.create(
									transactionData
								);

								console.log('SAVED PAYMENT:', savedPayment);

								// TODO: Add plan id to the history
								const historyData = {
									type: 'purchase',
									ip: ip.address(),
									transaction: savedPayment._id,
									user: user._id,
									model_type: 'FlutterwavePayment',
								};
								const transactionHistory = await createHistory(historyData);
								return res.status(200).json({
									status: true,
									message:
										'Payment complete. Check your email or phone to verify your account',
									data: response,
								});
							}
						});
					});
				}

				if (req.body.user_id) {
					// save card
					if (req.body.saveCard) {
						await saveCard(transaction.data.id, req.body.user_id);
					}

					// delete response.data.card;
					// save transaction in db
					const transactionData = {
						...transaction.data,
						user: req.body.user_id,
					};
					const savedPayment = await FlutterWavePayment.create(transactionData);

					const historyData = {
						type: 'purchase',
						ip: ip.address(),
						transaction: savedPayment._id,
						plan: req.body.plan_id,
						user: req.body.user_id,
						model_type: 'FlutterwavePayment',
					};
					const transactionHistory = await createHistory(historyData);
					return res.status(200).json({
						status: true,
						message: 'payment complete',
						data: savedPayment,
					});
				}
			} else if (transaction.status === 'pending') {
				const savedTransaction = await FlutterWavePayment.create(
					transaction.data
				);

				// add to cronjob
				transactionVerificationPing(transaction.data.id);
				return res.status(200).json({
					status: true,
					message: 'payment pending',
					data: transaction.data,
				});
			} else {
				return res.status(422).json({
					status: false,
					message: 'payment failed',
					data: transaction.data,
				});
			}
		}
	}
);

async function saveCard(transaction_id, user_id) {
	const verifiedTransaction = await flwClient.Transaction.verify({
		id: transaction_id,
	});
	// create card
	const cardPayload = {
		...verifiedTransaction.data.card,
		user: user_id,
	};
	const newCard = await Card.create(cardPayload);
	return newCard;
}

module.exports.autoRenew = asyncHandler(async (req, res, next) => {
	const { id } = req.params;
	const { transaction_id, card_id } = req.body;

	if (!transaction_id || !card_id) {
		return next(new ErrorResponse('missing transaction or card id', 400));
	}

	// find plan
	const plan = await Ehealth.findById(id).select('plan_id');
	const card = await Card.findById(card_id);
	const transaction = await FlutterWavePayment.findById(transaction_id);

	if (!plan) {
		return next(new ErrorResponse('Invalid plan id'), 400);
	}

	const payload = {
		token: card.token,
		currency: transaction.currency,
		country: card.country,
		amount: 0,
		email: transaction.customer.email,
		ip: ip.address(),
		narration: 'Auto renew charge',
		txt_ref: `arn-${uuidv4}`,
		payment_plan: plan.plan_id,
	};

	const response = await flwClient.Tokenized.charge(payload);

	return res.status(200).json({
		status: true,
		data: response,
	});
});

module.exports.verifyPayment = asyncHandler(async (req, res, next) => {
	const { txt_ref } = req.body;

	console.log(txt_ref);

	if (!txt_ref) {
		return res.status(400).json({
			status: false,
			error: 'BAD REQUEST',
		});
	}

	// get transaction with txt_ref
	// const query = {
	// 	$or: [{ txt_ref }, { tx_ref: txt_ref }, { txRef: txt_ref }]
	// };
	const transaction = await FlutterWavePayment.findOne({ txt_ref });

	if (!transaction) {
		return next(new ErrorResponse('Invalid reference', 400));
	}

	const verifiedTransaction = await flwClient.Transaction.verify({
		id: transaction.id,
	});

	console.log('Transaction: ', verifiedTransaction);

	if (verifiedTransaction.data.status === 'success') {
		return res.status(200).json({
			status: true,
			data: {
				status: verifiedTransaction.data.status,
				processor_response: verifiedTransaction.data.processor_response,
			},
		});
	}

	return res.status(200).json({
		status: false,
		data: {
			status: verifiedTransaction.data.status,
			processor_response: verifiedTransaction.data.processor_response,
		},
	});
});
