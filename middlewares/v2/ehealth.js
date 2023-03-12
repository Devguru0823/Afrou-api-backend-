const Joi = require('joi');
const asyncHandler = require('./async');

const createEhealthValidatorSchema = Joi.object({
	name: Joi.string().max(50).required(),
	description: Joi.string().max(500).allow(''),
	price: Joi.string(),
	currency: Joi.string().max(3),
	benefits: Joi.array().items(Joi.string()),
	subPlans: Joi.array().items(
		Joi.object({
			name: Joi.string().max(50).required(),
			description: Joi.string().max(500),
			price: Joi.string().required(),
			currency: Joi.string().max(3).required(),
			benefits: Joi.array().items(Joi.string()),
		})
	),
}).with('price', 'currency');

const updateEhealthValidatorSchema = Joi.object({
	name: Joi.string().max(50),
	description: Joi.string().max(500),
	price: Joi.string(),
	currency: Joi.string().max(3),
	benefits: Joi.array().items(Joi.string()),
	subPlans: Joi.array().items(
		Joi.object({
			name: Joi.string().max(50),
			description: Joi.string().max(500),
			price: Joi.string(),
			currency: Joi.string().max(3),
			benefits: Joi.array().items(Joi.string()),
		})
	),
}).with('price', 'currency');

const createEhealthValidator = asyncHandler(async (req, res, next) => {
	await createEhealthValidatorSchema.validateAsync(req.body);
	next();
});

const updateEhealthValidator = asyncHandler(async (req, res, next) => {
	await updateEhealthValidatorSchema.validateAsync(req.body);
	next();
});

module.exports = {
	createEhealthValidator,
	updateEhealthValidator,
};
