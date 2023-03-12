const Joi = require('joi');

const postValidator = Joi.object({
	post_type: Joi.string().required(),
	post_lat_long: Joi.string().allow(''),
	post_image: Joi.array().items(Joi.string()),
	post_video: Joi.string(),
	post_text: Joi.string().allow(''),
	share_post_id: Joi.number(),
	group_id: Joi.number().allow(''),
	posted_for: Joi.string(),
	thumbnail: Joi.string(),
});

module.exports = postValidator;
