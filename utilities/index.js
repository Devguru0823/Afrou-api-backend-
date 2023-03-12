'use strict';
let DB_CONNECTION = require('../configs/dbConnection');
const DB_CONFIG = require('../configs/dbConfig');
let async = require('async');
const path = require('path');
const { json } = require('body-parser');
require('fs')
	.readdirSync(__dirname)
	.forEach(function (file) {
		/* If its the current file ignore it */
		if (file === 'index.js') return;
		if (file === 'compress-utils.jsc') return;

		/* Store module with its name (from filename) */
		module.exports = require(path.join(__dirname, file));
	});

/**
 * VALIDATOR FUNCTION
 * @param CONNECTION -> Mongo Connection
 * @param data -> post Data
 * @param Model -> Model instance
 * @param validation_type -> insert/update
 * @param instance_id -> For Update unique checking, current instance's primary key
 * @param cb -> Callback
 */
module.exports.validatePostData = function (
	CONNECTION,
	data,
	Model,
	validation_type,
	instance_id,
	cb
) {
	let collection = CONNECTION.collection(Model.name);
	let properties = Model.properties;

	let validationErrors = {};
	let allKeys = Object.keys(properties);
	if (validation_type === 'update') {
		let primary_key = getPrimaryKeyFromModel(Model);
		// Delete Primary Key Field if exists in the data while Update

		delete data[primary_key];
		allKeys = Object.keys(data);
	}

	async.each(
		allKeys,
		// 2nd param is the function that each item is passed to
		function (key, callback) {
			if (!properties[key].primary_key) {
				let currentError = [];
				if (properties[key].required && properties[key].default === undefined) {
					if (data[key] === undefined || data[key] === '') {
						// Error
						currentError.push('is Required');
					}
				}

				if (data[key]) {
					// Type Check
					switch (properties[key].type) {
						case 'string':
							if (typeof data[key] !== 'string') {
								currentError.push('is not a valid String');
							}
							break;

						case 'number':
							if (typeof data[key] !== 'number') {
								currentError.push('is not a valid Number');
							}
							break;

						case 'date':
							let dateRe =
								/^(?:[\+-]?\d{4}(?!\d{2}\b))(?:(-?)(?:(?:0[1-9]|1[0-2])(?:\1(?:[12]\d|0[1-9]|3[01]))?|W(?:[0-4]\d|5[0-2])(?:-?[1-7])?|(?:00[1-9]|0[1-9]\d|[12]\d{2}|3(?:[0-5]\d|6[1-6])))(?:[T\s](?:(?:(?:[01]\d|2[0-3])(?:(:?)[0-5]\d)?|24\:?00)(?:[\.,]\d+(?!:))?)?(?:\2[0-5]\d(?:[\.,]\d+)?)?(?:[zZ]|(?:[\+-])(?:[01]\d|2[0-3]):?(?:[0-5]\d)?)?)?)?$/;
							if (!dateRe.test(data[key])) {
								currentError.push('is not a valid Date');
							} else {
								data[key] = new Date(data[key]);
							}
							break;

						case 'email':
							let emailRe = /\S+@\S+\.\S+/;
							if (!emailRe.test(data[key])) {
								currentError.push('is not a valid Email');
							}
							break;

						case 'tel':
							let phoneRe =
								/^\s*(?:\+?(\d{1,3}))?[- (]*(\d{3})[- )]*(\d{3})[- ]*(\d{4})(?: *[x/#]{1}(\d+))?\s*$/;
							if (!phoneRe.test(data[key])) {
								currentError.push('is not a valid Phone Number');
							}
							break;
						case 'array':
							if (typeof data[key] !== 'object' || !Array.isArray(data[key])) {
								currentError.push('is not a valid Array');
							}
							break;

						case 'object':
							if (typeof data[key] !== 'object') {
								currentError.push('is not a valid Object');
							}
							break;

						case 'enum':
							if (properties[key].enum.indexOf(data[key]) === -1) {
								currentError.push('is not a valid entry');
							}
							break;

						default:
					}
				}

				// Set Default values
				if (properties[key].required && !data[key]) {
					if (properties[key].type === 'date') {
						if (properties[key].default === 'now') {
							data[key] = new Date();
						} else {
							data[key] = new Date(properties[key].default);
						}
					} else {
						data[key] = properties[key].default;
					}
				}

				// Unique check
				if (
					data[key] &&
					properties[key].unique &&
					data.email != data[key] &&
					data.contact_number != data[key]
				) {
					console.log('data.email===>', data.email);
					checkUnique(
						CONNECTION,
						Model,
						key,
						data[key],
						validation_type,
						instance_id,
						function (isUnique) {
							if (isUnique) {
								if (currentError.length > 0) {
									validationErrors[key] = currentError;
								}

								callback();
							} else {
								currentError.push('should be unique');
								// Set Default values

								if (currentError.length > 0) {
									validationErrors[key] = currentError;
								}
								callback();
							}
						}
					);
				} else {
					// Set Default values
					if (properties[key].required && !data[key]) {
						data[key] = properties[key].default;
					}

					if (currentError.length > 0) {
						validationErrors[key] = currentError;
					}

					callback();
				}
			} else {
				callback();
			}
		},
		// 3rd param is the function to call when everything's done
		function (err) {
			// All tasks are done now
			if (!err) {
				let primary_key = getPrimaryKeyFromModel(Model);
				if (Object.keys(validationErrors).length === 0) {
					if (validation_type === 'insert') {
						generatePrimaryKey(
							CONNECTION,
							Model,
							function (err, primaryKeyValue) {
								if (err) {
									cb(err);
								} else {
									// Now Validate
									data[primary_key] = primaryKeyValue;
									cb(null, data);
								}
							}
						);
					} else {
						data.updated_date = new Date();
						cb(null, data);
					}
				} else {
					let errorMessages = {};
					Object.keys(validationErrors).forEach((key) => {
						errorMessages[key] = validationErrors[key].join(', ');
					});
					let error = new Error();
					error.name = 'VALIDATION_ERROR';
					error.status = 422;
					error.message = errorMessages;
					try {
						console.log(
							typeof errorMessages === 'object' && JSON.stringify(errorMessages)
						);
					} catch (error) {}
					cb(error);
				}
			} else {
				cb(err);
			}
		}
	);
};

/**
 * MONGO CONNECTION
 * @param req
 * @param res
 * @param cb
 */
module.exports.mongoConnect = function (req, res, cb) {
	DB_CONNECTION.connect(function (err, client) {
		if (err) {
			console.log(err);
			throw err;
			//res.status(500).json({"error": err.name + ': ' + err.message})
		} else {
			// Connection Successful
			cb(client);
		}
	});
};

/**
 * GENERATE PRIMARY KEY
 * @param CONNECTION
 * @param Model
 * @param cb
 */
let generatePrimaryKey = function (CONNECTION, Model, cb) {
	let sequenceCollection = CONNECTION.collection('sequence');
	let collectionName = Model.collection_name;

	sequenceCollection.findOneAndUpdate(
		{ collection: collectionName },
		{ $inc: { counter: 1 } },
		{
			upsert: true,
			returnOriginal: false,
		},
		function (err, updatedSequence) {
			cb(err, updatedSequence?.value?.counter);
		}
	);
};

/**
 * CHECK UNIQUE
 * @param CONNECTION
 * @param Model
 * @param field_name
 * @param value
 * @param validation_type -> insert/update
 * @param instance_id
 * @param cb
 */

let checkUnique = function (
	CONNECTION,
	Model,
	field_name,
	value,
	validation_type,
	instance_id,
	cb
) {
	let collection = CONNECTION.collection(Model.collection_name);

	let primary_key = getPrimaryKeyFromModel(Model);
	let condition = {};
	condition[field_name] = value;
	if (validation_type === 'update') {
		condition[primary_key] = { $ne: instance_id };
	}

	collection.countDocuments(condition, function (err, instanceCount) {
		//console.log(err, instanceCount);
		if (err) {
			cb(false);
		} else {
			if (instanceCount > 0) {
				cb(false);
			} else {
				cb(true);
			}
		}
	});
};

/**
 * GET PRIMARY KEY FIELD FROM MODEL
 * @param Model
 * @returns {string} Primary Key Field name
 */

let getPrimaryKeyFromModel = function (Model) {
	let primary_key = null;
	Object.keys(Model.properties).forEach((key) => {
		if (Model.properties[key].primary_key) {
			primary_key = key;
		}
	});

	return primary_key;
};

module.exports.dbName = DB_CONFIG.database;

module.exports.filterBody = function (obj) {
	return JSON.parse(JSON.stringify(obj).replace(/"\s+|\s+"/g, '"'));
};

module.exports.getMutualFriendIds = function (profile1, profile2) {
	if (profile1.friend_ids && profile2.friend_ids) {
		return profile1.friend_ids.filter(
			(value) => -1 !== profile2.friend_ids.indexOf(value)
		);
	} else {
		return [];
	}
};

module.exports.checkFriend = function (user_id, otherUserData) {
	return !!(
		otherUserData.friend_ids && otherUserData.friend_ids.indexOf(user_id) !== -1
	);
};

module.exports.checkIAmFollowing = function (user_id, otherUserData) {
	return !!(
		otherUserData.follower_ids &&
		otherUserData.follower_ids.indexOf(user_id) !== -1
	);
};

module.exports.containsAny = function (source, target) {
	if (target == null || target.length == 0) {
		return false;
	}
	var result = source.filter(function (item) {
		return target.indexOf(item) > -1;
	});
	return result.length > 0;
};

/******NOTIFICATION TEMPLATYE***********/

module.exports.getNotificationTextFromTemplate = function (
	CONNECTION,
	notifications,
	cb
) {
	let userIdsArray = [];
	let tempArr = [];
	notifications.forEach((not) => {
		const currentString = not.notification_details.text_template;
		let regEx = new RegExp('{{USER_ID_.*}}', 'g');
		let result = currentString.match(regEx);
		result.forEach((usr) => {
			let tmpUser = Number(usr.split('USER_ID_')[1].replace('}}', ''));
			if (userIdsArray.indexOf(tmpUser) === -1) {
				userIdsArray.push(tmpUser);
			}
		});
	});

	const userCollectionName = require('../models/user.json').collection_name;
	let userCollection = CONNECTION.collection(userCollectionName);
	userCollection
		.find(
			{ user_id: { $in: userIdsArray } },
			{
				projection: {
					first_name: 1,
					last_name: 1,
					user_id: 1,
					profile_image_url: 1,
					user_name: 1,
				},
			}
		)
		.toArray((err, usersData) => {
			if (err) {
				cb(err);
			} else {
				let usersObj = {};
				usersData.forEach((usr) => {
					usersObj['USER_ID_' + usr.user_id] = usr;
				});
				notifications.forEach((not) => {
					let tmpDetails = {};
					for (let key in usersObj) {
						if (
							not.notification_details.text_template.search(
								'{{' + key + '}}'
							) !== -1
						) {
							var user =
								usersObj[key].first_name + ' ' + usersObj[key].last_name;
							if (usersObj[key].user_name) {
								if (usersObj[key].user_name != '') {
									user = usersObj[key].user_name;
								} else {
									usersObj[key].user_name = '';
								}
							} else {
								usersObj[key].user_name = '';
							}
							tmpDetails.user_details = usersObj[key];
							tmpDetails.text = not.notification_details.text_template.replace(
								'{{' + key + '}}',
								'<b>' + user + '</b>'
							);
							if (
								not.notification_type === 'user_tagged' ||
								not.notification_type === 'post_comment' ||
								not.notification_type === 'post_like' ||
								not.notification_type === 'group_post_report'
							) {
								tmpDetails.client_router_link =
									'/post/' + not.notification_details.post_id;
								tmpDetails.raw_details = {
									post_id: not.notification_details.post_id,
								};
							} else if (
								not.notification_type === 'group_invite' ||
								not.notification_type === 'group_invite_accept'
							) {
								tmpDetails.client_router_link =
									'/afrogroup/' + not.notification_details.group_id;
								tmpDetails.raw_details = {
									group_id: not.notification_details.group_id,
								};
							} else {
								tmpDetails.client_router_link =
									'/profile/' + usersObj[key].user_id;
								if (not.notification_details.user_id) {
									tmpDetails.raw_details = {
										user_id: not.notification_details.user_id,
									};
								} else {
									const currentString = not.notification_details.text_template;
									let regEx = new RegExp('{{USER_ID_.*}}', 'g');
									let result = currentString.match(regEx);
									let tmpUserList = [];
									result.forEach((usr) => {
										let tmpUser = Number(
											usr.split('USER_ID_')[1].replace('}}', '')
										);
										if (tmpUserList.indexOf(tmpUser) === -1) {
											tmpUserList.push(tmpUser);
										}
									});
									tmpDetails.raw_details = { user_id: tmpUserList[0] };
								}
							}
						}
					}

					not.notification_details = tmpDetails;
				});

				cb(null, notifications);
			}
		});
};

module.exports.checkGroupMembership = function (
	CONNECTION,
	group_id,
	user_id,
	callback
) {
	const groupModel = require('../models/group.json');
	const groupCollection = CONNECTION.collection(groupModel.collection_name);
	groupCollection.countDocuments(
		{ group_id: group_id, group_members: user_id },
		function (err, count) {
			callback(count === 1);
		}
	);
};

module.exports.subtractArrays = (array1, array2) => {
	const difference = [];
	for (let i = 0; i < array1.length; i++) {
		if (array2.indexOf(array1[i]) === -1) {
			difference.push(array1[i]);
		}
	}
	return difference;
};

module.exports.getHashTags = function (inputText) {
	var regex = /(?:^|\s)(?:#)([a-zA-Z\d]+)/gm;
	var matches = [];
	var match;
	if (inputText) {
		while ((match = regex.exec(inputText.toLowerCase()))) {
			if (!matches.includes(match[1])) {
				matches.push(match[1]);
			}
		}
	}

	return matches;
};
