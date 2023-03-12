const Joi = require('joi');

const authenticatorValidator = Joi.object({
  user_id: Joi.number().required(),
  token: Joi.string().min(3).max(15).required(),
  login_device_detail: Joi.object({
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
    device: Joi.string(),
  }).required()
})

module.exports = authenticatorValidator;