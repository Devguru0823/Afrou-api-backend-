'use strict';
const logger = require('./logger');

module.exports = errorHandler;

function errorHandler(err, req, res, next) {
	const error = { ...err };
	console.log('Error: ', err.details || err);
	console.log(err.name);
	logger.error(err);
	console.log(req.headers);
	if (typeof err === 'string') {
		// custom application error
		return res.status(400).json({ message: err });
	}

	if (err.name === 'Error') {
		if (err.message.includes('failed isNumeric validation')) {
			// flutterwave error
			return res.status(400).json({
				status: false,
				error: 'invalid card number',
			});
		}
	}

	if (err.name === 'ValidationError') {
		if (err.errors || err.details) {
			const errorObject = Object.values(err.errors || err.details);
			console.log(errorObject);
			const message = Object.values(err.errors || err.details).map(
				(val) => val.message
			);
			return res.status(400).json({
				status: false,
				message: message,
			});
		}
		return res.status(400).json({
			status: false,
			message: err.message,
		});
	}

	if (err.name === 'CastError') {
		const message = `${JSON.stringify(err.value)} is not a valid ${err.kind}`;
		return res.status(400).json({
			status: false,
			error: message,
		});
	}

	if (err.name === 'VALIDATION_ERROR') {
		let message = '';
		let messageArr = [];
		if (typeof err.message === 'object') {
			Object.keys(err.message).forEach((key) => {
				if (key === 'username') {
					messageArr.push('Invalid Email or Mobile Number');
				} else if (key === 'password') {
					messageArr.push('Invalid Email or Password');
				} else if (key === 'contact_number') {
					messageArr.push('Mobile number already in use');
				} else if (key === 'email' && err.message[key] === 'should be unique') {
					messageArr.push('Email already in use');
				} else {
					console.log('Hello!!');
					messageArr.push(key + ' ' + err.message[key] + '');
				}
			});
			message = messageArr.join(', ');
		} else {
			message = err.message;
		}
		return res.status(422).json({ message: message });
	}

	if (err.name === 'UNAUTHORISED_ERROR') {
		// jwt authentication error
		return res.status(401).json({ message: 'Invalid Token' });
	}

	if (err.name === 'PERMISSION_DENIED_ERROR') {
		// jwt authentication error
		return res
			.status(401)
			.json({ message: "You don't have permission to access this resource" });
	}

	if (err.name === 'NOT_FOUND_ERROR') {
		// custom Not Found Error
		return res.status(404).json({ message: 'Requested Entry Not Found' });
	}

	if (err.name === 'TypeError') {
		return res.status(422).json({
			status: false,
			error: 'An unknown error occured please try again later',
		});
	}

	if (err.name === 'SyntaxError') {
		logger.error(err);
		return res.status(400).json({
			status: false,
			error: 'invalid data',
		});
	}

	if (err.name === 'ForbiddenError') {
		return res.status(403).json({
			status: false,
			error: err.message,
		});
	}

	// default to 500 server error
	return res
		.status(error.statusCode || 500)
		.json({ message: error.message || err.message, ...error });
}
