const Joi = require('joi');

const emailValidator = Joi.string().email();

const device_validator = Joi.object({
	browser: Joi.string(),
	country: Joi.string(),
	device_cpu: Joi.string(),
	device_name: Joi.string(),
	device_type: Joi.string(),
	os: Joi.string(),
	version_name: Joi.string(),
	version_number: Joi.string(),
	model: Joi.string(),
	version_release: Joi.string(),
	brand: Joi.string(),
	device: Joi.string()
});

const refreshTokenRequestValidator = Joi.object({
	refresh_token: Joi.string().required(),
	login_device_detail: device_validator
});

module.exports = {
	emailValidator,
	device_validator,
	refreshTokenRequestValidator
};
