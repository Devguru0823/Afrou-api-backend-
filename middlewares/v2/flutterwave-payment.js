const Joi = require('joi');
const asyncHandler = require('./async');
const ErrorResponse = require('../../_helpers/v2/errorResponse');
const { device_validator } = require('../../validators/v2/constants');
const Ehealth = require('../../models/v2/Ehealth.model');
const utility = require('../../utilities');
const userModel = require('../../models/v2/user.json');

const payloadSchema = Joi.object({
	card_number: Joi.string().required().trim(),
	cvv: Joi.string().required().max(3).trim(),
	expiry_month: Joi.string().required().max(2).trim(),
	expiry_year: Joi.string().required().max(2).trim(),
	currency: Joi.string().required().max(3).trim(),
	amount: Joi.string().required().trim(),
	email: Joi.string().email().trim(),
	saveCard: Joi.boolean().required(),
	user_id: Joi.string(),
	customer: Joi.object({
		first_name: Joi.string().required(),
		last_name: Joi.string().required(),
		username: Joi.string().required(),
		password: Joi.string().required(),
	}),
	register_device_detail: device_validator,
	authorization: Joi.object(),
	otp: Joi.string(),
	flw_ref: Joi.string(),
	plan_id: Joi.string().required(),
}).xor('user_id', 'customer');

const createPaymentSchema = Joi.object({
	amount: Joi.number().required(),
	currency: Joi.string().required().max(3),
	customer: Joi.object({
		isNewCustomer: Joi.boolean().required(),
		email: Joi.string().required().email(),
		first_name: Joi.string(),
		last_name: Joi.string(),
		phone_number: Joi.string(),
		password: Joi.string(),
		user_id: Joi.number(),
	}).required(),
	plan_id: Joi.string().required(),
});

module.exports.validatePaymentPayload = asyncHandler(async (req, res, next) => {
	await payloadSchema.validateAsync(req.body);
	next();
});

module.exports.validateCreatePayment = asyncHandler(async (req, res, next) => {
	await createPaymentSchema.validateAsync(req.body);

	// verify plan id
	const query = {
		$or: [{ _id: req.body.plan_id }, { 'subplans._id': req.body.plan_id }],
	};
	const planExists = await Ehealth.findOne(query);
	if (!planExists) {
		return next(new ErrorResponse('Invalid plan id', 400));
	}

	if (req.body.customer.user_id) {
		utility.mongoConnect(req, res, async function (client) {
			const db = client.db(utility.dbName);
			const userCollection = db.collection(userModel.collection_name);

			const userExists = await userCollection.findOne({
				user_id: Number.parseInt(req.body.customer.user_id),
			});

			console.log(userExists);
			if (!userExists) {
				return next(new ErrorResponse('Invalid user id', 400));
			}

			// validate user details match user with user_id
			const fieldsToExclude = ['isNewCustomer', 'password'];

			// exclude fields in the array from the object
			// const matchObject = Object.fromEntries(
			// 	Object.entries(req.body.customer)
			// 		.map(([key, val]) => {
			// 			if (!fieldsToExclude.includes(key, 0)) return [key, val];
			// 		})
			// 		.filter((x) => x !== undefined)
			// );

			const matchObject = { ...req.body.customer };

			for (let field of fieldsToExclude) {
				if (field in req.body.customer) {
					delete matchObject[field];
				}
			}

			console.log(matchObject);

			for (const [key, value] of Object.entries(matchObject)) {
				if (
					typeof userExists[key] === 'string' &&
					userExists[key].toLowerCase().trim() !== value.toLowerCase().trim()
				) {
					return next(
						new ErrorResponse('user details does not match user id', 400)
					);
				} else if (userExists[key] !== value) {
					return next(new ErrorResponse('Invalid user details', 400));
				}
			}
		});
	}
	next();
});
