// jshint esversion: 9
const router = require('express').Router();
const uuid = require('uuid');
const paypalSDK = require('@paypal/checkout-server-sdk');
const axios = require('axios').default;
const paypalClient = require('../_helpers/paypalClient');
const utility = require('../utilities');
const audienceModel = require('../models/audience.json');
const budgetModel = require('../models/budget_duration.json');
const goalModel = require('../models/goal.json');
const postModel = require('../models/post.json');
const advertModel = require('../models/advert.model.json');
const userModel = require('../models/user.json');
const transactionModel = require('../models/transaction.json');
const AUTH = require('../_helpers/authentication');
const AdminAUTH = require('../admin/authentication');

// Paypal base uri
const BASE_URL = paypalClient.BASE_URL;

// function to validate budget duration type
/**
 *
 * @param {string} duration_type
 */
const durationTypeValidator = (duration_type) => {
	const allowedDurationTypes = ['daily', 'weekly'];
	let isAllowed = false;
	for (let allowedType of allowedDurationTypes) {
		if (duration_type.toLowerCase().trim() === allowedType) {
			isAllowed = true;
			break;
		}
	}
	return isAllowed;
};

/**
 *
 * @param {string} goal_type
 */
const goalValidator = (goal_type) => {
	const allowedGoalTypes = ['more profile visits', 'more website visits'];
	let isAllowed = false;
	if (typeof goal_type !== 'string') {
		return isAllowed;
	}
	for (let goal of allowedGoalTypes) {
		if (goal_type.trim().toLowerCase() === goal) {
			isAllowed = true;
			break;
		}
	}
	console.log(isAllowed);
	return isAllowed;
};

/**
 *
 * @param {string} age_range
 */
const validateAgeRange = (age_range) => {
	const rangeSplit = age_range.split('-');
	console.log(rangeSplit);
	if (rangeSplit.length !== 2) {
		return false;
	}
	if (Number.parseInt(rangeSplit[1]) < Number.parseInt(rangeSplit[0])) {
		return false;
	}
	const minAge = rangeSplit[0];
	const maxAge = rangeSplit[1];
	const regEx = /^(?:1[01][0-9]|1[3-9]|[2-9][0-9])$/;
	if (!regEx.test(minAge) || !regEx.test(maxAge)) return false;
	return true;
};

/**
 *
 * @param {number} year
 * @returns
 */
const leapYearTest = (year) => {
	if ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) {
		return true;
	}
	return false;
};

const getMaxDate = (month) => {
	let result;

	switch (month) {
		case 0:
			result = { name: 'January', maxDate: 31 };
			break;
		case 1:
			result = leapYearTest
				? { name: 'February', maxDate: 29 }
				: { name: 'February', maxDate: 28 };
			break;
		case 2:
			result = { name: 'March', maxDate: 31 };
			break;
		case 3:
			result = { name: 'April', maxDate: 30 };
			break;
		case 4:
			result = { name: 'May', maxDate: 31 };
			break;
		case 5:
			result = { name: 'June', maxDate: 30 };
			break;
		case 6:
			result = { name: 'July', maxDate: 31 };
			break;
		case 7:
			result = { name: 'August', maxDate: 31 };
			break;
		case 8:
			result = { name: 'September', maxDate: 30 };
			break;
		case 9:
			result = { name: 'October', maxDate: 31 };
			break;
		case 10:
			result = { name: 'November', maxDate: 30 };
			break;
		case 11:
			result = { name: 'December', maxDate: 31 };
			break;
		default:
			result = { name: null, maxDate: null };
	}
	return result;
};

/**
 *
 * @param {number} days
 */
const calculateEndDate = (days) => {
	const startDate = new Date();
	const startMonth = startDate.getMonth();
	const { maxDate, name } = getMaxDate(startDate.getMonth());
	const newDate = startDate.getDate() + days;
	if (newDate > maxDate) {
		const endDay = newDate - maxDate;
		const endMonth = getMaxDate(startDate.getMonth() + 1);
		if (name === 'December' && endMonth.name === 'January') {
			const endDate = new Date(
				`${endMonth} ${endDay}, ${new Date().getFullYear() + 1}`
			);
			return endDate;
		}
		const endDate = new Date(
			`${endMonth.name} ${endDay}, ${new Date().getFullYear()}`
		);
		return endDate;
	}
	const endDate = new Date(
		`${startDate.getFullYear()}-${startMonth + 1}-${newDate}`
	);
	return endDate;
};

/**
 * Function to handle capturing order in Paypal
 * @param {*} req
 * @param {*} res
 * @returns
 */

const handlePayPalOrderCapture = async (req, res) => {
	const { orderID } = req.body;
	const { user_id } = req.authorization;
	if (!orderID) {
		return res.status(400).json({
			status: false,
			error: 'BAD REQUEST: missing order id',
		});
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
			return res.status(500).json({
				status: false,
				error: capture.error,
			});
		}
	} catch (error) {
		if (error.response) {
			console.log(error.response.data);
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

	utility.mongoConnect(req, res, async (CLIENT) => {
		if (!CLIENT) {
			return res.status(500).json({
				status: false,
				error: 'an error occured',
			});
		}
		const db = CLIENT.db(utility.dbName);
		const Transaction = db.collection(transactionModel.collection_name);
		const User = db.collection(userModel.collection_name);

		// find user
		let user;
		try {
			const userExists = await User.findOne({ user_id });
			if (!userExists) {
				CLIENT.close();
				return res.status(404).json({
					status: false,
					error: 'NOT FOUND: user not found',
				});
			}
			user = userExists;
		} catch (error) {
			console.log('error finding user: ', error.message);
			return res.status(500).json({
				status: false,
				error: 'INTERNAL SERVER ERROR',
			});
		}

		let transactionUpdate;
		try {
			console.log('capture data: ', capture);
			const update = await Transaction.findOneAndUpdate(
				{ 'order.id': orderID, user_id: user.user_id },
				{ $set: { captureID, order: capture } }
			);
			CLIENT.close();
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
			transactionUpdate = update.value;
		} catch (error) {
			console.log(error);
			return res.sendStatus(500);
		}
		return res.status(200).json({
			status: true,
			capture,
			transaction_id: transactionUpdate.transaction_id,
		});
	});
};

/**
 * Function to handle creating order in Paypal
 * @param {*} amount
 * @param {*} currency
 * @returns
 */
const createPaypalOrder = async (amount, currency) => {
	// process paypal order creation
	const request = new paypalSDK.orders.OrdersCreateRequest();
	request.prefer('return=representation');
	request.requestBody({
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
	});

	let access_token;
	try {
		access_token = await (
			await paypalClient.getPayPalAccessToken()
		).access_token;
	} catch (error) {
		if (error.response) {
			console.log(error.response.data);
			return res.sendStatus(500);
		}
		console.log(error.message);
		return res.sendStatus(500);
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
		return err;
	}

	console.log('created order', order);
	return order;
};

/**
 * Function to handle fetching order details
 * @param {*} req
 * @param {*} res
 * @returns
 */
const handleGetOrderDetails = async (req, res) => {
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

	// validate the amount is the same
	if (order.result.purchase_units[0].amount.value !== amount) {
		return res.status(400).json({
			status: false,
			error: 'BAD REQUEST: Incorrect amount value',
		});
	}
	return res.status(200).json({
		status: true,
		data: order.result,
	});
};

/**
 * Function to verify webhook capture success
 * @returns
 */

const verifyWebhookCapture = async (req, res) => {
	const { orderID } = req.body;

	if (!orderID) {
		return res.status(400).json({
			status: false,
			error: 'missing order id',
		});
	}

	try {
		utility.mongoConnect(req, res, async (client) => {
			const db = client.db(utility.dbName);
			const Transaction = db.collection(transactionModel.collection_name);
			// find transaction
			let transaction;
			try {
				transaction = await Transaction.findOne({ 'order.id': orderID });
			} catch (error) {
				console.log(error.message);
				return res.status(500).json({
					status: false,
					error: 'INTERNAL SERVER ERROR',
				});
			}
			// transaction doesn't exist
			if (!transaction) {
				return res.status(404).json({
					status: false,
					error: 'transaction with id not found',
				});
			}
			// transaction exists and is complete
			if (transaction && transaction.order.status === 'COMPLETED') {
				return res.status(200).json({
					status: true,
					message: 'transaction has been completed',
					transaction_id: transaction.transaction_id,
				});
			}
			// transaction exists but not completed
			return res.status(200).json({
				status: false,
				error: 'transaction not completed',
			});
		});
	} catch (error) {}
};

function postLookup() {
	const lookup = {
		$lookup: {
			from: postModel.collection_name,
			localField: 'post',
			foreignField: 'post_id',
			as: 'post',
		},
	};
	return lookup;
}

function audienceLookup() {
	const lookup = {
		$lookup: {
			from: audienceModel.collection_name,
			localField: 'audience',
			foreignField: 'audience_id',
			as: 'audience',
		},
	};
	return lookup;
}

function goalLookup() {
	const lookup = {
		$lookup: {
			from: goalModel.collection_name,
			localField: 'goal',
			foreignField: 'goal_id',
			as: 'goal',
		},
	};
	return lookup;
}

function budgetLookup() {
	const lookup = {
		$lookup: {
			from: budgetModel.collection_name,
			localField: 'budget',
			foreignField: 'budget_id',
			as: 'budget',
		},
	};
	return lookup;
}

/**
 * Function to handle updating an order
 * @param {*} req
 * @param {*} res
 * @returns
 */
const handleOrderUpdate = async (req, res) => {
	const { orderID, status } = req.body;
	const { user_id } = req.authorization;
	if (!orderID || !status) {
		return res.status(400).json({
			status: false,
			error: 'BAD REQUEST: missing orderID or status',
		});
	}

	utility.mongoConnect(req, res, async function (CLIENT) {
		if (!CLIENT) {
			return res.status(500).json({
				status: false,
				error: 'an error occured',
			});
		}
		const db = CLIENT.db(utility.dbName);
		const User = db.collection(userModel.collection_name);
		const Transaction = db.collection(transactionModel.collection_name);
		// find user
		let user;
		try {
			const userExists = await User.findOne({
				user_id: Number.parseInt(user_id),
			});
			if (!userExists) {
				return res.status(400).json({
					status: false,
					error: 'BAD REQUEST: invalid user id',
				});
			}
			user = userExists;
		} catch (error) {
			return res.status(500).json({
				status: false,
				error: 'INTERNAL SERVER ERROR',
			});
		}

		// find transaction with order id
		let transaction;
		try {
			const orderExists = await Transaction.findOne({
				orderID,
				user_id: user.user_id,
			});
			if (!orderExists) {
				return res.status(400).json({
					status: false,
					error: 'BAD REQUEST: invalid order id',
				});
			}
			transaction = orderExists;
		} catch (error) {
			return res.status(500).json({
				status: false,
				error: 'INTERNAL SERVER ERROR',
			});
		}

		// get access token
		let tokenData;
		try {
			tokenData = await getPayPalAccessToken();
		} catch (error) {
			console.log('Error getting paypal token: ', error);
			return res.status(500).json({
				status: false,
				error: 'INTERNAL SERVER ERROR',
			});
		}
		return res.status(200).json({
			status: true,
			data: tokenData,
		});
	});
};

const routes = () => {
	// endpoint to get adverts
	router.route('/get').get(AUTH.authenticate, async (req, res) => {
		const { user_id } = req.authorization;

		try {
			utility.mongoConnect(req, res, async function (CLIENT) {
				if (!CLIENT) {
					return res.status(500).json({
						status: false,
						error: 'an error occured',
					});
				}
				const db = CLIENT.db(utility.dbName);
				const user = await db
					.collection(userModel.collection_name)
					.findOne({ user_id });
				if (!user) {
					CLIENT.close();
					return res
						.status(404)
						.json({ status: false, error: 'no user found' });
				}
				// find adverts
				// const adverts = await db.collection(advertModel.collection_name).find({ user_id }).toArray();
				const adverts = await db
					.collection(advertModel.collection_name)
					.aggregate([
						{
							$match: {
								user_id: user_id,
							},
						},
						postLookup(),
						audienceLookup(),
						goalLookup(),
						budgetLookup(),
						{
							$match: {
								'post.post_type': {
									$in: ['image', 'video'],
								},
							},
						},
						{
							$project: {
								start_date: 0,
								end_date: 0,
							},
						},
					])
					.toArray();
				console.log(adverts);
				CLIENT.close();
				if (!adverts)
					return res
						.status(404)
						.json({ status: false, error: 'no adverts found' });
				return res.status(200).json({
					status: true,
					data: adverts,
				});
			});
		} catch (error) {
			console.error(error);
			return res.status(500).json({ status: false, error: 'an error occured' });
		}
	});

	// endpoint to create advert
	router.route('/create').post(AUTH.authenticate, async (req, res) => {
		let { audience_id, goal, budget, post_id, transaction_id } = req.body;

		console.log(req.body);

		const { user_id } = req.authorization;
		post_id = Number.parseInt(post_id);

		// validate data exists
		if (!audience_id || !goal || !budget || !post_id || !transaction_id) {
			return res.status(400).json({
				status: false,
				error: 'missing request body',
			});
		}

		// validate data types
		if (
			typeof audience_id !== 'string' ||
			typeof goal !== 'object' ||
			typeof budget !== 'object' ||
			typeof post_id !== 'number'
		) {
			return res.status(400).json({
				status: false,
				error: 'invalid data type',
			});
		}

		// validate goal type
		if (
			!goal.goal_type ||
			typeof goal.goal_type !== 'string' ||
			!goalValidator(goal.goal_type) ||
			!goal.url
		) {
			return res.status(400).json({
				status: false,
				error: 'invalid goal',
			});
		}

		// validate budget object
		if (
			!budget.amount ||
			typeof Number.parseInt(budget.amount) !== 'number' ||
			!budget.duration ||
			typeof Number.parseInt(budget.duration) !== 'number'
		) {
			return res.status(400).json({
				status: false,
				error: 'invalid budget',
			});
		}

		try {
			utility.mongoConnect(req, res, async function (CLIENT) {
				if (!CLIENT) {
					return res.status(500).json({
						status: false,
						error: 'an error occured',
					});
				}
				// find audience and post
				const db = CLIENT.db(utility.dbName);
				const Audience = db.collection(audienceModel.collection_name);
				const Post = db.collection(postModel.collection_name);
				const User = db.collection(userModel.collection_name);
				const Budget = db.collection(budgetModel.collection_name);
				const Goal = db.collection(goalModel.collection_name);
				const Advert = db.collection(advertModel.collection_name);
				const Transaction = db.collection(transactionModel.collection_name);
				const audience = await Audience.findOne({ audience_id });
				const post = await Post.findOne({ post_id, posted_by: user_id });
				const user = await User.findOne({ user_id });
				const transaction = await Transaction.findOne({ transaction_id });
				if (!audience || !post)
					return res
						.status(404)
						.json({ status: false, error: 'no audience or post found' });

				// validate if post has been advertized
				const advertExists = await Advert.findOne({ post_id });
				if (advertExists) {
					return res.status(422).json({
						status: false,
						error: 'Cannot promote a post twice',
					});
				}

				if (!transaction) {
					return res.status(400).json({
						status: false,
						error: 'invalid transaction_id',
					});
				}

				if (transaction.order.status !== 'COMPLETED') {
					return res.status(400).json({
						status: false,
						error: 'transaction not complete',
					});
				}

				// create budget object
				const defaultAmount = 5;
				budget.budget =
					Number.parseInt(budget.amount) === defaultAmount
						? budget.amount
						: defaultAmount;
				budget.duration = Number.parseInt(budget.duration);
				budget.amount = defaultAmount * budget.duration;
				budget.budget_id = uuid.v4();
				Budget.insertOne({ ...budget }, (err, budgetResp) => {
					if (err) {
						CLIENT.close();
						return res.status(400).json({
							status: false,
							error: err.message,
						});
					}
					// console.log('new budget: ', budgetResp.ops[0]);
					goal.url =
						goal.goal_type.toLowerCase() === 'more profile visits'
							? `/profile/${user_id}`
							: goal.url;
					let goal_id = uuid.v4();
					Goal.insertOne(
						{
							goal_id: goal_id,
							post_id,
							goal_type: goal.goal_type,
							url: goal.url,
						},
						async (goalErr, goalResp) => {
							if (goalErr) {
								CLIENT.close();
								return res.status(422).json({
									status: false,
									error: 'could not create goal',
								});
							}

							// console.log('new goal: ', goalResp.ops[0]);
							let advert_id = uuid.v4();
							Advert.insertOne(
								{
									advert_id: advert_id,
									status: 'review',
									goal: goal_id,
									audience: audience.audience_id,
									budget: budget?.budget_id,
									transaction: transaction_id,
									post: post.post_id,
									user_id: user.user_id,
									start_date: new Date(),
									end_date: calculateEndDate(budget.duration),
									end_timestamp: calculateEndDate(budget.duration).getTime(),
									timestamp: new Date().getTime(),
								},
								async (advertErr, advertResp) => {
									if (advertErr) {
										CLIENT.close();
										return res.status(422).json({
											status: false,
											error: 'could not create advert',
										});
									}
									const postUpdate = await Post.updateOne(
										{ post_id: post.post_id },
										{ $set: { promoted: true } }
									);
									const advert = await Advert.aggregate([
										{
											$match: {
												advert_id: advert_id,
											},
										},
										{
											$lookup: {
												from: 'goal',
												localField: 'goal',
												foreignField: 'goal_id',
												as: 'goal',
											},
										},
										{
											$lookup: {
												from: 'budget_duration',
												localField: 'budget',
												foreignField: 'budget_id',
												as: 'budget',
											},
										},
										{
											$lookup: {
												from: 'post',
												localField: 'post',
												foreignField: 'post_id',
												as: 'post',
											},
										},
										{
											$lookup: {
												from: 'audience',
												localField: 'audience',
												foreignField: 'audience_id',
												as: 'audience',
											},
										},
									]).toArray();
									console.log('advert response: ', advert);
									CLIENT.close();
									const finalResult = {
										advert_id: advert[0].advert_id,
										goal: advert[0].goal,
										audience: advert[0].audience,
										budget: advert[0].budget,
										post: advert[0].post,
										start_date: advert[0].start_date,
										end_date: advert[0].end_date,
									};
									return res.status(201).json({
										status: true,
										message: 'Advert created successfully',
										data: finalResult,
									});
								}
							);
						}
					);
				});
			});
		} catch (error) {
			console.error(error);
			return res.status(500).json({
				status: false,
				error: 'an error occured',
			});
		}
	});

	// endpoint to get audience
	router.route('/audience/get').get(AUTH.authenticate, async (req, res) => {
		let { audience_id } = req.query;
		const { user_id } = req.authorization;

		if (audience_id) {
			try {
				utility.mongoConnect(req, res, async function (CLIENT) {
					if (!CLIENT) {
						return res.status(500).json({
							status: false,
							error: 'an error occured',
						});
					}
					const db = CLIENT.db(utility.dbName);
					const audience = await db
						.collection(audienceModel.collection_name)
						.findOne({ audience_id });
					CLIENT.close();
					if (!audience) {
						return res.status(404).json({
							status: false,
							error: 'no audience found',
						});
					}
					return res.status(200).json({
						stauts: true,
						data: audience,
					});
				});
			} catch (error) {
				console.error(error);
				return res.status(500).json({
					status: false,
					error: 'an error occured',
				});
			}
		}

		try {
			// find user
			utility.mongoConnect(req, res, async function (CLIENT) {
				if (!CLIENT) {
					return res.status(500).json({
						status: false,
						error: 'an error occured',
					});
				}
				const db = CLIENT.db(utility.dbName);
				const user = await db
					.collection(userModel.collection_name)
					.findOne({ user_id });
				if (!user) {
					CLIENT.close();
					return res.status(404).json({
						status: false,
						error: 'user not found',
					});
				}
				// get user created audience
				const audiences = await db
					.collection(audienceModel.collection_name)
					.find({ user_id: user.user_id })
					.toArray();
				CLIENT.close();
				console.log('audience: ', audiences);
				if (!audiences) {
					return res.status(404).json({
						status: false,
						error: 'no audience found for user',
					});
				}
				return res.status(200).json({
					status: true,
					data: audiences,
				});
			});
		} catch (error) {
			// console.log(error);
			console.error(error);
			return res.status(500).json({
				status: false,
				error: 'an error occured',
			});
		}
	});

	// endpoint to create audience
	router.route('/audience/create').post(AUTH.authenticate, async (req, res) => {
		let { name, age_range, country, interests, gender } = req.body;

		const { user_id } = req.authorization;

		// validate data exists
		if (!name || !country || !interests || !gender || !user_id) {
			return res.status(400).json({
				status: false,
				error: 'missing audience property',
			});
		}

		// validate data type
		if (
			typeof name !== 'string' ||
			typeof age_range !== 'string' ||
			typeof country !== 'object' ||
			typeof interests !== 'object' ||
			typeof gender !== 'string' ||
			typeof user_id !== 'number'
		) {
			return res.status(400).json({
				status: false,
				error: 'invalid data type',
			});
		}

		req.body.gender =
			gender.toLowerCase() === 'male'
				? 'M'
				: gender.toLowerCase() === 'female'
				? 'F'
				: gender;

		if (!validateAgeRange(age_range))
			return res
				.status(400)
				.json({ status: false, error: 'invalid age range' });

		if (country.length > 5 || interests.length > 5) {
			return res.status(400).json({
				status: false,
				error: 'max length exceeded for country or interest',
			});
		}

		try {
			// find audience
			utility.mongoConnect(req, res, async function (CLIENT) {
				if (!CLIENT) {
					return res.status(500).json({
						status: false,
						error: 'an error occured',
					});
				}
				const db = CLIENT.db(utility.dbName);
				// find user
				const user = await db
					.collection(userModel.collection_name)
					.findOne({ user_id });
				if (!user) {
					CLIENT.close();
					return res.status(404).json({
						status: false,
						error: 'could not find post',
					});
				}
				const audienceExists = await db
					.collection(audienceModel.collection_name)
					.findOne({ name, user_id: user.user_id });
				console.log(audienceExists);
				if (audienceExists) {
					CLIENT.close();
					return res.status(400).json({
						status: false,
						error: 'audience exists',
					});
				}
				const ageSplit = age_range.split('-');
				req.body.minAge = Number.parseInt(ageSplit[0]);
				req.body.maxAge = Number.parseInt(ageSplit[1]);
				let data = {
					...req.body,
					audience_id: uuid.v4(),
					user_id: user.user_id,
				};
				db.collection(audienceModel.collection_name).insertOne(
					data,
					(audienceErr, resp) => {
						CLIENT.close();
						// console.log('created audience: ', resp.ops[0]);

						if (audienceErr) {
							return res.status(422).json({
								status: false,
								error: 'could not create audience',
							});
						}
						return res.status(201).json({
							status: true,
							data: data,
						});
					}
				);
			});
		} catch (error) {
			console.log(error);
			return res.status(500).json({
				status: false,
				error: 'an error occured',
			});
		}
	});

	router.route('/audience/edit').put(AUTH.authenticate, async (req, res) => {
		const { audience_id, update } = req.body;

		if (!audience_id || !update) {
			return res.status(400).json({
				status: false,
				error: 'missing audience_id or update',
			});
		}

		if (
			!update.name &&
			!update.gender &&
			!update.interests &&
			!update.country &&
			!update.age_range
		) {
			return res.status(400).json({
				status: false,
				error: 'missing update parameter',
			});
		}

		if (update.age_range) {
			if (!validateAgeRange(update.age_range)) {
				return res
					.status(400)
					.json({ status: false, error: 'invalid age range' });
			}
		}

		try {
			utility.mongoConnect(req, res, async function (CLIENT) {
				if (!CLIENT) {
					return res.status(500).json({
						status: false,
						error: 'an error occured',
					});
				}
				const db = CLIENT.db(utility.dbName);
				const audience = await db
					.collection(audienceModel.collection_name)
					.findOne({ audience_id });
				if (!audience) {
					CLIENT.close();
					return res
						.status(404)
						.json({ status: false, error: 'no audience found' });
				}
				let audienceUpdate = {};
				try {
					if (update.gender) {
						update.gender =
							update.gender.toLowerCase() === 'male'
								? 'M'
								: update.gender.toLowerCase() === 'female'
								? 'F'
								: update.gender;
					}
					if (update.age_range) {
						const ageSplit = update.age_range.split('-');
						update.minAge = Number.parseInt(ageSplit[0]);
						update.maxAge = Number.parseInt(ageSplit[1]);
					}
					audienceUpdate = await db
						.collection(audienceModel.collection_name)
						.updateOne({ audience_id }, { $set: { ...update } });
				} catch (error) {
					console.log(error.message);
					return res.status(500).json({
						status: false,
						error: 'an error occured',
					});
				}
				CLIENT.close();
				if (
					audienceUpdate.lastErrorObject &&
					!audienceUpdate.lastErrorObject.updatedExisting
				)
					return res
						.status(422)
						.json({ status: false, error: 'could not update audience' });
				return res.status(200).json({
					status: true,
					data: {
						audience_id,
						...update,
					},
				});
			});
		} catch (error) {
			console.error(error);
			return res.status(500).json({ status: false, error: 'an error occured' });
		}
	});

	router
		.route('/audience/delete/:id')
		.delete(AUTH.authenticate, async (req, res) => {
			const { id } = req.params;
			console.log('audience id: ', id);
			if (!id) {
				return res.status(400).json({
					status: false,
					error: 'missing audience id',
				});
			}

			try {
				utility.mongoConnect(req, res, async (CLIENT) => {
					if (!CLIENT) {
						return res.status(500).json({
							status: false,
							error: 'an error occured',
						});
					}
					const db = CLIENT.db(utility.dbName);
					const Audience = db.collection(audienceModel.collection_name);

					// find audience and delete
					return Audience.findOneAndDelete({ audience_id: id })
						.then((deleted) => {
							console.log('deleted audience:', deleted);
							if (deleted.lastErrorObject.n === 0) {
								return res.status(404).json({
									status: false,
									error: 'audience not found',
								});
							}
							return res.status(200).json({
								status: true,
								message: 'audience deleted',
							});
						})
						.catch((err) => {
							console.log(err.message);
							return res.status(500).json({
								status: false,
								error: 'could not delete audience',
							});
						});
				});
			} catch (error) {
				return res.status(500).json({
					status: false,
					error: 'could not delete audience',
				});
			}
		});

	router
		.route('/payment/orders/create')
		.post(AUTH.authenticate, async (req, res) => {
			const { amount, currency } = req.body;
			const { user_id } = req.authorization;
			if (!amount) {
				return res.status(400).json({
					status: false,
					error: 'BAD REQUEST: missing amount',
				});
			}

			const order = await createPaypalOrder(amount, currency);
			if (order.id) {
				utility.mongoConnect(req, res, async function (CLIENT) {
					if (!CLIENT) {
						return res.status(500).json({
							status: false,
							error: 'an error occured',
						});
					}
					const db = CLIENT.db(utility.dbName);
					const Transaction = db.collection(transactionModel.collection_name);
					const User = db.collection(userModel.collection_name);

					// verify user in exists
					let user;
					try {
						const userExists = await User.findOne({
							user_id: Number.parseInt(user_id),
						});
						if (!userExists) {
							CLIENT.close();
							return res.status(404).json({
								status: false,
								error: 'NOT FOUND: user not found',
							});
						}
						user = userExists;
					} catch (error) {
						console.log('error finding user: ', error.message);
						return res
							.status(500)
							.json({ status: false, error: 'an error occured' });
					}

					// save transaction to db
					try {
						let transaction_id = uuid.v4();
						Transaction.insertOne(
							{
								transaction_id: transaction_id,
								order,
								user_id: user.user_id,
							},
							(err, resp) => {
								if (err) {
									CLIENT.close();
									console.log('transaction insertion error', err);
									return res.status(500).json({
										status: false,
										error: 'error creating transaction',
									});
								}

								// send response to user
								return res.status(201).json({
									status: true,
									data: {
										order: order,
										transaction: {
											transaction_id: transaction_id,
										},
									},
								});
							}
						);
					} catch (error) {
						CLIENT.close();
						console.log('error creating transaction: ', error);
						return res.status(500).json({
							status: false,
							error: error.message,
						});
					}
				});
			}
		});

	router
		.route('/payment/orders/capture')
		.post(AUTH.authenticate, handlePayPalOrderCapture);

	router
		.route('/payment/orders/get')
		.get(AUTH.authenticate, handleGetOrderDetails);

	router
		.route('/payment/orders/update')
		.patch(AUTH.authenticate, handleOrderUpdate);

	router.route('/payment/verify').post(AUTH.authenticate, verifyWebhookCapture);

	router.route('/admin/get-adverts').get(AdminAUTH.authenticate, (req, res) => {
		try {
			utility.mongoConnect(req, res, (client) => {
				const db = client.db(utility.dbName);
				const Advert = db.collection(advertModel.collection_name);
				Advert.aggregate([
					{
						$match: { audience: { $exists: true } },
					},
					{
						$lookup: {
							from: 'post',
							localField: 'post',
							foreignField: 'post_id',
							as: 'advertized_post',
						},
					},
					{
						$lookup: {
							from: 'user',
							localField: 'user_id',
							foreignField: 'user_id',
							as: 'user',
						},
					},
					{
						$lookup: {
							from: 'audience',
							localField: 'audience',
							foreignField: 'audience_id',
							as: 'advert_audience',
						},
					},
				]).toArray((err, advertList) => {
					client.close();
					if (err) {
						console.log('error:', err);
						return res.json({
							status: false,
							error: 'an error occured',
						});
					}
					return res.status(200).json({
						status: true,
						data: advertList,
					});
				});
			});
		} catch (error) {}
	});

	router
		.route('/admin/approve-advert')
		.put(AdminAUTH.authenticate, (req, res) => {
			try {
				utility.mongoConnect(req, res, async (client) => {
					const db = client.db(utility.dbName);
					const Advert = db.collection(advertModel.collection_name);
					const { advert_id } = req.body;
					if (!advert_id) {
						return res.status(400).json({
							status: false,
							error: 'missing advert id',
						});
					}

					const advert = await Advert.findOneAndUpdate(
						{ advert_id },
						{ $set: { status: req.body.status ?? 'active' } },
						{ new: true }
					);
					if (!advert) {
						res.status(400).json({
							status: false,
							error: 'invalid advert id',
						});
					}
					client.close();
					return res.status(200).json({
						status: true,
						message: 'Advert approved successfully',
						data: advert.value,
					});
				});
			} catch (error) {}
		});

	return router;
};

module.exports = { routes, handlePayPalOrderCapture };
