const Joi = require('joi');
const asyncHandler = require('./async');
const ErrorResponse = require('../../_helpers/v2/errorResponse');

const historySchema = Joi.object({
	type: Joi.string().required().equal('search', 'purchase'),
	transaction: Joi.string(),
	queryString: Joi.string(),
	user: Joi.string()
}).with('transaction', 'user');

module.exports = asyncHandler(async (req, res, next) => {
	await historySchema.validateAsync(req.body);
	next();
});
