const ErrorResponse = require('../../_helpers/v2/errorResponse');

const joiMiddleware =
	(schema, property = undefined) =>
	(req, res, next) => {
		const { error } = schema.validate(req[property || 'body'], {
			allowUnknown: false,
		});

		console.log(error);

		//return error if the error object contains details
		if (error !== null && error?.details) {
			const { details } = error;
			const message = details.map((err) => err.message).join(',');

			return next(new ErrorResponse(message, 422));
		}

		next();
	};

module.exports = joiMiddleware;
