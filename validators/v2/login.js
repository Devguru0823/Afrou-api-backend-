const Joi = require('joi');

const loginValidator = Joi.object({
  username: Joi.string(),
  email: Joi.string().email(),
  first_name: Joi.string(),
  last_name: Joi.string(),
  password: Joi.string().min(3).max(30),
  google_id: Joi.string(),
  facebook_id: Joi.string(),
  firebase_token: Joi.string(),
  type: Joi.string().min(3).max(30),
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
}).with('google_id', ['email', 'first_name', 'last_name'])

// .with('username', ['login_device_detail']).with('google_id', ['email', 'first_name', 'last_name', 'login_device_detail'])

module.exports = { loginValidator };