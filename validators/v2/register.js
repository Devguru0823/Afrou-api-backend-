const Joi = require('joi');

const registrationValidator = Joi.object({
  first_name: Joi.string().required(),
  last_name: Joi.string().required(),
  username: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(3).max(30),
  register_device_detail: Joi.object({
    browser: Joi.string().required(),
    country: Joi.string().required(),
    device_cpu: Joi.string().required(),
    device_name: Joi.string().required(),
    device_type: Joi.string().required(),
    os: Joi.string().required()
  })
});

const googleRegistrationValidator = Joi.object({
  username: Joi.string(),
  email: Joi.string().email().required(),
  google_id: Joi.string().required(),
  first_name: Joi.string().required(),
  last_name: Joi.string().required(),
  login_device_detail: Joi.object({
    browser: Joi.string(),
    country: Joi.string(),
    device_cpu: Joi.string(),
    device_name: Joi.string(),
    device_type: Joi.string(),
    os: Joi.string().required()
  })
})

module.exports = { registrationValidator, googleRegistrationValidator };