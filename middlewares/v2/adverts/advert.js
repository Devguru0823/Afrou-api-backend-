const Joi = require('joi');
const Audience = require('../../../models/v2/Audience');
const Budget = require('../../../models/v2/Budget');
const Goal = require('../../../models/v2/Goal');
const { PaypalPayments } = require('../../../models/v2/PaypalPayments.model');
const ErrorResponse = require('../../../_helpers/v2/errorResponse');
const asyncHandler = require('../async');
const utility = require('../../../utilities');
const postModel = require('../../../models/v2/post.json');

/** VALIDATOR SCHEMAS  */

// AUDIENCE SCHEMAS
const audienceCreateRequestSchema = Joi.object({
	name: Joi.string().required().max(50),
	age_range: Joi.string()
		.pattern(/([1-9]|[1-9][0-9]|100)/)
		.required(),
	country: Joi.array().items(Joi.string()).required(),
	interests: Joi.array().items(Joi.string()).required(),
	gender: Joi.string()
		.required()
		.pattern(/^(?:m|M|male|Male|f|F|female|Female|all)$/),
});

const audienceUpdateRequestSchema = Joi.object({
	audience_id: Joi.string().required(),
	update: Joi.object({
		name: Joi.string().max(50),
		age_range: Joi.string().pattern(/([1-9]|[1-9][0-9]|100)/),
		countries: Joi.array().items(Joi.string),
		interests: Joi.array().items(Joi.string),
		gender: Joi.string().pattern(/^(?:m|M|male|Male|f|F|female|Female|all)$/),
	}).required(),
});

// BUDGET SCHEMAS
const budgetCreateRequestSchema = Joi.object({
	duration: Joi.number().required(),
});

// GOAL SCHEMAS
const goalCreateRequestSchema = Joi.object({
	goal_type: Joi.string()
		.required()
		.pattern(/profile_visit|website_visit/),
	url: Joi.string().uri({ allowRelative: true }),
});

// ADVERT SCHEMAS
const advertCreateRequestSchema = Joi.object({
	goal_id: Joi.string().required(),
	audience_id: Joi.string().required(),
	budget_id: Joi.string().required(),
	transaction_id: Joi.string().required(),
	post_id: Joi.number().required(),
});

/* VALIDATOR MIDDLEWARE FUNCTIONS */

// AUDIENCE VALIDATORS
const validateAudienceCreateRequest = asyncHandler(async (req, res, next) => {
	await audienceCreateRequestSchema.validateAsync(req.body);
	next();
});

const validateAudienceUpdateRequest = asyncHandler(async (req, res, next) => {
	await audienceUpdateRequestSchema.validateAsync(req.body);
	next();
});

// BUDGET VALIDATORS
const validateBudgetCreateRequest = asyncHandler(async (req, res, next) => {
	await budgetCreateRequestSchema.validateAsync(req.body);
	next();
});

// GOAL VALIDATORS
const validateGoalCreateRequest = asyncHandler(async (req, res, next) => {
	await goalCreateRequestSchema.validateAsync(req.body);
	next();
});

// ADDVERT VALIDATORS
const validateAdvertCreateRequest = asyncHandler(async (req, res, next) => {
	await advertCreateRequestSchema.validateAsync(req.body);

	// validate ids
	const { goal_id, budget_id, transaction_id, audience_id, post_id } = req.body;

	const goalExists = await Goal.findById(goal_id);
	const budgetExists = await Budget.findById(budget_id);
	const transactionExists = await PaypalPayments.findById(transaction_id);
	const audienceExists = await Audience.findById(audience_id);

	console.log(goalExists, budgetExists, transactionExists, audienceExists);

	if (!goalExists || !budgetExists || !transactionExists || !audienceExists) {
		return next(new ErrorResponse('Invalid id passed', 400));
	}

	if (transactionExists.order.status !== 'COMPLETED') {
		return next(new ErrorResponse('invalid transaction id', 400));
	}

	return utility.mongoConnect(req, res, async function (client) {
		const db = client.db(utility.dbName);
		const postCollection = db.collection(postModel.collection_name);

		const postExitsts = await postCollection.findOne({ post_id });

		if (!postExitsts) {
			return next(new ErrorResponse('invalid post id', 400));
		}

		next();
	});
});

module.exports = {
	validateAudienceCreateRequest,
	validateAudienceUpdateRequest,
	validateBudgetCreateRequest,
	validateGoalCreateRequest,
	validateAdvertCreateRequest,
};
