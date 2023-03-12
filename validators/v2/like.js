const Joi = require('joi');

const likeValidator = Joi.object({
	post_id: Joi.number(),
	author_id: Joi.number(),
	like_type: Joi.string(),
	comment_id: Joi.number(),
	story_id: Joi.number(),
	message_id: Joi.number(),
});

module.exports = likeValidator;
