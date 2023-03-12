// jshint esversion: 9
const ip = require('ip');
const Ehealth = require('./Ehealth.model');
const asyncHandler = require('../../middlewares/v2/async');
const ErrorResponse = require('../../_helpers/v2/errorResponse');
const { createHistory } = require('./history');
const FlutterWave = require('flutterwave-node-v3');
const flwClient = new FlutterWave(
	process.env.FLUTTERWAVE_PUBLIC_KEY,
	process.env.FLUTTERWAVE_SECRET_KEY
);
const History = require('./History.model');
const FlutterWavePayment = require('./FlutterWavePayment.model');
const { sendInvoiceEmail } = require('../../_helpers/email-handler');
const { Testimonial } = require('./Testimonials.model');
const { handleGetOrderDetails } = require('./paypal');

module.exports.createEhealthPlan = asyncHandler(async (req, res, next) => {
	// create payment plan in flutterwave
	const paymentPlanPayload = {
		amount: req.body.price,
		name: req.body.name,
		interval: 'yearly',
		duration: 1,
	};
	const paymentPlan = await flwClient.PaymentPlan.create(paymentPlanPayload);

	// Create new Ehealth from request body
	const plan = await Ehealth.create({
		...req.body,
		plan_id: paymentPlan.data.id,
	});

	return res.status(201).json({
		status: true,
		data: plan,
	});
});

module.exports.getPlans = asyncHandler(async (req, res, next) => {
	// Get all plans
	const plans = await Ehealth.find({ status: 'active' });

	return res.status(200).json({
		status: true,
		count: plans.length,
		data: plans,
	});
});

module.exports.getPlan = asyncHandler(async (req, res, next) => {
	// Get single plan

	const { id } = req.params;

	if (!id) {
		return next(new ErrorResponse('missing plan id', 400));
	}

	const query = {
		status: 'active',
		_id: id,

		// $or: [
		//   {
		//     "subplans._id": id,
		//   },
		// ],
	};

	const plan = await Ehealth.findOne(query);

	if (!plan) {
		return next(new ErrorResponse('invalid plan id', 400));
	}

	return res.status(200).json({
		status: true,
		data: plan,
	});
});

module.exports.updatePlan = asyncHandler(async (req, res, next) => {
	// update plan
	const { id } = req.params;

	if (!id) {
		return next(new ErrorResponse('missing plan id', 400));
	}

	const plan = await Ehealth.findByIdAndUpdate(
		id,
		{ ...req.body },
		{ runValidators: true, new: true }
	);

	if (!plan) {
		return next(new ErrorResponse('invalid plan id', 400));
	}

	return res.status(200).json({
		status: true,
		message: 'update successful',
		data: plan,
	});
});

module.exports.deletePlan = asyncHandler(async (req, res, next) => {
	// delete plan
	const { id } = req.params;

	if (!id) {
		return next(new ErrorResponse('missing plan id', 400));
	}

	const plan = await Ehealth.findByIdAndUpdate(id, { status: 'deleted' });

	if (!plan) {
		return next(new ErrorResponse('invalid plan id', 400));
	}

	return res.status(200).json({
		status: true,
		data: {},
	});
});

module.exports.searchPlan = asyncHandler(async (req, res, next) => {
	const { key } = req.query;

	if (!key || typeof key !== 'string') {
		const error = new ErrorResponse('missing or invalid search key', 400);
		return next(error);
	}

	const plan = await Ehealth.findOne({ name: key.trim() });
	console.log(plan);

	// create search history
	const historyData = {
		type: 'search',
		queryString: key,
		ip: ip.address(),
	};

	const history = await createHistory(historyData);

	if (history.status) {
		console.log('history created');
		return res.status(200).json({
			status: true,
			plan: plan || {},
		});
	}

	return next(new ErrorResponse('An error occured', 500));
});

module.exports.getUserPurchasedPlans = asyncHandler(async (req, res, next) => {
	const { user_id } = req.authorization;

	const histories = await History.find({ user: user_id })
		.select('transaction plan')
		.populate('transaction');

	return res.status(200).json({
		status: true,
		count: histories.length,
		data: histories,
	});
});

module.exports.getSingleUserPurchasedPlan = asyncHandler(
	async (req, res, next) => {
		const { id } = req.params;

		if (!id) {
			const error = new ErrorResponse('invalid plan id', 400);
			return next(error);
		}

		const history = await History.findById(id)
			.select('transaction plan createdAt model_type')
			.populate('transaction');

		console.log('HISTORY:', history);

		if (!history) {
			const error = new ErrorResponse('invalid plan id', 400);
			return next(error);
		}

		const query = {
			$or: [{ _id: history.plan }, { 'subPlans._id': history.plan }],
		};

		const plan = await Ehealth.findOne(query);

		const finalResponse = {
			...history._doc,
		};

		if (plan._id === history.plan) {
			finalResponse.plan = plan;
		} else {
			const subplan = plan.subPlans.find(
				(x) => `${x._id}` === `${history.plan}`
			);
			finalResponse.plan = subplan;
		}

		return res.status(200).json({
			status: true,
			data: finalResponse,
		});
	}
);

module.exports.subscribe = asyncHandler(async (req, res, next) => {
	const { payment } = req.body;
	const { gateway } = req.query;

	if (gateway === 'paypal') {
		const newReq = { ...req, sendInvoice: true };
		return handleGetOrderDetails(newReq, res, next);
	}

	const paymentInDB = await FlutterWavePayment.findOne({
		tx_ref: payment.tx_ref,
	});

	const verifiedPayment = await flwClient.Transaction.verify({
		id: payment.transaction_id,
	});

	console.log('Flutterwave verified payment: ', verifiedPayment);

	if (!verifiedPayment) {
		return next(
			new ErrorResponse('Something unexpected happened, please try again', 422)
		);
	}

	if (!verifiedPayment.data) {
		return next(
			new ErrorResponse('Something unexpected happened, please try again', 422)
		);
	}

	if (!paymentInDB) {
		return next(new ErrorResponse('Invalid transaction ref', 400));
	}

	if (verifiedPayment.status === 'error') {
		return next(new ErrorResponse(verifiedPayment.message, 400));
	}

	if (verifiedPayment.data.status !== 'successful') {
		return next(new ErrorResponse('Payment unsuccessful', 422));
	}

	if (
		paymentInDB.amount !== verifiedPayment.data.amount &&
		paymentInDB.currency !== verifiedPayment.data.currency
	) {
		return next(new ErrorResponse('Invalid transaction', 400));
	}

	const updateData = {
		...verifiedPayment.data,
		ehealth: verifiedPayment.data.meta.plan_id,
		user_id: verifiedPayment.data.meta.user_id,
	};

	const updatedPaymentInDB = await FlutterWavePayment.findByIdAndUpdate(
		paymentInDB._id,
		updateData
	);

	const historyData = {
		type: 'purchase',
		ip: ip.address(),
		transaction: updatedPaymentInDB._id,
		plan: verifiedPayment.data.meta.plan_id,
		user: verifiedPayment.data.meta.user_id,
		model_type: 'FlutterwavePayment',
	};
	const transactionHistory = await createHistory(historyData);

	console.log('TRANSACTION HISTORY: ', transactionHistory);

	if (!transactionHistory.status) {
		return next(
			new ErrorResponse('An error occurred while creating transaction history'),
			422
		);
	}

	// Send invoice email to user
	try {
		sendInvoiceEmail(transactionHistory.history._id, {
			name: verifiedPayment.data.customer.name,
			email: verifiedPayment.data.customer.email,
			user_id: verifiedPayment.data.meta.user_id,
		});
	} catch (error) {
		console.log(error);
	}

	return res.status(200).json({
		status: true,
		message: `Payment complete.${
			verifiedPayment.data.meta.isNewCustomer
				? ' Please check your email and verify your account'
				: ''
		}`,
		data: {
			...verifiedPayment.data,
			subscription_id: transactionHistory.history._id,
		},
	});
});

module.exports.getTestimonialVideos = asyncHandler(async (req, res, next) => {
	const testimonials = await Testimonial.find({ status: 'active' });

	return res.status(200).json({
		status: true,
		count: testimonials.length,
		data: testimonials,
	});
});
