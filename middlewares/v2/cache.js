const redisConnect = require('../../configs/redisConfig');
const asyncHandler = require('./async');

const ehealthPlansCache = asyncHandler(async (req, res, next) => {
	const redisClient = await redisConnect();

	const plans = await redisClient.get('ehealth_plans');

	if (!plans) {
		return next();
	}

	return res.status(200).json({
		status: true,
		data: JSON.parse(plans),
	});
});

const ehealthSinglePlanCache = asyncHandler(async (req, res, next) => {
	const redisClient = await redisConnect();

	const planId = req.params.id;

	const plan = await redisClient.get(planId);

	if (!plan) {
		return next();
	}

	return res.status(200).json({
		status: true,
		data: JSON.parse(plan),
	});
});

module.exports = { ehealthPlansCache, ehealthSinglePlanCache };
