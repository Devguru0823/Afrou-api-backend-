// jshint esversion:9
'use strict';
const Model = require('./user.json');
let utility = require('../../utilities');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const SITE_CONFIG = require('../../configs/siteConfig.json');
const cryptoRandomString = require('crypto-random-string');
const ip = require('ip');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const PROFILE = require('./profile.js');
const EMAIL_HANDLER = require('../../_helpers/email-handler');
const SMS_HANDLER = require('../../_helpers/sms-handler');
const authenticatorValidator = require('../../validators/v2/authenticatorModeValidator.js');
const {
	device_validator,
	emailValidator,
	refreshTokenRequestValidator,
} = require('../../validators/v2/constants.js');
const { loginValidator } = require('../../validators/v2/login.js');
const generateJwt = require('../../_helpers/v2/generateJwt.js');
const {
	googleRegistrationValidator,
	registrationValidator,
} = require('../../validators/v2/register.js');

function generateTwoFactorAuthSecret() {
	const secret = speakeasy.generateSecret();
	return {
		secret: secret.base32,
		twoFaObj: secret,
	};
}

async function setAuthenticatorUp(TwoFactorAuthCollection, user_id, cb) {
	// find or create user two factor authentication
	const user2FA = await TwoFactorAuthCollection.findOne({
		user_id: Number.parseInt(user_id),
	});

	if (!user2FA) {
		// generate 2fa secret
		const { secret, twoFaObj } = generateTwoFactorAuthSecret();
		// create one
		const twoFactorAuthData = {
			user_id: Number.parseInt(user_id),
			two_fa_secret: twoFaObj,
			created_date: new Date(),
		};

		const inserted_2fa = await TwoFactorAuthCollection.insertOne(
			twoFactorAuthData
		);
		if (!inserted_2fa.insertedId) {
			console.log('ERROR INSERTING 2FA DATA');
			cb({ status: false, message: 'AN ERROR OCCURED' });
			return;
		}

		// send 2fa details to client
		return cb(false, { status: true, issuer: 'Afro2fa', secret });
	}

	// send 2fa details to client
	return cb(false, {
		status: true,
		issuer: 'Afro2fa',
		secret: user2FA.two_fa_secret.base32,
	});
}

async function setEmail2fa(
	req,
	userCollection,
	user_id,
	username,
	otpCollection,
	cb
) {
	user_id = Number.parseInt(user_id);

	if (username && typeof username !== 'string') {
		cb({ error: 'invalid data' });
		return;
	}

	const query = username
		? { $or: [{ email: username }, { contact_number: username }] }
		: { user_id };
	const userData = await userCollection.findOne(query);
	if (!userData) {
		cb({ status: false, message: 'user not found' }, false);
		return;
	}

	// const payload = { user_id: userData.user_id, login_device_detail };
	const token = generateOTP();

	// set token expiry
	const tokenExpiry = Date.now() + 600 * 1000;

	// insert otp to db.
	const insertOptions = {
		token,
		tokenExpiry,
		hasExpired: false,
		user_id,
	};

	const insertedTokenData = await otpCollection.insertOne(insertOptions);

	if (!insertedTokenData.insertedId) {
		cb({ message: 'error inserting token data' });
		return;
	}

	EMAIL_HANDLER.send2FaTokenEmail(userData, token);

	cb(false, { status: true, message: 'token sent to mail' });
}

async function setPhone2fa(
	req,
	userCollection,
	user_id,
	username,
	otpCollection,
	cb
) {
	user_id = Number.parseInt(user_id);
	if (username && typeof username !== 'string') {
		cb({ error: 'invalid data' });
		return;
	}

	const query = username
		? { $or: [{ email: username }, { contact_number: username }] }
		: { user_id };

	const userData = await userCollection.findOne(query);
	if (!userData) {
		cb({ status: false, message: 'user not found' }, false);
		return;
	}

	// generate otp
	const token = generateOTP();

	// set token expiry
	const tokenExpiry = Date.now() + 600 * 1000;

	// insert otp to db.
	const insertOptions = {
		token,
		tokenExpiry,
		hasExpired: false,
		user_id,
	};

	const insertedTokenData = await otpCollection.insertOne(insertOptions);

	if (!insertedTokenData.insertedId) {
		cb({ message: 'error inserting token data' });
		return;
	}

	SMS_HANDLER.send2FaLinkSMS(userData, token, (err, msgRes) => {
		if (err) {
			cb(err, null);
		} else {
			cb(null, { status: true, message: 'link sent to phone' });
		}
	});

	// cb(false, { status: true, message: 'link sent to phone' })
}

async function verifyAuthenticatorMode(req, client, cb) {
	// validate incoming request.
	try {
		await authenticatorValidator.validateAsync(req.body);
	} catch (error) {
		const vErr = new Error();
		(vErr.name = error.name), (vErr.message = error.message);
		cb(vErr, false);
		return;
	}

	const { user_id, token, login_device_detail } = req.body;

	// db connection config
	const db = client.db(utility.dbName);
	const userCollection = db.collection(Model.collection_name);
	const RefreshToken = db.collection(SITE_CONFIG.refreshTokenCollection);
	const TwoFactorAuthCollection = db.collection(SITE_CONFIG.TwoFaCollection);

	// find User's 2fa
	const twoFA = await TwoFactorAuthCollection.findOne({ user_id });

	if (!twoFA) {
		cb({ status: false, message: '2fa for user not found' });
		return;
	}

	// extract secret from user's 2fa
	console.log('2FA auth object:', twoFA);
	const { two_fa_secret } = twoFA;
	const { base32: secret } = two_fa_secret;

	// validate token with speakeasy
	const validated = speakeasy.totp.verify({
		secret,
		encoding: 'base32',
		token,
		window: 1,
	});

	// invalid token
	if (!validated) {
		console.log('An error occured!');
		cb(false, { status: false, message: 'invalid token or token expired' });
		return;
	}

	// token valid, send successful response
	// set jwt token payload data
	const accessTokenPayload = { user_id: twoFA.user_id };
	const refreshTokenPayload = { user_id: twoFA.user_id, login_device_detail };

	// generate access and refresh token
	const access_token = generateJwt(accessTokenPayload, 'access');
	let refresh_token = '';

	// find refresh token for user
	let refresh_token_in_db = await RefreshToken.findOne({
		user_id: twoFA.user_id,
		status: 'active',
	});

	// validate refresh token hasn't expired
	try {
		const payload = jwt.verify(
			refresh_token_in_db.token,
			process.env.JWT_SECRET
		);
		// set refresh token from db
		refresh_token = payload.user_id ? refresh_token_in_db.token : null;
	} catch (error) {
		if (error.name !== 'TokenExpiredError') {
			// send error message
			cb(error);
			return;
		}

		// generate new refresh token for user.
		const new_refresh_token = generateJwt(refreshTokenPayload, 'refresh');

		// update token in db
		const updatedToken = await RefreshToken.findOneAndUpdate(
			{ _id: refresh_token_in_db._id },
			{ $set: { token: new_refresh_token } }
		);
		if (
			updatedToken.lastErrorObject &&
			!updatedToken.lastErrorObject.updatedExisting
		) {
			cb({ message: 'error updating refresh token' }, false);
			return;
		}

		refresh_token = new_refresh_token;
	}

	if (!refresh_token_in_db) {
		//token does not exist
		// generate refresh token
		const new_refresh_token = generateJwt(refreshTokenPayload, 'refresh');
		const refreshTokenData = {
			user_id: twoFA.user_id,
			token: new_refresh_token,
			status: 'active',
		};
		// store token in db
		const insertedTokenData = await RefreshToken.insertOne(refreshTokenData);
		console.log('inserted token data:', insertedTokenData.insertedId);
		if (!insertedTokenData.insertedId) {
			cb(new Error('error insterting refresh token'), false);
			return;
		}

		// change refresh token value to new token
		refresh_token = new_refresh_token;
	}

	// create user update data and update user
	const updateData = {
		last_login_ip: ip.address(),
		login_device_detail,
		last_login_ip: ip.address(),
		status: 'active',
	};

	const updatedUser = await userCollection.findOneAndUpdate(
		{ user_id: twoFA.user_id },
		{ $set: updateData },
		{ returnNewDocument: true }
	);
	console.log('UPDATED USER:', updatedUser);

	req.authorization = { user_id: twoFA.user_id };
	const res = {};
	PROFILE.getUserProfile(
		client,
		req,
		res,
		twoFA.user_id,
		function (err, profileData) {
			// Successfully Logged in
			let data = {
				status: profileData.status,
				access_token,
				refresh_token,
				user: profileData.data,
			};
			cb(null, data);
		}
	);
}

/**
 * Function to verify if an otp has expired
 *
 * @param {number} currentTimeStamp
 * @param {number} expiryTimeStamp
 * @returns
 */
function verifyOtpExpiry(currentTimeStamp, expiryTimeStamp) {
	if (currentTimeStamp <= expiryTimeStamp) {
		return true;
	}
	return false;
}

async function verifyEmailMode(req, user_id, login_device_detail, client, cb) {
	const { token } = req.body;
	const db = client.db(utility.dbName);
	const userCollection = db.collection(Model.collection_name);
	const otpCollection = db.collection('otp');
	const refreshTokenCollection = db.collection(
		SITE_CONFIG.refreshTokenCollection
	);

	if (!token || typeof token !== 'string') {
		cb({ message: 'missing or invalid token' });
		return;
	}

	// find otp
	let otpDetails;
	try {
		otpDetails = await otpCollection.findOne({
			token,
			user_id,
			hasExpired: false,
		});
	} catch (error) {
		console.log('ERROR VALIDATING OTP', error.message);
		const tokenError = new Error();
		tokenError.name = 'Unknown error';
		tokenError.message = 'An error occured';
		cb(tokenError);
	}

	console.log('OTP DETAILS: ', otpDetails);

	if (!otpDetails) {
		cb(false, { status: false, message: 'invalid token or token expired' });
		return;
	}

	// verify otp
	const otpValid = verifyOtpExpiry(Date.now(), otpDetails.tokenExpiry);
	if (!otpValid) {
		// invalidate otp in db
		const otpUpdate = await otpCollection.updateOne(
			{ _id: otpDetails._id },
			{ $set: { hasExpired: true } }
		);
		console.log('OTP UPDATE: ', otpUpdate);
		if (
			otpUpdate.lastErrorObject &&
			!otpUpdate.lastErrorObject.updatedExisting
		) {
			cb({ status: false, message: 'an error occured' });
			return;
		}
		cb(false, { status: false, message: 'token expired' });
		return;
	}

	// invalidate otp in db
	const otpUpdate = await otpCollection.updateOne(
		{ _id: otpDetails._id },
		{ $set: { hasExpired: true } }
	);

	// generate access and token
	const accessTokenPayload = { user_id };
	const refreshTokenPayload = { user_id, login_device_detail };
	const access_token = generateJwt(accessTokenPayload, 'access');
	const refresh_token = generateJwt(refreshTokenPayload, 'refresh');

	// generate device token cookie
	const deviceToken = crypto.randomBytes(64).toString('hex');

	// find user and refresh token and update
	let userUpdate;
	let refreshTokenUpdate;
	try {
		userUpdate = await userCollection.updateOne(
			{ user_id: user_id },
			{
				$set: {
					login_device_detail: login_device_detail,
					last_login_ip: ip.address(),
					status: 'active',
				},
				$push: {
					device_tokens: deviceToken,
				},
			},
			{ returnNewDocument: true }
		);
		refreshTokenUpdate = await refreshTokenCollection.findOneAndUpdate(
			{ user_id },
			{ $set: { token: refresh_token } },
			{ upsert: true, returnNewDocument: true }
		);
	} catch (error) {
		console.log('ERROR!!', error);
		cb({ message: 'an error occured' });
		return;
	}

	if (
		!userUpdate ||
		(userUpdate.lastErrorObject && !userUpdate.lastErrorObject.updatedExisting)
	) {
		cb({ message: 'error updating user' }, false);
		return;
	}

	// if (
	// 	refreshTokenUpdate.lastErrorObject &&
	// 	!refreshTokenUpdate.lastErrorObject.updatedExisting
	// ) {
	// 	console.log('ERROR UPDATING REFRESH TOKEN');
	// 	console.log('REFRESH TOKEN UPDATE: ', refreshTokenUpdate);
	// 	cb({ message: 'error updating refresh token' }, false);
	// 	return;
	// }

	// TODO: Encrypt user object.

	const res = {};

	PROFILE.getUserProfile(
		client,
		{ authorization: { user_id } },
		res,
		user_id,
		function (err, profileData) {
			// Successfully Logged in
			// delete userData.password;
			let data = {
				status: true,
				access_token,
				refresh_token,
				deviceToken,
				user_id: profileData.user_id,
				user: profileData.data,
			};
			cb(null, data);
		}
	);
}

/**
 * Get User by User_name
 * @param user_name
 * @returns user_id
 */
module.exports.getUserByUserName = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(Model.collection_name);

	var user_name = req.query.user_name || '-nodata-';
	userCollection.findOne(
		{ user_name: user_name },
		{ projection: { user_id: 1, _id: 0 } },
		function (err, user) {
			if (err) {
				cb(err);
			} else {
				console.log('user: ', user);
				let finalResponse = {};
				finalResponse.status = true;
				finalResponse.data = user;
				cb(null, finalResponse);
			}
		}
	);
};

module.exports.checkUsername = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(Model.collection_name);

	let newUserData = req.body;
	if (!newUserData.user_name) {
		let error = new Error('Username Can not be Empty');
		error.name = 'VALIDATION_ERROR';
		cb(error);
		return;
	} else {
		let unique_user_name = {};
		unique_user_name.user_name = newUserData.user_name;
		unique_user_name.status = 'active';

		userCollection.findOne(unique_user_name, function (err, user) {
			if (err) {
				cb(err);
			} else {
				if (user) {
					let error = new Error('User with this username already exists');
					error.name = 'VALIDATION_ERROR';
					cb(error);
					return;
				} else {
					let finalResponse = {};
					finalResponse.status = true;
					finalResponse.data = 'Avilable';
					cb(null, finalResponse);
				}
			}
		});
	}
};

module.exports.addUser = function (CLIENT, req, res, cb) {
	req.fromReg = 'web';
	UserRegisterFunction(CLIENT, req, res, function (err, response) {
		cb(err, response);
	});
	// let CONNECTION = CLIENT.db(utility.dbName);
	// let userCollection = CONNECTION.collection(Model.collection_name);

	// let newUserData = req.body;
	// if (!newUserData.username) {
	//     let error = new Error("Email / Phone Can not be Empty");
	//     error.name = "VALIDATION_ERROR";
	//     cb(error);
	//     return;
	// }
	// /*** EMAIL/ Mobile***/
	// let loginString = newUserData.username;
	// const isEmail = loginString.includes("@");
	// if (isEmail) {
	//     let emailRe = /\S+@\S+\.\S+/;
	//     if (!emailRe.test(loginString)) {
	//         let error = new Error("Invalid Email Id");
	//         error.name = "VALIDATION_ERROR";
	//         cb(error);
	//         return;
	//     }
	//     newUserData.email = loginString.toLowerCase();
	//     newUserData.contact_number = '';
	//     newUserData.registered_with = 'email';
	// } else {
	//     // Mobile Number
	//     loginString = loginString.replace("+", "");
	//     let phoneRe = /^\s*(?:\+?(\d{1,3}))?[- (]*(\d{3})[- )]*(\d{3})[- ]*(\d{4})(?: *[x/#]{1}(\d+))?\s*$/;
	//     if (!phoneRe.test(loginString)) {
	//         let error = new Error("Invalid Phone Number");
	//         error.name = "VALIDATION_ERROR";
	//         cb(error);
	//         return;
	//     }
	//     newUserData.contact_number = loginString;
	//     newUserData.email = '';
	//     newUserData.registered_with = 'contact_number';
	// }

	// delete newUserData.username;

	// utility.validatePostData(CONNECTION, newUserData, Model, 'insert', 0, function (err, validatedData) {
	//     if (err) {
	//         cb(err);
	//     } else {
	//         // Encrypt Password in bCrypt
	//         var salt = bcrypt.genSaltSync(10);
	//         validatedData.password = bcrypt.hashSync(validatedData.password, salt);
	//         validatedData.email_verified = false;
	//         validatedData.verification_token = cryptoRandomString(64);
	//         validatedData.verification_otp = generateOTP();
	//         validatedData.phone_verified = false;
	//         validatedData.introduced = false;
	//         if (newUserData.firebase_token) { validatedData.firebase_token = newUserData.firebase_token; }
	//         let condition = {}
	//         if (newUserData.email) {
	//             condition.email = newUserData.email;
	//         }
	//         else if (newUserData.contact_number) {
	//             condition.contact_number = newUserData.contact_number;
	//         }

	//         userCollection.findOne(condition, function (err, user) {
	//             if (err) {
	//                 cb(err);
	//             }
	//             else if (user && user.status === 'active') {
	//                 cb('User Already Exists');
	//             }
	//             else {
	//                 condition.status = 'inactive';
	//                 userCollection.deleteOne(condition
	//                     , function (err, inactiveUser) {
	//                         if (err) {
	//                             cb(err);
	//                         }
	//                         userCollection.insertOne(validatedData, function (err, response) {
	//                             if (err) {
	//                                 cb(err);
	//                             } else {
	//                                 // Send Registration Email
	//                                 if (isEmail) {
	//                                     EMAIL_HANDLER.sendRegistrationEmail(validatedData);
	//                                 } else {
	//                                     SMS_HANDLER.sendRegistrationSMS(validatedData);
	//                                 }

	//                                 let finalResponse = {};
	//                                 finalResponse.status = true;
	//                                 finalResponse.registered_with = response.ops[0].registered_with;
	//                                 cb(null, finalResponse);
	//                             }
	//                         });
	//                     });
	//             }
	//         });
	//     }
	// });
};

module.exports.addUserApp = function (CLIENT, req, res, cb) {
	req.fromReg = 'app';
	UserRegisterFunction(CLIENT, req, res, function (err, response) {
		cb(err, response);
	});
};

function UserRegisterFunction(CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(Model.collection_name);

	/* Remove blank space from left and right of string */
	if (req.body.first_name) {
		req.body.first_name = req.body.first_name.trim();
	}
	if (req.body.last_name) {
		req.body.last_name = req.body.last_name.trim();
	}
	if (req.body.username) {
		req.body.username = req.body.username.trim();
	}
	if (req.body.register_device_detail) {
		req.body.register_device_detail = req.body.register_device_detail;
	}

	let newUserData = req.body;
	if (!newUserData.user_name) {
		// let error = new Error("Username Can not be Empty");
		// error.name = "VALIDATION_ERROR";
		// cb(error);
		// return;
		newUserData.user_name = '';
	} else {
		let unique_user_name = {};
		unique_user_name.user_name = newUserData.user_name;
		unique_user_name.status = 'active';

		userCollection.findOne(unique_user_name, function (err, user) {
			if (err) {
				cb(err);
			} else {
				if (user) {
					let error = new Error('User with this username already exists');
					error.name = 'VALIDATION_ERROR';
					cb(error);
					return;
				}
			}
		});
	}
	if (!newUserData.username) {
		let error = new Error('Email / Phone Can not be Empty');
		error.name = 'VALIDATION_ERROR';
		cb(error);
		return;
	}
	/*** EMAIL/ Mobile***/
	let loginString = newUserData.username;
	const isEmail = loginString.includes('@');
	if (isEmail) {
		let emailRe = /\S+@\S+\.\S+/;
		if (!emailRe.test(loginString)) {
			let error = new Error('Invalid Email Id');
			error.name = 'VALIDATION_ERROR';
			cb(error);
			return;
		}
		newUserData.email = loginString.toLowerCase();
		newUserData.contact_number = '';
		newUserData.registered_with = 'email';
	} else {
		// Mobile Number
		loginString = loginString.replace('+', '');
		let phoneRe =
			/^\s*(?:\+?(\d{1,3}))?[- (]*(\d{3})[- )]*(\d{3})[- ]*(\d{4})(?: *[x/#]{1}(\d+))?\s*$/;
		if (!phoneRe.test(loginString)) {
			let error = new Error('Invalid Phone Number');
			error.name = 'VALIDATION_ERROR';
			cb(error);
			return;
		}
		newUserData.contact_number = loginString;
		newUserData.email = '';
		newUserData.registered_with = 'contact_number';
	}

	delete newUserData.username;

	utility.validatePostData(
		CONNECTION,
		newUserData,
		Model,
		'insert',
		0,
		function (err, validatedData) {
			if (err) {
				cb(err);
			} else {
				// Encrypt Password in bCrypt
				var salt = bcrypt.genSaltSync(10);
				validatedData.password = bcrypt.hashSync(validatedData.password, salt);
				validatedData.email_verified = false;
				validatedData.verification_token = cryptoRandomString(64);
				validatedData.verification_otp = generateOTP();
				validatedData.phone_verified = false;
				validatedData.introduced = false;
				if (newUserData.firebase_token) {
					validatedData.firebase_token = newUserData.firebase_token;
				}
				let condition = {};
				if (newUserData.email) {
					condition.email = newUserData.email;
				} else if (newUserData.contact_number) {
					condition.contact_number = newUserData.contact_number;
				}

				userCollection.findOne(condition, function (err, user) {
					if (err) {
						cb(err);
					} else if (user && user.status === 'active') {
						cb('User Already Exists');
					} else {
						condition.status = 'inactive';
						userCollection.deleteOne(condition, function (err, inactiveUser) {
							if (err) {
								cb(err);
							}
							userCollection.insertOne(validatedData, function (err, response) {
								if (err) {
									cb(err);
								} else {
									// Send Registration Email
									if (isEmail) {
										if (req.fromReg == 'app') {
											EMAIL_HANDLER.sendRegistrationEmailOTP(validatedData);
										} else {
											EMAIL_HANDLER.sendRegistrationEmail(validatedData);
										}
									} else {
										SMS_HANDLER.sendRegistrationSMS(validatedData);
									}

									let finalResponse = {};
									finalResponse.status = true;
									finalResponse.registered_with =
										validatedData?.registered_with;
									finalResponse._id = validatedData?._id;

									cb(null, finalResponse);
								}
							});
						});
					}
				});
			}
		}
	);
}

module.exports.verifyEmailOTP = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(Model.collection_name);
	const verification_otp = req.body.otp.trim();
	const email = req.body.username.trim().toLowerCase();
	let accessTokenCollection = CONNECTION.collection(
		SITE_CONFIG.accessTokenCollection
	);

	userCollection.findOneAndUpdate(
		{
			verification_otp: verification_otp,
			email: email,
			email_verified: false,
		},
		{
			$set: {
				verification_otp: null,
				status: 'active',
				email_verified: true,
			},
		},
		{ returnOriginal: false },
		function (err, updatedData) {
			if (updatedData.value) {
				// Login
				let userData = { ...updatedData.value };
				let accessTokenData = {
					token: cryptoRandomString(64),
					user_id: userData.user_id,
					login_time: new Date(),
					login_ip: ip.address(),
					login_type: 'local',
				};
				accessTokenCollection.insertOne(
					accessTokenData,
					function (err, response) {
						if (err) {
							console.log(err);
							let error = new Error('Some error occurred while login');
							cb(error);
						} else {
							userCollection.findOneAndUpdate(
								{ user_id: userData.user_id },
								{ $set: { last_login_ip: ip.address() } },
								function (err, resp) {
									req.authorization = accessTokenData;
									PROFILE.getUserProfile(
										CLIENT,
										req,
										res,
										userData.user_id,
										function (err, profileData) {
											// Successfully Logged in
											delete accessTokenData._id;
											delete userData.password;
											accessTokenData.user = profileData.data;
											cb(null, accessTokenData);
										}
									);
								}
							);
						}
					}
				);
			} else {
				cb('Invalid Verification Token');
			}
		}
	);
};

module.exports.verifyEmail = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(Model.collection_name);
	const verification_token = req.body.verification_token;
	let accessTokenCollection = CONNECTION.collection(
		SITE_CONFIG.accessTokenCollection
	);
	userCollection.findOneAndUpdate(
		{
			verification_token: verification_token,
			email_verified: false,
		},
		{
			$set: {
				verification_token: null,
				status: 'active',
				email_verified: true,
			},
		},
		{ returnOriginal: false },
		function (err, updatedData) {
			if (updatedData.value) {
				// Login
				let userData = { ...updatedData.value };
				let accessTokenData = {
					token: cryptoRandomString(64),
					user_id: userData.user_id,
					login_time: new Date(),
					login_ip: ip.address(),
					login_type: 'local',
				};
				accessTokenCollection.insertOne(
					accessTokenData,
					function (err, response) {
						if (err) {
							console.log(err);
							let error = new Error('Some error occurred while login');
							cb(error);
						} else {
							userCollection.findOneAndUpdate(
								{ user_id: userData.user_id },
								{ $set: { last_login_ip: ip.address() } },
								function (err, resp) {
									req.authorization = accessTokenData;
									PROFILE.getUserProfile(
										CLIENT,
										req,
										res,
										userData.user_id,
										function (err, profileData) {
											// Successfully Logged in
											delete accessTokenData._id;
											delete userData.password;
											accessTokenData.user = profileData.data;
											cb(null, accessTokenData);
										}
									);
								}
							);
						}
					}
				);
			} else {
				cb('Invalid Verification Token');
			}
		}
	);
};

module.exports.resendOTP = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(Model.collection_name);
	const username = req.body.username.trim();
	const type = req.body.type.trim(); // phone/emailotp
	var find = {};
	if (type == 'phone') {
		find = {
			contact_number: username,
			phone_verified: false,
		};
	} else {
		find = {
			email: username,
			email_verified: false,
		};
	}

	var newOtp = generateOTP();

	userCollection.findOneAndUpdate(
		find,
		{
			$set: {
				verification_otp: newOtp,
				OtpDateTime: new Date(Date.now()),
			},
		},
		{ returnOriginal: false },
		function (err, updatedData) {
			if (updatedData.value) {
				/* generate new otp and update to user data */

				if (type == 'emailotp') {
					EMAIL_HANDLER.sendRegistrationEmailOTP(updatedData.value);
				} else if (type == 'phone') {
					SMS_HANDLER.sendRegistrationSMS(updatedData.value);
				}
				let finalResponse = {};
				finalResponse.status = true;
				finalResponse.message = 'New otp sents';
				cb(null, finalResponse);
			} else {
				cb('Invalid information.');
			}
		}
	);
};

module.exports.verifyPhone = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(Model.collection_name);
	const verification_otp = req.body.otp;
	const contact_number = req.body.username;
	let accessTokenCollection = CONNECTION.collection(
		SITE_CONFIG.accessTokenCollection
	);
	userCollection.findOneAndUpdate(
		{
			contact_number: contact_number,
			verification_otp: verification_otp,
			phone_verified: false,
		},
		{
			$set: {
				verification_otp: null,
				status: 'active',
				phone_verified: true,
			},
		},
		{ returnOriginal: false },
		function (err, updatedData) {
			if (updatedData.value) {
				// Login
				let userData = { ...updatedData.value };
				let accessTokenData = {
					token: cryptoRandomString(64),
					user_id: userData.user_id,
					login_time: new Date(),
					login_ip: ip.address(),
					login_type: 'local',
				};
				accessTokenCollection.insertOne(
					accessTokenData,
					function (err, response) {
						if (err) {
							console.log(err);
							let error = new Error('Some error occurred while login');
							cb(error);
						} else {
							userCollection.findOneAndUpdate(
								{ user_id: userData.user_id },
								{ $set: { last_login_ip: ip.address() } },
								function (err, resp) {
									req.authorization = accessTokenData;
									PROFILE.getUserProfile(
										CLIENT,
										req,
										res,
										userData.user_id,
										function (err, profileData) {
											// Successfully Logged in
											delete accessTokenData._id;
											delete userData.password;
											accessTokenData.user = profileData.data;
											cb(null, accessTokenData);
										}
									);
								}
							);
						}
					}
				);
			} else {
				cb('Invalid Verification OTP');
			}
		}
	);
};

module.exports.loginV2 = async function (CLIENT, req, res, next, cb) {
	console.log('LOGIN V2 MODEL');
	// validate login details
	try {
		await loginValidator.validateAsync(req.body);
	} catch (error) {
		cb(error);
		return;
	}
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(Model.collection_name);
	// let accessTokenCollection = CONNECTION.collection(SITE_CONFIG.accessTokenCollection);
	const RefreshToken = CONNECTION.collection(
		SITE_CONFIG.refreshTokenCollection
	);
	let {
		username,
		password,
		firebase_token,
		email,
		facebook_id,
		google_id,
		login_device_detail,
	} = req.body;
	let validationError = {};
	if (req.body.type !== 'facebook' && req.body.type !== 'google') {
		if (!username) {
			validationError['username'] = 'is required';
		}
		username = username.toLowerCase();
		if (!password) {
			validationError['password'] = 'is required';
		}
	} else {
		username = '';
	}

	if (!login_device_detail) {
		validationError['login_device_detail'] = 'is required';
	}

	if (req.body.type === 'google' && !email) {
		validationError['email'] = 'is required';
	}

	if (Object.keys(validationError).length > 0) {
		let vErr = new Error();
		vErr.name = 'VALIDATION_ERROR';
		vErr.message = validationError;
		cb(vErr);
	} else {
		let query;
		if (req.body.type === 'facebook') {
			query = {
				$or: [{ facebook_id: facebook_id }],
				// status: 'active',
			};
		} else if (req.body.type === 'google') {
			query = {
				$or: [{ google_id: google_id, email }],
				// status: 'active',
			};
		} else {
			query = {
				$or: [{ email: username }, { contact_number: username }],
				// status: 'active'
			};
		}
		// Now check for login
		userCollection.findOne(query, async function (err, userData) {
			if (err) {
				cb(err);
			} else {
				if (userData) {
					// console.log(userData)

					if (req.body.type === 'facebook' || req.body.type === 'google') {
						// let accessTokenData = {
						// 	token: cryptoRandomString(64),
						// 	user_id: userData.user_id,
						// 	login_time: new Date(),
						// 	login_ip: ip.address()
						// };

						/* DISABLED 2FA CHECKING */

						// const cookieStatus = await verify2facookie(req, res, userData);

						// if (!cookieStatus.status) {
						// 	return cb(
						// 		{
						// 			statusCode: 422,
						// 			...cookieStatus,
						// 		},
						// 		null
						// 	);
						// } else {
						// 	if (cookieStatus.message === 'redirect to 2fa') {
						// 		return cb(null, { statusCode: 422, ...cookieStatus });
						// 	}
						// }

						if (userData.status === 'blocked') {
							return res
								.status(403)
								.json({
									status: false,
									message:
										'Your account has been blocked please contact an admin',
								});
						}

						// set jwt token payload data
						const accessTokenPayload = { user_id: userData.user_id };
						const refreshTokenPayload = {
							user_id: userData.user_id,
							login_device_detail,
						};

						// generate access and refresh token
						const access_token = generateJwt(accessTokenPayload, 'access');
						let refresh_token;

						// find refresh token for user
						let refresh_token_in_db = await RefreshToken.findOne({
							user_id: userData.user_id,
							status: 'active',
						});

						// set refresh token from db
						refresh_token = refresh_token_in_db
							? refresh_token_in_db.token
							: null;

						if (!refresh_token_in_db) {
							//token does not exist
							// generate refresh token
							const new_refresh_token = generateJwt(
								refreshTokenPayload,
								'refresh'
							);
							const refreshTokenData = {
								user_id: userData.user_id,
								token: new_refresh_token,
								status: 'active',
							};
							// store token in db
							const insertedTokenData = await RefreshToken.insertOne(
								refreshTokenData
							);
							console.log('inserted token data:', insertedTokenData.insertedId);
							if (!insertedTokenData.insertedId) {
								cb(new Error('error insterting refresh token'), false);
								return;
							}

							// change refresh token value to new token
							refresh_token = new_refresh_token;
						}

						// create user update data and update data
						const updateData = {
							last_login_ip: ip.address(),
							login_device_detail,
							status: 'active',
						};
						if (firebase_token) {
							updateData.firebase_token = firebase_token;
						}
						console.log(
							`USER IP: ${
								userData.last_login_ip
							} === LOGIN IP: ${ip.address()} : ${
								userData.last_login_ip === ip.address()
							}`
						);
						const updatedUser = await userCollection.findOneAndUpdate(
							{
								user_id: userData.user_id,
								last_login_ip: userData.last_login_ip,
							},
							{ $set: updateData },
							{ returnNewDocument: true }
						);
						console.log('UPDATED USER:', updatedUser);
						// if (
						// 	updatedUser.lastErrorObject &&
						// 	!updatedUser.lastErrorObject.updatedExisting
						// ) {
						// 	// TODO: trigger two factor authentication
						// 	cb(null, {
						// 		status: false,
						// 		user_id: userData.user_id,
						// 		message: 'redirect to 2fa',
						// 	});
						// 	return;
						// }
						req.authorization = { user_id: userData.user_id };
						PROFILE.getUserProfile(
							CLIENT,
							req,
							res,
							userData.user_id,
							function (err, profileData) {
								// Successfully Logged in
								delete userData.password;
								let data = {
									status: true,
									token: access_token,
									refresh_token,
									user: profileData.data,
								};
								res.cookie('refresh_token', refresh_token, {
									httpOnly: true,
									path: '/',
								});
								cb(null, data);
							}
						);
					} else {
						// User Found
						if (userData.status === 'blocked') {
							cb({
								status: false,
								user_id: userData.user_id,
								message: 'redirect to 2fa',
							});
							return;
						}
						let passwordFromDb = userData.password;
						if (bcrypt.compareSync(password, passwordFromDb)) {
							// Matched!!!

							/* DISABLED 2FA CHECKING */

							// const cookieStatus = await verify2facookie(req, res, userData);

							// if (!cookieStatus.status) {
							// 	return cb({ ...cookieStatus, statusCode: 422 });
							// }

							// set jwt token payload data
							const accessTokenPayload = { user_id: userData.user_id };
							const refreshTokenPayload = {
								user_id: userData.user_id,
								login_device_detail,
							};

							// generate access and refresh token
							const access_token = generateJwt(accessTokenPayload, 'access');
							let refresh_token;

							// find refresh token for user
							let refresh_token_in_db = await await RefreshToken.findOne({
								user_id: userData.user_id,
								status: 'active',
							});

							// set refresh token from db
							refresh_token = refresh_token_in_db
								? refresh_token_in_db.token
								: null;

							if (!refresh_token_in_db) {
								//token does not exist
								// generate refresh token
								const new_refresh_token = generateJwt(
									refreshTokenPayload,
									'refresh'
								);
								const refreshTokenData = {
									user_id: userData.user_id,
									token: new_refresh_token,
									status: 'active',
								};
								// store token in db
								const insertedTokenData = await RefreshToken.insertOne(
									refreshTokenData
								);
								console.log(
									'inserted token data:',
									insertedTokenData.insertedId
								);
								if (!insertedTokenData.insertedId) {
									cb(new Error('error insterting refresh token'), false);
									return;
								}

								// change refresh token value to new token
								refresh_token = new_refresh_token;
							}

							// create user update data and update data
							const updateData = {
								last_login_ip: ip.address(),
								login_device_detail,
							};
							if (firebase_token) {
								updateData.firebase_token = firebase_token;
							}
							if (login_device_detail) {
								updateData.login_device_detail = login_device_detail;
							}
							const updatedUser = await userCollection.findOneAndUpdate(
								{
									user_id: userData.user_id,
									// last_login_ip: updateData.last_login_ip,
									// login_device_detail
								},
								{ $set: updateData },
								{ returnNewDocument: true }
							);
							console.log('UPDATED USER:', updatedUser);
							if (
								updatedUser.lastErrorObject &&
								!updatedUser.lastErrorObject.updatedExisting
							) {
								return cb({
									status: false,
									message: 'An error occured',
								});

								// // generate 2fa secret
								// const { secret, twoFaObj } = generateTwoFactorAuthSecret();
								// // update user with two factor object

								// const new_user_update = await userCollection.findOneAndUpdate(
								// 	{ user_id: userData.user_id },
								// 	{ $set: { two_fa_secret: twoFaObj } }
								// );

								// if (
								// 	new_user_update.lastErrorObject &&
								// 	!new_user_update.lastErrorObject.updatedExisting
								// ) {
								// 	return cb(false, {
								// 		status: false,
								// 		message: 'UNABLE TO UPDATE USER'
								// 	});
								// }

								// // send 2fa details to client
								// return cb(false, { status: '2fa', issuer: 'Afro2fa', secret });
							}
							req.authorization = { user_id: userData.user_id };
							PROFILE.getUserProfile(
								CLIENT,
								req,
								res,
								userData.user_id,
								function (err, profileData) {
									// Successfully Logged in
									delete userData.password;
									let data = {
										status: true,
										token: access_token,
										refresh_token,
										user: profileData.data,
									};
									res.cookie('refresh_token', refresh_token, {
										httpOnly: true,
										path: '/',
									});
									cb(null, data);
								}
							);
						} else {
							console.log('PASSWORD INCORRECT');
							let vErr = new Error();
							vErr.name = 'VALIDATION_ERROR';
							vErr.message = { password: 'Invalid Email or Password' };
							cb(vErr);
						}
					}
				} else {
					if (req.body.type === 'facebook' || req.body.type === 'google') {
						// register new user
						let newUserData = {};
						newUserData.email = req.body.email;
						// newUserData.username = username;
						if (req.body.type === 'facebook') {
							newUserData.facebook_id = facebook_id;
						} else {
							newUserData.google_id = google_id;
						}
						newUserData.first_name = req.body.first_name;
						newUserData.last_name = req.body.last_name;
						utility.validatePostData(
							CONNECTION,
							newUserData,
							Model,
							'insert',
							0,
							function (err, validatedData) {
								if (err) {
									cb(err);
								} else {
									// let validatedData = {};
									const device_token = crypto.randomBytes(64).toString('hex');
									validatedData.email = req.body.email;
									// validatedData.username = username;
									if (req.body.type === 'facebook') {
										validatedData.facebook_id = facebook_id;
									} else {
										validatedData.google_id = google_id;
									}
									if (req.body.login_device_detail) {
										validatedData.login_device_detail =
											req.body.login_device_detail;
									}
									validatedData.first_name = req.body.first_name;
									validatedData.last_name = req.body.last_name;
									validatedData.email_verified = false;
									validatedData.verification_token = cryptoRandomString(64);
									validatedData.phone_verified = false;
									validatedData.introduced = false;
									validatedData.registered_with = req.body.type;
									validatedData.device_tokens = [device_token];
									validatedData.status = 'active';
									if (firebase_token) {
										validatedData.firebase_token = firebase_token;
									}
									userCollection.insertOne(
										validatedData,
										function (err, userData) {
											if (err) {
												let error = new Error(
													'Some error occurred while login'
												);
												next(error);
											} else {
												const accessTokenPayload = {
													user_id: userData.user_id,
												};
												const refreshTokenPayload = {
													user_id: userData.user_id,
													login_device_detail,
												};

												// generate access and refresh token
												const access_token = generateJwt(
													accessTokenPayload,
													'access'
												);
												const refresh_token = generateJwt(
													refreshTokenPayload,
													'refresh'
												);

												const data = {
													status: true,
													token: access_token,
													refresh_token,
													user: validatedData,
													login_ip: ip.address(),
													login_time: new Date(),
												};
												res
													.cookie('refresh_token', refresh_token, {
														httpOnly: true,
														path: '/',
													})
													.cookie(`dvt_${userData.user_id}`, device_token, {
														httpOnly: true,
														path: '/',
														domain:
															process.env.NODE_ENV === 'production'
																? 'afrocamgist.com'
																: undefined,
														maxAge: 5184000000000,
													});
												cb(null, data);
											}
										}
									);
								}
							}
						);
					} else {
						let vErr = new Error();
						vErr.name = 'VALIDATION_ERROR';
						vErr.message = { username: 'Invalid Username' };
						cb(vErr);
					}
				}
			}
		});
	}
};

const verify2facookie = async (req, res, userData, cb) => {
	// grab token from cookie
	const { cookies } = req;
	if (!cookies) {
		return { status: false, error: 'unauthorized' };
	}

	const dvt = cookies[`dvt_${userData.user_id}`];
	if (!dvt || !userData.device_tokens) {
		return {
			status: false,
			message: 'redirect to 2fa',
			user_id: userData.user_id,
		};
	}

	console.log(dvt);
	console.log(userData.device_tokens);

	const dvtExists = userData.device_tokens.find((token) => token === dvt);

	console.log(dvtExists);

	if (!dvtExists) {
		return {
			status: false,
			message: 'redirect to 2fa',
			user_id: userData.user_id,
		};
	}

	return { status: true, message: 'device token exists' };
};

module.exports.twoFactorAuthAuthenticator = async function (
	client,
	req,
	res,
	cb
) {
	const { mode } = req.params;
	const { user_id, login_device_detail } = req.body;

	if (!login_device_detail || !user_id) {
		cb({ message: 'missing login device details or user id' });
		return;
	}

	if (typeof user_id !== 'number') {
		cb({ message: 'invalid user id' });
		return;
	}

	try {
		await device_validator.validateAsync(login_device_detail);
	} catch (error) {
		const vErr = new Error();
		vErr.name = error.name;
		vErr.message = error.message;
		cb(vErr);
		return;
	}

	if (mode === 'authenticator') {
		verifyAuthenticatorMode(req, client, (err, response) => {
			if (err) {
				cb(err);
				return;
			}
			cb(null, response);
		});
	}

	if (mode === 'email' || mode === 'phone') {
		verifyEmailMode(
			req,
			user_id,
			login_device_detail,
			client,
			(err, response) => {
				if (err) {
					cb(err);
					return;
				}
				cb(null, response);
			}
		);
	}
};

module.exports.set2FAAuthMode = async function (client, req, res, cb) {
	// get mode from request
	const { mode } = req.params;
	const { id, username, login_device_detail } = req.body;

	try {
		await device_validator.validateAsync(login_device_detail);
	} catch (error) {
		const vErr = new Error();
		vErr.name = error.name;
		vErr.message = error.message;
		return cb(vErr, false);
	}

	const db = client.db(utility.dbName);
	const TwoFactorAuthCollection = db.collection(SITE_CONFIG.TwoFaCollection);
	const userCollection = db.collection(Model.collection_name);
	const otpCollection = db.collection('otp');

	if (!mode || !login_device_detail) {
		cb({ status: false, message: 'No mode or login device detail set' }, false);
		return;
	}

	switch (mode) {
		case 'authenticator':
			setAuthenticatorUp(TwoFactorAuthCollection, id, (err, response) => {
				if (err) {
					cb(err);
					return;
				}
				cb(false, response);
			});
			break;

		case 'email':
			setEmail2fa(
				req,
				userCollection,
				id,
				username,
				otpCollection,
				(err, response) => {
					if (err) {
						cb(err);
						return;
					}
					cb(false, response);
				}
			);
			break;

		case 'phone':
			setPhone2fa(
				req,
				userCollection,
				id,
				username,
				otpCollection,
				(err, response) => {
					if (err) {
						cb(err, false);
						return;
					}
					cb(false, response);
				}
			);
			break;

		default:
			cb({ status: 'false', message: 'invalid 2fa mode' });
	}
};

/**
 *
 * @param {*} client
 * @param {{body: {refresh_token: string, login_device_detail: object}}} req
 * @param {*} res
 * @param {*} cb
 * @returns
 */

module.exports.refreshToken = async (client, req, res, cb) => {
	// validate requestBody
	try {
		await refreshTokenRequestValidator.validateAsync(req.body);
	} catch (error) {
		cb(error, false);
		return;
	}
	const { refresh_token, login_device_detail } = req.body;
	const db = client.db(utility.dbName);
	const RefreshToken = db.collection(SITE_CONFIG.refreshTokenCollection);

	console.log('REFRESH TOKEN SENT: ', refresh_token);

	// find refresh token
	const refreshTokenInDb = await RefreshToken.findOne({
		token: refresh_token.trim(),
	});
	console.log('================================================');
	console.log('REFRESH TOKEN IN DB:', refreshTokenInDb);
	console.log('================================================');
	if (!refreshTokenInDb) {
		return res.status(401).json({
			status: false,
			message: 'invalid token',
		});
	}

	// verify token hasn't expired
	let tokenHasExpired = false;
	let payload;
	try {
		payload = jwt.verify(refreshTokenInDb.token, process.env.JWT_SECRET);
		tokenHasExpired = payload.user_id ? false : true;
	} catch (error) {
		if (error.name === 'TokenExpiredError') {
			tokenHasExpired = true;
		}
	}

	if (!tokenHasExpired) {
		// generate new refresh token
		const access_token = generateJwt({ user_id: payload.user_id }, 'access');
		return cb(false, { status: true, access_token, expiresIn: 900000 });
	}

	// generate new refresh token and update previous
	const new_refresh_token = generateJwt(
		{ user_id: refreshTokenInDb.user_id, login_device_detail },
		'refresh'
	);
	const access_token = generateJwt(
		{ user_id: refreshTokenInDb.user_id },
		'access'
	);

	// update refresh token in db
	const updatedToken = await RefreshToken.updateOne(
		{ _id: refreshTokenInDb._id },
		{ $set: { token: new_refresh_token } }
	);
	if (
		updatedToken.lastErrorObject &&
		!updatedToken.lastErrorObject.updatedExisting
	) {
		console.log(
			'================================================================='
		);
		console.log('ERROR UPDATING REFRESH TOKEN', updatedToken.lastErrorObject);
		console.log(
			'================================================================='
		);
		return cb({ message: 'error updating refresh token' }, false);
	}

	return cb(false, {
		status: true,
		access_token,
		expiresIn: 900000,
		refresh_token: new_refresh_token,
	});
};

module.exports.blockAccount = async (client, req, res, cb) => {
	const { username } = req.body;
	if (!username || typeof username !== 'string') {
		const error = new Error();
		(error.name = 'BAD REQUEST'),
			(error.message = 'missing or invalid username');
		return cb(error);
	}

	const db = client.db(utility.dbName);
	const User = db.collection(Model.collection_name);

	// find user and update
	const query = {
		$or: [{ email: username }, { contact_number: username }],
	};

	const update = {
		$set: { status: 'blocked' },
	};

	const userUpdate = await User.findOneAndUpdate(query, update);

	if (!userUpdate) {
		return cb({ message: 'no user found' });
	}

	if (
		userUpdate.lastErrorObject &&
		!userUpdate.lastErrorObject.updatedExisting
	) {
		return cb({ message: 'could not block user' });
	}

	return false, { status: true, message: 'account blocked' };
};

module.exports.logout = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	const userCollection = CONNECTION.collection(Model.collection_name);
	console.log('============================');
	console.log('LOGOUT REQUEST!!!');
	console.log('============================');
	let domain = req.get('host');
	if (domain.includes('localhost')) {
		domain = domain.split(':')[0].trim();
	}

	// update user firebase token
	const userUpdate = userCollection.findOneAndUpdate(
		{ user_id: req.authorization.user_id },
		{ $set: { firebase_token: '' } }
	);

	res.clearCookie('refresh_token', '', { domain, path: '/' });
	res.clearCookie('_csrf', '', { domain, path: '/' });
	res.clearCookie('A_SHH', '', { domain, path: '/' });

	return res.status(200).json({
		status: true,
	});
};

/**
 * AUTHENTICATION CHECK
 * @param CLIENT
 * @param req
 * @param res
 * @param cb
 */

module.exports.authentication = function (CLIENT, req, res, cb) {
	let currentToken = req.headers.authorization.split(' ')[1];
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(Model.collection_name);
	let accessTokenCollection = CONNECTION.collection(
		SITE_CONFIG.accessTokenCollection
	);

	accessTokenCollection.findOne(
		{ token: currentToken },
		function (err, tokenData) {
			if (err) {
				console.log(err);
				let error = new Error('Connectivity Error');
				cb(error);
			} else {
				if (tokenData) {
					delete tokenData._id;
					req.authorization = tokenData;
					userCollection.findOneAndUpdate(
						{ user_id: tokenData.user_id },
						{ $set: { last_active: new Date() } },
						function (err, doc) {
							cb(null, doc);
						}
					);
				} else {
					let error = new Error();
					error.name = 'UNAUTHORISED_ERROR';
					cb(error);
				}
			}
		}
	);
};

module.exports.resetPasswordRequest = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(Model.collection_name);
	let username = req.body.username;

	let validationError = {};
	if (!username) {
		validationError['username'] = 'is required';
	}

	if (Object.keys(validationError).length > 0) {
		let vErr = new Error();
		vErr.name = 'VALIDATION_ERROR';
		vErr.message = validationError;
		cb(vErr);
	} else {
		const otp = generateOTP();
		let expiry = new Date();
		expiry.setHours(expiry.getHours() + 1);
		userCollection.findOneAndUpdate(
			{
				$and: [
					{
						$or: [{ email: username }, { contact_number: username }],
					},
					{ status: 'active' },
				],
			},
			{
				$set: {
					password_reset_otp: otp,
					password_reset_expiry: expiry,
				},
			},
			{ returnOriginal: false },
			function (err, foundUser) {
				if (foundUser.value) {
					EMAIL_HANDLER.sendPasswordResetEmail(foundUser.value);
					SMS_HANDLER.sendPasswordResetSMS(foundUser.value);
					cb(null, { status: true });
				} else {
					let error = new Error('Invalid User');
					error.name = 'VALIDATION_ERROR';
					cb(error);
				}
			}
		);
	}
};

module.exports.verifyPasswordRequest = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(Model.collection_name);
	let username = req.body.username.trim().toLowerCase();
	let otp = req.body.otp.trim();
	let password = req.body.password;
	let validationError = {};
	console.log('===');
	console.log(req.body);
	console.log('===');
	if (!username) {
		validationError['username'] = 'is required';
	}
	if (!otp) {
		validationError['otp'] = 'is required';
	}

	if (!password) {
		validationError['password'] = 'is required';
	}

	if (Object.keys(validationError).length > 0) {
		let vErr = new Error();
		vErr.name = 'VALIDATION_ERROR';
		vErr.message = validationError;
		cb(vErr);
	} else {
		let now = new Date();
		const salt = bcrypt.genSaltSync(10);
		password = bcrypt.hashSync(password, salt);
		userCollection.findOneAndUpdate(
			{
				$and: [
					{ password_reset_otp: otp },
					{ password_reset_expiry: { $gt: now } },
					{
						$or: [
							{ email: username },
							{ contact_number: username },
							// { contact_number: new RegExp(`\^\\d\\d\\d\?${username}$`) }
						],
					},
				],
			},
			{
				$set: {
					password_reset_otp: null,
					password_reset_expiry: null,
					password: password,
				},
			},
			{ returnOriginal: false },
			function (err, foundUser) {
				if (foundUser.value) {
					EMAIL_HANDLER.sendPasswordResetConfirmEmail(foundUser.value);
					cb(null, { status: true, message: 'Password Changed Successfully' });
				} else {
					let error = new Error('Invalid OTP');
					error.name = 'VALIDATION_ERROR';
					cb(error);
				}
			}
		);
	}
};

module.exports.reportUserByUserId = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(Model.collection_name);
	let user_id = Number(req.params.user_id);
	userCollection.findOne({ user_id: user_id }, (err, userDetails) => {
		if (!userDetails) {
			let error = new Error('Invalid User');
			cb(error);
		} else {
			const reportCollection = CONNECTION.collection('report');
			let reportData = {
				report_for: 'user',
				user_id: user_id,
				reported_by: req.authorization.user_id,
				report_time: new Date(),
				report_reason: req.body['report_reason'],
				report_status: 'pending',
			};
			reportCollection.insertOne(reportData, (err, inserted) => {
				cb(err, { status: true, data: 'Report Successful!' });
			});
		}
	});
};

module.exports.inActiveMyAccount = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(Model.collection_name);
	let user_id = req.authorization.user_id;
	userCollection.findOneAndUpdate(
		{
			$and: [{ user_id: user_id }, { status: 'active' }],
		},
		{
			$set: {
				status: 'inactive',
				verification_otp: null,
				verification_token: null,
			},
		},
		function (err, foundUser) {
			if (foundUser.value) {
				cb(null, {
					status: true,
					message: 'Account status updated successfully!!!',
				});
			} else {
				let error = new Error('Invalid User');
				error.name = 'VALIDATION_ERROR';
				cb(error);
			}
		}
	);
};

// Function to generate OTP
const generateOTP = function () {
	var digits = '0123456789';
	let OTP = '';
	for (let i = 0; i < 4; i++) {
		OTP += digits[Math.floor(Math.random() * 10)];
	}
	return OTP;
};

/* Unsubscribe */
module.exports.unsubscribe = function (CLIENT, req, res, cb) {
	if (!req.body || !req.body.user_id) {
		let vErr = new Error();
		vErr.name = 'VALIDATION_ERROR';
		vErr.message = 'Please enter all required fields.';
		cb(vErr);
	} else {
		let CONNECTION = CLIENT.db(utility.dbName);
		let userCollection = CONNECTION.collection(Model.collection_name);

		var updateData = { isUnscribed: 1 };
		userCollection.findOneAndUpdate(
			{ user_id: Number(req.body.user_id) },
			{ $set: updateData },
			function (err, resp) {
				cb(null, { result: true });
			}
		);
	}
};

/** Open account */
module.exports.createAccountId = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(Model.collection_name);

	/* Remove blank space from left and right of string */
	if (req.body.first_name) {
		req.body.first_name = req.body.first_name.trim();
	} else {
		req.body.first_name = 'autoTestHiren';
	}
	if (req.body.last_name) {
		req.body.last_name = req.body.last_name.trim();
	} else {
		req.body.last_name = 'autoTestHiren';
	}

	if (req.body.register_device_detail) {
		req.body.register_device_detail = req.body.register_device_detail;
	}

	let newUserData = req.body;
	newUserData.user_name_open = newUserData.user_name;
	newUserData.user_name = '';
	if (!newUserData.user_name_open) {
		let error = new Error('Username Can not be Empty');
		error.name = 'VALIDATION_ERROR';
		cb(error);
		return;
		// newUserData.user_name = "";
	} else {
		let unique_user_name = {
			user_name_open: newUserData.user_name_open,
			$or: [
				{
					$and: [{ status: 'inactive' }, { registerFrom: 'name only' }],
				},
				{
					status: 'active',
				},
			],
		};
		// unique_user_name.user_name = newUserData.user_name;
		// unique_user_name.status = 'active';

		userCollection.findOne(unique_user_name, function (err, user) {
			if (err) {
				cb(err);
			} else {
				if (user) {
					let error = new Error('User with this username already exists');
					error.name = 'VALIDATION_ERROR';
					cb(error);
					return;
				}
			}
		});
	}

	newUserData.email = '';
	newUserData.contact_number = '';
	newUserData.registered_with = '';
	newUserData.registerFrom = 'name only';
	newUserData.password = 'Hello@123';

	utility.validatePostData(
		CONNECTION,
		newUserData,
		Model,
		'insert',
		0,
		function (err, validatedData) {
			if (err) {
				cb(err);
			} else {
				// Encrypt Password in bCrypt
				var salt = bcrypt.genSaltSync(10);
				validatedData.password = bcrypt.hashSync(validatedData.password, salt);
				validatedData.email_verified = false;
				validatedData.verification_token = '';
				validatedData.verification_otp = '';
				validatedData.phone_verified = false;
				validatedData.introduced = false;
				validatedData.status = 'inactive';

				/* */
				if (validatedData.first_name == 'autoTestHiren') {
					validatedData.first_name = '';
				}
				if (validatedData.last_name == 'autoTestHiren') {
					validatedData.last_name = '';
				}
				/* */

				userCollection.insertOne(validatedData, function (err, response) {
					if (err) {
						cb(err);
					} else {
						// Send Registration Email

						var userRes = validatedData;

						delete userRes.password;
						delete userRes.registered_with;
						delete userRes._id;
						userRes.user_name = userRes.user_name_open;

						let finalResponse = {};
						finalResponse.status = true;
						finalResponse.user = userRes;
						cb(null, finalResponse);
					}
				});
			}
		}
	);
};

module.exports.registerAccountId = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(Model.collection_name);

	/* Remove blank space from left and right of string */
	if (req.body.user_id) {
		req.body.user_id = Number(req.body.user_id);
	}
	if (req.body.first_name) {
		req.body.first_name = req.body.first_name.trim();
	}
	if (req.body.last_name) {
		req.body.last_name = req.body.last_name.trim();
	}
	if (req.body.username) {
		req.body.username = req.body.username.trim();
	}
	if (req.body.register_device_detail) {
		req.body.register_device_detail = req.body.register_device_detail;
	}

	var regFrom = 'web';
	if (req.body.reg_from) {
		regFrom = req.body.reg_from.toLowerCase();
	}

	let newUserData = req.body;

	if (!req.body.user_id || req.body.user_id <= 0) {
		let error = new Error('UserId Can not be Empty');
		error.name = 'VALIDATION_ERROR';
		cb(error);
		return;
	}
	let currentUserId = Number(req.body.user_id);

	if (!newUserData.user_name) {
		// let error = new Error("Username Can not be Empty");
		// error.name = "VALIDATION_ERROR";
		// cb(error);
		// return;
		newUserData.user_name = '';
	} else {
		let unique_user_name = {};
		unique_user_name.user_name = newUserData.user_name;
		unique_user_name.status = 'active';

		userCollection.findOne(unique_user_name, function (err, user) {
			if (err) {
				cb(err);
			} else {
				if (user) {
					let error = new Error('User with this username already exists');
					error.name = 'VALIDATION_ERROR';
					cb(error);
					return;
				}
			}
		});
	}

	if (!newUserData.username) {
		let error = new Error('Email / Phone Can not be Empty');
		error.name = 'VALIDATION_ERROR';
		cb(error);
		return;
	}
	/*** EMAIL/ Mobile***/
	let loginString = newUserData.username;
	const isEmail = loginString.includes('@');
	if (isEmail) {
		let emailRe = /\S+@\S+\.\S+/;
		if (!emailRe.test(loginString)) {
			let error = new Error('Invalid Email Id');
			error.name = 'VALIDATION_ERROR';
			cb(error);
			return;
		}
		newUserData.email = loginString.toLowerCase();
		newUserData.contact_number = '';
		newUserData.registered_with = 'email';
	} else {
		// Mobile Number
		loginString = loginString.replace('+', '');
		let phoneRe =
			/^\s*(?:\+?(\d{1,3}))?[- (]*(\d{3})[- )]*(\d{3})[- ]*(\d{4})(?: *[x/#]{1}(\d+))?\s*$/;
		if (!phoneRe.test(loginString)) {
			let error = new Error('Invalid Phone Number');
			error.name = 'VALIDATION_ERROR';
			cb(error);
			return;
		}
		newUserData.contact_number = loginString;
		newUserData.email = '';
		newUserData.registered_with = 'contact_number';
	}

	userCollection.findOne(
		{
			status: 'active',
			$or: [
				{ email: newUserData.email },
				{ contact_number: newUserData.email },
			],
		},
		function (err, result) {
			if (result) {
				let error = new Error('User already registered with this username');
				error.name = 'VALIDATION_ERROR';
				cb(error);
				return;
			} else {
				newUserData.registerFrom = 'name only';
				newUserData.status = 'inactive';
				var salt = bcrypt.genSaltSync(10);
				newUserData.password = bcrypt.hashSync(newUserData.password, salt);
				newUserData.email_verified = false;
				newUserData.verification_token = cryptoRandomString(64);
				newUserData.verification_otp = generateOTP();
				newUserData.phone_verified = false;
				newUserData.introduced = false;
				delete newUserData.username;
				delete newUserData.password;

				userCollection.findOneAndUpdate(
					{ user_id: currentUserId },
					{ $set: newUserData },
					{
						returnOriginal: false,
					},
					function (err, userData) {
						if (err) {
							cb(err);
						} else {
							// Send Registration Email
							if (isEmail) {
								if (regFrom == 'app') {
									EMAIL_HANDLER.sendRegistrationEmailOTP(newUserData);
								} else {
									EMAIL_HANDLER.sendRegistrationEmail(newUserData);
								}
							} else {
								SMS_HANDLER.sendRegistrationSMS(newUserData);
							}

							let finalResponse = {};
							finalResponse.status = true;
							finalResponse.registered_with = newUserData.registered_with;
							cb(null, finalResponse);
						}
					}
				);
			}
		}
	);
};

/**
 * AUTHENTICATION CHECK
 * @param CLIENT
 * @param req
 * @param res
 * @param cb
 */

module.exports.authentication = function (CLIENT, req, res, cb) {
	let currentToken = req.headers.authorization.split(' ')[1];
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(Model.collection_name);
	let accessTokenCollection = CONNECTION.collection(
		SITE_CONFIG.accessTokenCollection
	);

	accessTokenCollection.findOne(
		{ token: currentToken },
		function (err, tokenData) {
			if (err) {
				console.log(err);
				let error = new Error('Connectivity Error');
				cb(error);
			} else {
				if (tokenData) {
					delete tokenData._id;
					req.authorization = tokenData;
					userCollection.findOneAndUpdate(
						{ user_id: tokenData.user_id },
						{ $set: { last_active: new Date() } },
						function (err, doc) {
							cb(null, doc);
						}
					);
				} else {
					let error = new Error();
					error.name = 'UNAUTHORISED_ERROR';
					cb(error);
				}
			}
		}
	);
};

module.exports.resetPasswordRequest = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(Model.collection_name);
	let username = req.body.username;

	let validationError = {};
	if (!username) {
		validationError['username'] = 'is required';
	}

	if (Object.keys(validationError).length > 0) {
		let vErr = new Error();
		vErr.name = 'VALIDATION_ERROR';
		vErr.message = validationError;
		cb(vErr);
	} else {
		const otp = generateOTP();
		let expiry = new Date();
		expiry.setHours(expiry.getHours() + 1);
		userCollection.findOneAndUpdate(
			{
				$and: [
					{
						$or: [{ email: username }, { contact_number: username }],
					},
					{ status: 'active' },
				],
			},
			{
				$set: {
					password_reset_otp: otp,
					password_reset_expiry: expiry,
				},
			},
			{ returnOriginal: false },
			function (err, foundUser) {
				if (foundUser.value) {
					EMAIL_HANDLER.sendPasswordResetEmail(foundUser.value);
					SMS_HANDLER.sendPasswordResetSMS(foundUser.value);
					cb(null, { status: true });
				} else {
					let error = new Error('Invalid User');
					error.name = 'VALIDATION_ERROR';
					cb(error);
				}
			}
		);
	}
};

module.exports.verifyPasswordRequest = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(Model.collection_name);
	let username = req.body.username.trim().toLowerCase();
	let otp = req.body.otp.trim();
	let password = req.body.password;
	let validationError = {};
	console.log('===');
	console.log(req.body);
	console.log('===');
	if (!username) {
		validationError['username'] = 'is required';
	}
	if (!otp) {
		validationError['otp'] = 'is required';
	}

	if (!password) {
		validationError['password'] = 'is required';
	}

	if (Object.keys(validationError).length > 0) {
		let vErr = new Error();
		vErr.name = 'VALIDATION_ERROR';
		vErr.message = validationError;
		cb(vErr);
	} else {
		let now = new Date();
		const salt = bcrypt.genSaltSync(10);
		password = bcrypt.hashSync(password, salt);
		userCollection.findOneAndUpdate(
			{
				$and: [
					{ password_reset_otp: otp },
					{ password_reset_expiry: { $gt: now } },
					{
						$or: [
							{ email: username },
							{ contact_number: username },
							// { contact_number: new RegExp(`\^\\d\\d\\d\?${username}$`) }
						],
					},
				],
			},
			{
				$set: {
					password_reset_otp: null,
					password_reset_expiry: null,
					password: password,
				},
			},
			{ returnOriginal: false },
			function (err, foundUser) {
				if (foundUser.value) {
					EMAIL_HANDLER.sendPasswordResetConfirmEmail(foundUser.value);
					cb(null, { status: true, message: 'Password Changed Successfully' });
				} else {
					let error = new Error('Invalid OTP');
					error.name = 'VALIDATION_ERROR';
					cb(error);
				}
			}
		);
	}
};

module.exports.reportUserByUserId = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(Model.collection_name);
	let user_id = Number(req.params.user_id);
	userCollection.findOne({ user_id: user_id }, (err, userDetails) => {
		if (!userDetails) {
			let error = new Error('Invalid User');
			cb(error);
		} else {
			const reportCollection = CONNECTION.collection('report');
			let reportData = {
				report_for: 'user',
				user_id: user_id,
				reported_by: req.authorization.user_id,
				report_time: new Date(),
				report_reason: req.body['report_reason'],
				report_status: 'pending',
			};
			reportCollection.insertOne(reportData, (err, inserted) => {
				cb(err, { status: true, data: 'Report Successful!' });
			});
		}
	});
};

module.exports.inActiveMyAccount = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(Model.collection_name);
	let user_id = req.authorization.user_id;
	userCollection.findOneAndUpdate(
		{
			$and: [{ user_id: user_id }, { status: 'active' }],
		},
		{
			$set: {
				status: 'inactive',
				verification_otp: null,
				verification_token: null,
			},
		},
		function (err, foundUser) {
			if (foundUser.value) {
				cb(null, {
					status: true,
					message: 'Account status updated successfully!!!',
				});
			} else {
				let error = new Error('Invalid User');
				error.name = 'VALIDATION_ERROR';
				cb(error);
			}
		}
	);
};

// Function to generate OTP
// const generateOTP = function () {
//     var digits = '0123456789';
//     let OTP = '';
//     for (let i = 0; i < 4; i++) {
//         OTP += digits[Math.floor(Math.random() * 10)];
//     }
//     return OTP;
// };

/* Unsubscribe */
module.exports.unsubscribe = function (CLIENT, req, res, cb) {
	if (!req.body || !req.body.user_id) {
		let vErr = new Error();
		vErr.name = 'VALIDATION_ERROR';
		vErr.message = 'Please enter all required fields.';
		cb(vErr);
	} else {
		let CONNECTION = CLIENT.db(utility.dbName);
		let userCollection = CONNECTION.collection(Model.collection_name);

		var updateData = { isUnscribed: 1 };
		userCollection.findOneAndUpdate(
			{ user_id: Number(req.body.user_id) },
			{ $set: updateData },
			function (err, resp) {
				cb(null, { result: true });
			}
		);
	}
};

/** Open account */
module.exports.createAccountId = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(Model.collection_name);

	/* Remove blank space from left and right of string */
	if (req.body.first_name) {
		req.body.first_name = req.body.first_name.trim();
	} else {
		req.body.first_name = 'autoTestHiren';
	}
	if (req.body.last_name) {
		req.body.last_name = req.body.last_name.trim();
	} else {
		req.body.last_name = 'autoTestHiren';
	}

	if (req.body.register_device_detail) {
		req.body.register_device_detail = req.body.register_device_detail;
	}

	let newUserData = req.body;
	newUserData.user_name_open = newUserData.user_name;
	newUserData.user_name = '';
	if (!newUserData.user_name_open) {
		let error = new Error('Username Can not be Empty');
		error.name = 'VALIDATION_ERROR';
		cb(error);
		return;
		// newUserData.user_name = "";
	} else {
		let unique_user_name = {
			user_name_open: newUserData.user_name_open,
			$or: [
				{
					$and: [{ status: 'inactive' }, { registerFrom: 'name only' }],
				},
				{
					status: 'active',
				},
			],
		};
		// unique_user_name.user_name = newUserData.user_name;
		// unique_user_name.status = 'active';

		userCollection.findOne(unique_user_name, function (err, user) {
			if (err) {
				cb(err);
			} else {
				if (user) {
					let error = new Error('User with this username already exists');
					error.name = 'VALIDATION_ERROR';
					cb(error);
					return;
				}
			}
		});
	}

	newUserData.email = '';
	newUserData.contact_number = '';
	newUserData.registered_with = '';
	newUserData.registerFrom = 'name only';
	newUserData.password = 'Hello@123';

	utility.validatePostData(
		CONNECTION,
		newUserData,
		Model,
		'insert',
		0,
		function (err, validatedData) {
			if (err) {
				cb(err);
			} else {
				// Encrypt Password in bCrypt
				var salt = bcrypt.genSaltSync(10);
				validatedData.password = bcrypt.hashSync(validatedData.password, salt);
				validatedData.email_verified = false;
				validatedData.verification_token = '';
				validatedData.verification_otp = '';
				validatedData.phone_verified = false;
				validatedData.introduced = false;
				validatedData.status = 'inactive';

				/* */
				if (validatedData.first_name == 'autoTestHiren') {
					validatedData.first_name = '';
				}
				if (validatedData.last_name == 'autoTestHiren') {
					validatedData.last_name = '';
				}
				/* */

				userCollection.insertOne(validatedData, function (err, response) {
					if (err) {
						cb(err);
					} else {
						// Send Registration Email

						var userRes = validatedData;

						delete userRes.password;
						delete userRes.registered_with;
						delete userRes._id;
						userRes.user_name = userRes.user_name_open;

						let finalResponse = {};
						finalResponse.status = true;
						finalResponse.user = userRes;
						cb(null, finalResponse);
					}
				});
			}
		}
	);
};

module.exports.registerAccountId = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(Model.collection_name);

	/* Remove blank space from left and right of string */
	if (req.body.user_id) {
		req.body.user_id = Number(req.body.user_id);
	}
	if (req.body.first_name) {
		req.body.first_name = req.body.first_name.trim();
	}
	if (req.body.last_name) {
		req.body.last_name = req.body.last_name.trim();
	}
	if (req.body.username) {
		req.body.username = req.body.username.trim();
	}
	if (req.body.register_device_detail) {
		req.body.register_device_detail = req.body.register_device_detail;
	}

	var regFrom = 'web';
	if (req.body.reg_from) {
		regFrom = req.body.reg_from.toLowerCase();
	}

	let newUserData = req.body;

	if (!req.body.user_id || req.body.user_id <= 0) {
		let error = new Error('UserId Can not be Empty');
		error.name = 'VALIDATION_ERROR';
		cb(error);
		return;
	}
	let currentUserId = Number(req.body.user_id);

	if (!newUserData.user_name) {
		// let error = new Error("Username Can not be Empty");
		// error.name = "VALIDATION_ERROR";
		// cb(error);
		// return;
		newUserData.user_name = '';
	} else {
		let unique_user_name = {};
		unique_user_name.user_name = newUserData.user_name;
		unique_user_name.status = 'active';

		userCollection.findOne(unique_user_name, function (err, user) {
			if (err) {
				cb(err);
			} else {
				if (user) {
					let error = new Error('User with this username already exists');
					error.name = 'VALIDATION_ERROR';
					cb(error);
					return;
				}
			}
		});
	}

	if (!newUserData.username) {
		let error = new Error('Email / Phone Can not be Empty');
		error.name = 'VALIDATION_ERROR';
		cb(error);
		return;
	}
	/*** EMAIL/ Mobile***/
	let loginString = newUserData.username;
	const isEmail = loginString.includes('@');
	if (isEmail) {
		let emailRe = /\S+@\S+\.\S+/;
		if (!emailRe.test(loginString)) {
			let error = new Error('Invalid Email Id');
			error.name = 'VALIDATION_ERROR';
			cb(error);
			return;
		}
		newUserData.email = loginString.toLowerCase();
		newUserData.contact_number = '';
		newUserData.registered_with = 'email';
	} else {
		// Mobile Number
		loginString = loginString.replace('+', '');
		let phoneRe =
			/^\s*(?:\+?(\d{1,3}))?[- (]*(\d{3})[- )]*(\d{3})[- ]*(\d{4})(?: *[x/#]{1}(\d+))?\s*$/;
		if (!phoneRe.test(loginString)) {
			let error = new Error('Invalid Phone Number');
			error.name = 'VALIDATION_ERROR';
			cb(error);
			return;
		}
		newUserData.contact_number = loginString;
		newUserData.email = '';
		newUserData.registered_with = 'contact_number';
	}

	userCollection.findOne(
		{
			status: 'active',
			$or: [
				{ email: newUserData.email },
				{ contact_number: newUserData.email },
			],
		},
		function (err, result) {
			if (result) {
				let error = new Error('User already registered with this username');
				error.name = 'VALIDATION_ERROR';
				cb(error);
				return;
			} else {
				newUserData.registerFrom = 'name only';
				newUserData.status = 'inactive';
				var salt = bcrypt.genSaltSync(10);
				newUserData.password = bcrypt.hashSync(newUserData.password, salt);
				newUserData.email_verified = false;
				newUserData.verification_token = cryptoRandomString(64);
				newUserData.verification_otp = generateOTP();
				newUserData.phone_verified = false;
				newUserData.introduced = false;
				delete newUserData.username;
				delete newUserData.password;

				userCollection.findOneAndUpdate(
					{ user_id: currentUserId },
					{ $set: newUserData },
					{
						returnOriginal: false,
					},
					function (err, userData) {
						if (err) {
							cb(err);
						} else {
							// Send Registration Email
							if (isEmail) {
								if (regFrom == 'app') {
									EMAIL_HANDLER.sendRegistrationEmailOTP(newUserData);
								} else {
									EMAIL_HANDLER.sendRegistrationEmail(newUserData);
								}
							} else {
								SMS_HANDLER.sendRegistrationSMS(newUserData);
							}

							let finalResponse = {};
							finalResponse.status = true;
							finalResponse.registered_with = newUserData.registered_with;
							cb(null, finalResponse);
						}
					}
				);
			}
		}
	);
};
