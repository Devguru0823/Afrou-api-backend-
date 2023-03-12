const Joi = require('joi');

const commentValidator = Joi.object({
  post_id: Joi.number().required(),
  comment_text: Joi.string().max(200).required(),
  comment_parent_id: Joi.number(),
  story_id: Joi.number()
});

module.exports = commentValidator;