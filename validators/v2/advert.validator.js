const Joi = require('joi');

const advertUpdateValidator = Joi.object({
	status: Joi.string().valid('active', 'rejected').required(),
	reason: Joi.when('status', {
		is: Joi.equal('rejected'),
		then: Joi.string(),
	}),
});

module.exports = {
	advertUpdateValidator,
};
