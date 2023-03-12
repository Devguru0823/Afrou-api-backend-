'use strict';
const utility = require('../utilities');
const bcrypt = require('bcryptjs');
const SITE_CONFIG = require('../configs/siteConfig');
const cryptoRandomString = require('crypto-random-string');
const ip = require('ip');

module.exports.authenticate = function (req, res, next) {
	if (req.headers.authorization) {
		let currentToken = req.headers.authorization.split(' ')[1];
		if (currentToken) {
			utility.mongoConnect(req, res, function (client) {
				let CONNECTION = client.db(utility.dbName);
				let accessTokenCollection = CONNECTION.collection('admin_access_token');

				accessTokenCollection.findOne(
					{ token: currentToken },
					function (err, tokenData) {
						client.close();
						if (err) {
							let error = new Error('Connectivity Error');
							next(error);
						} else {
							if (tokenData) {
								delete tokenData._id;
								req.authorization = tokenData;
								next();
							} else {
								let error = new Error();
								error.name = 'UNAUTHORISED_ERROR';
								next(error);
							}
						}
					}
				);
			});
		} else {
			let error = new Error();
			error.name = 'UNAUTHORISED_ERROR';
			next(error);
		}
	} else {
		let error = new Error();
		error.name = 'UNAUTHORISED_ERROR';
		next(error);
	}
};

module.exports.login = function (req, res, next) {
	utility.mongoConnect(req, res, function (client) {
		let CONNECTION = client.db(utility.dbName);
		let adminCollection = CONNECTION.collection('admin');
		let accessTokenCollection = CONNECTION.collection('admin_access_token');
		let { email, password } = { ...req.body };
		let validationError = {};
		if (!email) {
			validationError['email'] = 'is required';
		}
		if (!password) {
			validationError['password'] = 'is required';
		}

		if (Object.keys(validationError).length > 0) {
			let vErr = new Error();
			vErr.name = 'VALIDATION_ERROR';
			vErr.message = validationError;
			next(vErr);
		} else {
			// Now check for login
			adminCollection.findOne({ email: email }, function (err, userData) {
				if (err) {
					client.close();
					next(err);
				} else {
					if (userData) {
						// User Found
						let passwordFromDb = userData.password;
						if (bcrypt.compareSync(password, passwordFromDb)) {
							// Matched!!!
							delete userData.password;
							let accessTokenData = {
								token: cryptoRandomString(64),
								user_id: userData.user_id,
								login_time: new Date(),
								login_ip: ip.address()
							};
							accessTokenCollection.insertOne(
								accessTokenData,
								function (err, response) {
									client.close();
									if (err) {
										let error = new Error('Some error occurred while login');
										next(error);
									} else {
										// Successfully Logged in
										delete accessTokenData._id;
										accessTokenData.user = userData;
										res.status(200).json({ data: accessTokenData });
									}
								}
							);
						} else {
							client.close();
							let vErr = new Error();
							vErr.name = 'VALIDATION_ERROR';
							vErr.message = { password: 'Invalid Password' };
							next(vErr);
						}
					} else {
						client.close();
						let vErr = new Error();
						vErr.name = 'VALIDATION_ERROR';
						vErr.message = { email: 'Invalid Email' };
						next(vErr);
					}
				}
			});
		}
	});
};

module.exports.logout = function (req, res, next) {
	utility.mongoConnect(req, res, function (client) {
		let CONNECTION = client.db(utility.dbName);
		let currentAccessToken = req.authorization.token;
		let accessTokenCollection = CONNECTION.collection('admin_access_token');
		accessTokenCollection.deleteOne(
			{ token: currentAccessToken },
			function (err, resp) {
				client.close();
				if (err) {
					next(err);
				} else {
					res.json({ status: true });
				}
			}
		);
	});
};

module.exports.editProfile = function (req, res, next) {
	utility.mongoConnect(req, res, function (client) {
		let CONNECTION = client.db(utility.dbName);
		let currentAccessToken = req.authorization.token;
		let adminCollection = CONNECTION.collection('admin');
		let updatedData = utility.filterBody(req.body);
		accessTokenCollection.deleteOne(
			{ token: currentAccessToken },
			function (err, resp) {
				client.close();
				if (err) {
					next(err);
				} else {
					res.json({ status: true });
				}
			}
		);
	});
};
