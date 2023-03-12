'use strict';
const Model = require('./user.json');
let utility = require('../utilities');
const bcrypt = require('bcryptjs');
const SITE_CONFIG = require('../configs/siteConfig');
const cryptoRandomString = require('crypto-random-string');
const ip = require('ip');
const PROFILE = require('./profile.js');
const EMAIL_HANDLER = require('../_helpers/email-handler');
const SMS_HANDLER = require('../_helpers/sms-handler');
const blockipsModel = require('./blockips.json');
module.exports.deleteMyAccount = function (CLIENT, req, res, cb) {
  let CONNECTION = CLIENT.db(utility.dbName);
  let userCollection = CONNECTION.collection(Model.collection_name);
  let user_id = req.authorization.user_id;

  userCollection.findOneAndDelete({ user_id: user_id }, (err, userDetails) => {
      console.log(err)
      return cb(err,{userDetails})
      if (foundUser.value) {
        cb(null, {
          status: true,
          message: "Account status updated successfully!!!",
        });
      } else {
        let error = new Error("Invalid User");
        error.name = "VALIDATION_ERROR";
        cb(error);
      }
    }
  );
};
module.exports.getUsers = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(Model.collection_name);
	console.log(req.authorization.user_id);
	userCollection
		.find({}, { projection: { password: 0 } })
		.toArray((err, userList) => {
			if (err) {
				console.log(err);
				cb(err);
			} else {
				let finalResponse = {};
				finalResponse.status = true;
				finalResponse.data = userList;
				cb(null, finalResponse);
			}
		});
};

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
				// console.log("user: ", user);
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
	let blockipsCollection = CONNECTION.collection(blockipsModel.collection_name);

	if (req.body.ipaddress && req.body.ipaddress != '') {
		blockipsCollection
			.find({ ipaddress: req.body.ipaddress })
			.toArray(function (err, blockips) {
				if (err) {
					cb(err);
				} else {
					if (blockips.length > 0) {
						let error = new Error(
							'You are not allowed to create account, contact admin user'
						);
						error.name = 'VALIDATION_ERROR';
						cb(error);
						return;
					} else {
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
						if (req.body.ipaddress) {
							req.body.ipaddress = req.body.ipaddress;
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
										let error = new Error(
											'User with this username already exists'
										);
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
									validatedData.password = bcrypt.hashSync(
										validatedData.password,
										salt
									);
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
											userCollection.deleteOne(
												condition,
												function (err, inactiveUser) {
													if (err) {
														cb(err);
													}
													userCollection.insertOne(
														validatedData,
														function (err, response) {
															if (err) {
																cb(err);
															} else {
																// Send Registration Email
																if (isEmail) {
																	if (req.fromReg == 'app') {
																		EMAIL_HANDLER.sendRegistrationEmailOTP(
																			validatedData
																		);
																	} else {
																		EMAIL_HANDLER.sendRegistrationEmail(
																			validatedData
																		);
																	}
																} else {
																	SMS_HANDLER.sendRegistrationSMS(
																		validatedData
																	);
																}

																let finalResponse = {};
																finalResponse.status = true;
																finalResponse.registered_with =
																	validatedData.registered_with;
																cb(null, finalResponse);
															}
														}
													);
												}
											);
										}
									});
								}
							}
						);
					}
				}
			});
	} else {
		let error = new Error('Your IP address not found, please try again.');
		error.name = 'VALIDATION_ERROR';
		cb(error);
		return;
	}
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

module.exports.login = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(Model.collection_name);
	let accessTokenCollection = CONNECTION.collection(
		SITE_CONFIG.accessTokenCollection
	);
	let { username, password, firebase_token, email, facebook_id, google_id } = {
		...req.body,
	};
	let validationError = {};
	if (req.body.type !== 'facebook' && req.body.type !== 'google') {
		if (!username) {
			validationError['username'] = 'is required';
		}
		username = username.toLowerCase().trim();
		if (!password) {
			validationError['password'] = 'is required';
		}
	} else {
		username = '';
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
				status: 'active',
			};
		} else if (req.body.type === 'google') {
			query = {
				$or: [{ google_id: google_id, email }],
				status: 'active',
			};
		} else {
			query = {
				$or: [{ email: username }, { contact_number: username }],
				status: 'active',
			};
		}
		// Now check for login
		userCollection.findOne(query, function (err, userData) {
			if (err) {
				cb(err);
			} else {
				if (userData) {
					// console.log(userData)
					if (req.body.type === 'facebook' || req.body.type === 'google') {
						let accessTokenData = {
							token: cryptoRandomString(64),
							user_id: userData.user_id,
							login_time: new Date(),
							login_ip: ip.address(),
						};
						accessTokenCollection.insertOne(
							accessTokenData,
							function (err, response) {
								if (err) {
									let error = new Error('Some error occurred while login');
									next(error);
								} else {
									const updateData = { last_login_ip: ip.address() };
									if (firebase_token) {
										updateData.firebase_token = firebase_token;
									}
									if (req.body.login_device_detail) {
										updateData.login_device_detail =
											req.body.login_device_detail;
									}
									userCollection.findOneAndUpdate(
										{ user_id: userData.user_id },
										{ $set: updateData },
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
									/*
                                // Successfully Logged in	
                                delete accessTokenData._id;
                                accessTokenData.status = true;
                                accessTokenData.user = userData;
                                cb(null, accessTokenData)
                                //res.status(200).json({ data: accessTokenData });	
                                */
								}
							}
						);
					} else {
						// User Found
						let passwordFromDb = userData.password;
						if (bcrypt.compareSync(password, passwordFromDb)) {
							// Matched!!!
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
										let error = new Error('Some error occurred while login');
										cb(error);
									} else {
										const updateData = { last_login_ip: ip.address() };
										if (firebase_token) {
											updateData.firebase_token = firebase_token;
										}
										if (req.body.login_device_detail) {
											updateData.login_device_detail =
												req.body.login_device_detail;
										}
										userCollection.findOneAndUpdate(
											{ user_id: userData.user_id },
											{ $set: updateData },
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
							let vErr = new Error();
							vErr.name = 'VALIDATION_ERROR';
							vErr.message = { password: 'Invalid Password' };
							cb(vErr);
						}
					}
				} else {
					if (req.body.type === 'facebook' || req.body.type === 'google') {
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
												let accessTokenData = {
													token: cryptoRandomString(64),
													user_id: validatedData.user_id,
													login_time: new Date(),
													login_ip: ip.address(),
												};
												accessTokenCollection.insertOne(
													accessTokenData,
													function (err, response) {
														if (err) {
															let error = new Error(
																'Some error occurred while login'
															);
															next(error);
														} else {
															// Successfully Logged in
															delete accessTokenData._id;
															accessTokenData.status = true;
															accessTokenData.user = validatedData;
															cb(null, accessTokenData);
															//res.status(200).json(accessTokenData);
														}
													}
												);
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

module.exports.logout = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let currentAccessToken = req.authorization.token;
	let userCollection = CONNECTION.collection(Model.collection_name);
	let accessTokenCollection = CONNECTION.collection(
		SITE_CONFIG.accessTokenCollection
	);
	accessTokenCollection.findOne(
		{ token: currentAccessToken },
		function (err, resp) {
			if (err) {
				cb(err);
			} else {
				userCollection.findOneAndUpdate(
					{ user_id: resp.user_id },
					{ $set: { firebase_token: '' } },
					function (err, resp) {}
				);
			}
		}
	);
	accessTokenCollection.deleteOne(
		{ token: currentAccessToken },
		function (err, resp) {
			if (err) {
				cb(err);
			} else {
				cb(null, { status: true });
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
	let username = req.body.username.trim();
	console.log({ username });
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
	// console.log("===");
	// console.log(req.body);
	// console.log("===");
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
				return cb(err);
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
				return cb(err);
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
						return cb(err);
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
						return;
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
		newUserData.contact_number = newUserData.username;
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
