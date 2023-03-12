// jshint esversion: 9
const router = require('express').Router();
const uuid = require('uuid');
const paypalSDK = require('@paypal/checkout-server-sdk');
const axios = require('axios').default;
const paypalClient = require('../../_helpers/paypalClient');
const utility = require('../../utilities');
const Audience = require('../../models/v2/Audience');
const postModel = require('../../models/post.json');
const advertModel = require('../../models/advert.model.json');
const userModel = require('../../models/user.json');
const transactionModel = require('../../models/transaction.json');
const AUTH = require('../../_helpers/v2/authentication');
const AdminAUTH = require('../../admin/authentication');
const {
	validateAudienceCreateRequest,
	validateAudienceUpdateRequest,
	validateBudgetCreateRequest,
	validateGoalCreateRequest,
	validateAdvertCreateRequest,
} = require('../../middlewares/v2/adverts/advert');
const asyncHandler = require('../../middlewares/v2/async');
const ErrorResponse = require('../../_helpers/v2/errorResponse');
const Budget = require('../../models/v2/Budget');
const Goal = require('../../models/v2/Goal');
const Advert = require('../../models/v2/Advert.model');
const { PaypalPayments } = require('../../models/v2/PaypalPayments.model');
const { handlePaymentCapture } = require('../../models/v2/paypal');
const { getPostViewCount, getPostLikeCount } = require('../../models/v2/post');
const LIKE_MODEL = require('../../models/v2/likes.json');

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
			access_token: req.authorization.access_token
				? req.authorization.access_token
				: undefined,
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
			access_token: req.authorization.access_token
				? req.authorization.access_token
				: undefined,
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
		access_token: req.authorization.access_token
			? req.authorization.access_token
			: undefined,
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
					access_token: req.authorization.access_token
						? req.authorization.access_token
						: undefined,
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
			from: Audience.collection.collectionName,
			localField: 'audience',
			foreignField: '_id',
			as: 'audience',
		},
	};
	return lookup;
}

function goalLookup() {
	const lookup = {
		$lookup: {
			from: Goal.collection.collectionName,
			localField: 'goal',
			foreignField: '_id',
			as: 'goal',
		},
	};
	return lookup;
}

function budgetLookup() {
	const lookup = {
		$lookup: {
			from: Budget.collection.collectionName,
			localField: 'budget',
			foreignField: '_id',
			as: 'budget',
		},
	};
	return lookup;
}

function transactionLookup() {
	const lookup = {
		$lookup: {
			from: PaypalPayments.collection.collectionName,
			localField: 'transaction',
			foreignField: '_id',
			as: 'transaction',
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
			access_token: req.authorization.access_token
				? req.authorization.access_token
				: undefined,
		});
	});
};

const routes = () => {
	// endpoint to get adverts
	router.route('/get').get(
		AUTH.authenticate,
		asyncHandler(async (req, res, next) => {
			const { user_id } = req.authorization;

			const adverts = await Advert.aggregate([
				{
					$match: {
						user_id,
						status: { $nin: ['rejected', 'expired'] },
					},
				},
				postLookup(),
				audienceLookup(),
				goalLookup(),
				budgetLookup(),
				transactionLookup(),
				// {
				// 	$match: {
				// 		'post.post_type': {
				// 			$in: ['image', 'video'],
				// 		},
				// 	},
				// },
				{
					$project: {
						start_date: 0,
						end_date: 0,
					},
				},
				{
					$project: {
						_id: 1,
						status: 1,
						advert_id: 1,
						goal: {
							$arrayElemAt: ['$goal', 0],
						},
						audience: {
							$arrayElemAt: ['$audience', 0],
						},
						budget: {
							$arrayElemAt: ['$budget', 0],
						},
						post: {
							$arrayElemAt: ['$post', 0],
						},
						transaction: {
							$arrayElemAt: ['$transaction', 0],
						},
						user_id: 1,
						expired: 1,
						timestamp: 1,
					},
				},
			]).exec();

			console.log('ADVERTS: ', adverts);

			return res.status(200).json({
				status: true,
				count: adverts.length,
				data: adverts,
			});

			// try {
			// 	utility.mongoConnect(req, res, async function (CLIENT) {
			// 		if (!CLIENT) {
			// 			return res.status(500).json({
			// 				status: false,
			// 				error: 'an error occured',
			// 			});
			// 		}
			// 		const db = CLIENT.db(utility.dbName);
			// 		const user = await db
			// 			.collection(userModel.collection_name)
			// 			.findOne({ user_id });
			// 		if (!user) {
			// 			CLIENT.close();
			// 			return res
			// 				.status(404)
			// 				.json({ status: false, error: 'no user found' });
			// 		}
			// 		// find adverts
			// 		// const adverts = await db.collection(advertModel.collection_name).find({ user_id }).toArray();
			// 		const adverts = await db
			// 			.collection(advertModel.collection_name)
			// 			.aggregate([
			// 				{
			// 					$match: {
			// 						user_id: user_id,
			// 					},
			// 				},
			// 				postLookup(),
			// 				audienceLookup(),
			// 				goalLookup(),
			// 				budgetLookup(),
			// 				{
			// 					$match: {
			// 						'post.post_type': {
			// 							$in: ['image', 'video'],
			// 						},
			// 					},
			// 				},
			// 				{
			// 					$project: {
			// 						start_date: 0,
			// 						end_date: 0,
			// 					},
			// 				},
			// 			])
			// 			.toArray();
			// 		console.log(adverts);
			// 		CLIENT.close();
			// 		if (!adverts)
			// 			return res
			// 				.status(404)
			// 				.json({ status: false, error: 'no adverts found' });
			// 		return res.status(200).json({
			// 			status: true,
			// 			data: adverts,
			// 			access_token: req.authorization.access_token
			// 				? req.authorization.access_token
			// 				: undefined,
			// 		});
			// 	});
			// } catch (error) {
			// 	console.error(error);
			// 	return res
			// 		.status(500)
			// 		.json({ status: false, error: 'an error occured' });
			// }
		})
	);

	// endpoint to create advert
	router.route('/create').post(
		AUTH.authenticate,
		validateAdvertCreateRequest,
		asyncHandler(async (req, res, next) => {
			const { audience_id, goal_id, budget_id, post_id, transaction_id } =
				req.body;
			const { user_id } = req.authorization;

			const advert_data = {
				advert_id: uuid.v4(),
				status: 'review',
				goal: goal_id,
				audience: audience_id,
				budget: budget_id,
				transaction: transaction_id,
				post: post_id,
				user_id: user_id,
				// start_date: new Date(),
				// end_date: calculateEndDate(budget.duration),
				// end_timestamp: calculateEndDate(budget.duration).getTime(),
				// timestamp: new Date().getTime(),
			};

			const advert = await Advert.create(advert_data);

			// TODO: Apply code below to approve endpoint
			// const postUpdate = await Post.updateOne(
			// 	{ post_id: post.post_id },
			// 	{ $set: { promoted: true } }
			// );

			return res.status(201).json({
				status: true,
				message: 'Advert created successfully',
				data: advert,
			});
		})
	);

	// endpoint to get, update and delete single audience
	router
		.route('/audience/:id')
		.get(
			asyncHandler(async (req, res, next) => {
				const { id } = req.params;
				const { user_id } = req.authorization;

				const audience = await Audience.findOne({ _id: id, user_id });

				return res.status(200).json({
					status: true,
					data: audience,
				});
			})
		)
		.put(
			AUTH.authenticate,
			validateAudienceUpdateRequest,
			asyncHandler(async (req, res, next) => {
				const { id } = req.params;
				const { user_id } = req.authorization;
				const { update } = req.body;

				const audience_update = await Audience.findOneAndUpdate(
					{ _id: id, user_id },
					{ ...update },
					{ new: true }
				);

				if (!audience_update) {
					return next(new ErrorResponse('invalid audience id', 400));
				}

				return res.status(200).json({
					status: true,
					message: 'audience update successful',
					data: audience_update,
				});
			})
		)
		.delete(
			AUTH.authenticate,
			asyncHandler(async (req, res) => {
				const { id } = req.params;
				console.log('audience id: ', id);

				const deleted_audience = await Audience.findByIdAndDelete(id);

				if (!deleted_audience)
					return next(new ErrorResponse('invalid audience id', 400));

				return res.status(200).json({
					status: true,
					message: 'audience deleted successfully',
				});
			})
		);

	// endpoint to get all audience for user and create a new audience
	router
		.route('/audience')
		.get(
			AUTH.authenticate,
			asyncHandler(async (req, res, next) => {
				const { user_id } = req.authorization;

				const audiences = await Audience.find({ user_id });

				return res.status(200).json({
					status: true,
					count: audiences.length,
					data: audiences,
				});
			})
		)
		.post(
			AUTH.authenticate,
			validateAudienceCreateRequest,
			asyncHandler(async (req, res, next) => {
				let { name } = req.body;

				const { user_id } = req.authorization;

				// validate audience does not exist for user
				const query = { name, user_id };
				const audienceExists = await Audience.findOne(query);

				if (audienceExists) {
					return next(new ErrorResponse('audience name exists for user', 400));
				}

				const audience_data = {
					...req.body,
					audience_id: uuid.v4(),
					user_id,
				};

				const audience = await Audience.create(audience_data);

				return res.status(201).json({
					status: true,
					data: audience,
				});
			})
		);

	router.route('/budget').post(
		validateBudgetCreateRequest,
		asyncHandler(async (req, res, next) => {
			const budget_data = {
				...req.body,
				budget_id: uuid.v4(),
				budget: 1,
			};

			budget_data.amount = budget_data.budget * budget_data.duration;

			const budget = await Budget.create(budget_data);

			return res.status(201).json({
				status: true,
				data: budget,
			});
		})
	);

	router.route('/goal').post(
		validateGoalCreateRequest,
		asyncHandler(async (req, res, next) => {
			const goal_data = {
				...req.body,
				goal_id: uuid.v4(),
			};

			const goal = await Goal.create(goal_data);

			return res.status(201).json({
				status: true,
				data: goal,
			});
		})
	);

	router.route('/payment/orders/create').post(
		AUTH.authenticate,
		asyncHandler(async (req, res) => {
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
				const transaction_data = {
					transaction_id: uuid.v4(),
					order,
					user_id,
				};

				const transaction = await PaypalPayments.create(transaction_data);

				return res.status(201).json({
					status: true,
					data: {
						order,
						transaction: {
							transaction_id: transaction._id,
						},
					},
				});
			}
		})
	);

	router
		.route('/payment/orders/capture')
		.post(AUTH.authenticate, handlePaymentCapture);

	router
		.route('/payment/orders/get')
		.get(AUTH.authenticate, handleGetOrderDetails);

	router
		.route('/payment/orders/update')
		.patch(AUTH.authenticate, handleOrderUpdate);

	router.route('/payment/verify').post(AUTH.authenticate, verifyWebhookCapture);

	router.route('/admin/get-adverts').get(AdminAUTH.authenticate, (req, res) => {
		try {
			let skip = 0;
			let limit = 10;
			let page = 1;
			if (req.query.page) {
				page = Number(req.query.page);
				skip = (page - 1) * limit;
			}
			console.log(skip, page);
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
					{
						$skip: skip,
					},
					{
						$limit: limit,
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
						count: advertList.length,
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
						{ $set: { status: 'active' } },
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
