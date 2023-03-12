const utility = require('../../utilities');
let USER = require('../../models/v2/user');
const userModel = require('../../models/v2/user.json');
const jwt = require('jsonwebtoken');
const ErrorResponse = require('./errorResponse');
const asyncHandler = require('../../middlewares/v2/async');

module.exports.authenticate = (req, res, next) => {
	const { authorization } = req.headers;
	// const { cookies } = req;
	if (!authorization) {
		return res.status(401).json({
			status: false,
			message: 'missing auth header',
		});
	}

	// extract token from auth header
	const token = authorization.split(' ')[1].trim();

	if (!token) {
		return res.status(401).json({
			status: false,
			message: 'UNAUTHORIZED',
		});
	}

	// if (!cookies) {
	// 	console.log('No cookies in request for user!');
	// 	return next(new ErrorResponse('Unauthorized', 403));
	// }

	let payload = {};

	// verify token
	try {
		payload = jwt.verify(token, process.env.JWT_SECRET);
	} catch (error) {
		if (error.name === 'TokenExpiredError') {
			return res.status(401).json({
				status: false,
				message: 'invalid jwt token',
			});
		}

		console.log('====================================');
		console.log('TOKEN VERIFY ERR: ', error.message);
		console.log('====================================');
		if (error.message === 'jwt malformed') {
			return res.status(401).json({
				status: false,
				message: 'invalid jwt token',
			});
		}
		return res.status(500).json({
			status: false,
			message: 'AN ERROR OCCURED',
		});
	}

	// const deviceToken = cookies[`dvt_${payload.user_id}`];

	// if (!deviceToken) {
	// 	return next(new ErrorResponse('Device not recognized', 403));
	// }

	req.authorization = { user_id: payload.user_id };
	utility.mongoConnect(req, res, async (client) => {
		const db = client.db(utility.dbName);
		const userCollection = db.collection(userModel.collection_name);

		// update user last active status
		const userUpdate = await userCollection.findOneAndUpdate(
			// { user_id: payload.user_id, device_tokens: { $in: [deviceToken] } },
			{ user_id: payload.user_id },
			{ $set: { last_active: new Date() } },
			{ returnNew: true }
		);
		client.close();
		if (
			userUpdate.lastErrorObject &&
			!userUpdate.lastErrorObject.updatedExisting
		) {
			console.log('Error updating user in authentication middleware');
			return res.status(422).json({
				status: false,
				message: 'invalid jwt token',
			});
		}
		console.log(userUpdate);
		req.authorization._id = userUpdate.value._id;
		req.authorization.user_id = userUpdate.value.user_id;
		next();
	});
};

module.exports.loginV2 = asyncHandler(async function (req, res, next) {
	console.log('LOGIN V2');
	utility.mongoConnect(req, res, function (client) {
		USER.loginV2(client, req, res, next, function (err, response) {
			client.close();
			if (err) {
				next(err);
			} else {
				if (response.refresh_token) {
					res
						.cookie('refresh_token', response.refresh_token, {
							httpOnly: true,
							path: '/',
						})
						.json(response);
					return;
				}
				return res.json(response);
			}
		});
	});
});

module.exports.twoFactorAuth = function (req, res, next) {
	utility.mongoConnect(req, res, function (client) {
		USER.twoFactorAuthAuthenticator(client, req, res, function (err, response) {
			client.close();
			if (err) {
				next(err);
			} else {
				const data = { ...response };
				const deviceToken = data.deviceToken;
				const user_id = data.user_id;
				delete data.deviceToken;
				res
					.cookie('refresh_token', data.refresh_token, {
						httpOnly: true,
						path: '/',
					})
					.cookie(`dvt_${user_id}`, deviceToken, {
						httpOnly: true,
						path: '/',
						domain:
							process.env.NODE_ENV === 'production'
								? 'afrocamgist.com'
								: undefined,
						maxAge: 5184000000000,
					})
					.json(data);
			}
		});
	});
};

module.exports.set2FAAuthMode = function (req, res, next) {
	utility.mongoConnect(req, res, function (client) {
		USER.set2FAAuthMode(client, req, res, function (err, response) {
			client.close();
			if (err) {
				next(err);
			} else {
				return res.json(response);
			}
		});
	});
};

module.exports.refreshToken = function (req, res, next) {
	utility.mongoConnect(req, res, (client) => {
		USER.refreshToken(client, req, res, (err, response) => {
			if (err) {
				next(err);
				return;
			}
			return res.json(response);
		});
	});
};

module.exports.blockAccount = function (req, res, next) {
	utility.mongoConnect(req, res, (client) => {
		USER.blockAccount(client, req, res, (err, response) => {
			if (err) {
				next(err);
				return;
			}
			return res.json(response);
		});
	});
};

module.exports.register = function (req, res, next) {
	console.log("register", req.body);
	utility.mongoConnect(req, res, function (client) {
		USER.addUser(client, req, res, function (err, response) {
			client.close();
			if (err) {
				next(err);
			} else {
				res.json(response);
			}
		});
	});
};

module.exports.registerApp = function (req, res, next) {
	utility.mongoConnect(req, res, function (client) {
		USER.addUserApp(client, req, res, function (err, response) {
			client.close();
			if (err) {
				next(err);
			} else {
				res.json(response);
			}
		});
	});
};

module.exports.checkUsername = function (req, res, next) {
	utility.mongoConnect(req, res, function (client) {
		USER.checkUsername(client, req, res, function (err, response) {
			client.close();
			if (err) {
				next(err);
			} else {
				res.json(response);
			}
		});
	});
};

module.exports.verifyEmail = function (req, res, next) {
	utility.mongoConnect(req, res, function (client) {
		USER.verifyEmail(client, req, res, function (err, response) {
			client.close();
			if (err) {
				next(err);
			} else {
				res.json(response);
			}
		});
	});
};

module.exports.verifyEmailOTP = function (req, res, next) {
	utility.mongoConnect(req, res, function (client) {
		USER.verifyEmailOTP(client, req, res, function (err, response) {
			client.close();
			if (err) {
				next(err);
			} else {
				res.json(response);
			}
		});
	});
};

module.exports.verifyPhone = function (req, res, next) {
	utility.mongoConnect(req, res, function (client) {
		USER.verifyPhone(client, req, res, function (err, response) {
			client.close();
			if (err) {
				next(err);
			} else {
				res.json(response);
			}
		});
	});
};

module.exports.logout = function (req, res, next) {
	utility.mongoConnect(req, res, function (client) {
		USER.logout(client, req, res, function (err, response) {
			client.close();
			if (err) {
				next(err);
			} else {
				res.json(response);
			}
		});
	});
};
