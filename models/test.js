'use strict';
let utility = require('../utilities');
const SITE_CONFIG = require('../configs/siteConfig');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const { sendPush } = require('../_helpers/sendPush');
const NOTIFICATION = require('../models/notification.js');

/* For message */
const messageModel = require('./message.json');
const messageGroupModel = require('./message_group.json');
const messageGroupMemberModel = require('./message_group_members.json');
const userModel = require('./user.json');
const moment = require('moment');
const LIKE_MODEL = require('./likes.json');
let likeCollectionName = LIKE_MODEL.collection_name;
let userCollectionName = userModel.collection_name;

const SOCKET_MODEL = require('./socket.json');
let socketCollectionName = SOCKET_MODEL.collection_name;

/* For log file upload */
const logStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		const dirBasePath = SITE_CONFIG.mediaBasePath;
		let dirPath = dirBasePath + 'iPhoneLog';
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath);
		}
		cb(null, dirPath);
	},
	filename: (req, file, cb) => {
		// console.log(file);
		let extension = path.extname(file.originalname);
		cb(null, file.originalname);
	},
});

module.exports.uploadLog = multer({ storage: logStorage }).array('file', 5);

module.exports.afterUploadLog = async function (req, res, next) {
	const dirBasePath = SITE_CONFIG.mediaBasePath;
	let dirPath = dirBasePath + 'iPhoneLog';
	// console.log(req.files[0].originalname);
	// let extension = path.extname(req.file.originalname);
	res.json({ status: true, data: dirPath + '/' + req.files[0].originalname });
};

/* Get Message START */
module.exports.getMessages = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let messageCollection = CONNECTION.collection(messageModel.collection_name);
	let userCollection = CONNECTION.collection(userModel.collection_name);

	let page = Number(req.body.page) || 1;
	let limit = SITE_CONFIG.messageLimitPerPage * page;
	let skip = 0; //(page - 1) * limit;

	const user_id = Number(req.body.to_id);
	const currentLoggedInUser = Number(req.body.from_id);
	userCollection.findOne(
		{ user_id: currentLoggedInUser },
		function (err, userDetails) {
			messageCollection
				.aggregate([
					{
						$match: {
							$or: [
								{ to_id: currentLoggedInUser, from_id: user_id },
								{ to_id: user_id, from_id: currentLoggedInUser },
							],
							message_status: { $ne: 'deleted' },
						},
					},
					{
						$sort: { created_date: -1 },
					},
					{
						$skip: skip,
					},
					{
						$limit: limit,
					},
					{
						$lookup: {
							from: userModel.collection_name,
							localField: 'from_id',
							foreignField: 'user_id',
							as: 'fromUserDetails',
						},
					},
					likesLookup('message', currentLoggedInUser),
					likedByMeLookup(currentLoggedInUser),
					{
						$project: {
							to_id: 1,
							message_text: 1,
							message_image: 1,
							from_id: 1,
							message_status: 1,
							created_date: 1,
							message_id: 1,
							'from_user.first_name': {
								$arrayElemAt: ['$fromUserDetails.first_name', 0],
							},
							'from_user.last_name': {
								$arrayElemAt: ['$fromUserDetails.last_name', 0],
							},
							'from_user.user_name': {
								$ifNull: [
									{ $arrayElemAt: ['$fromUserDetails.user_name', 0] },
									'',
								],
							},
							'from_user.profile_image_url': {
								$arrayElemAt: ['$fromUserDetails.profile_image_url', 0],
							},
							from: {
								$cond: [
									{ $eq: ['$from_id', currentLoggedInUser] },
									'me',
									'friend',
								],
							},
							message_reply_id: 1,
							message_reply_text: 1,
							like_count: { $ifNull: ['$like_count', 0] },
							liked: {
								$cond: [
									{ $eq: [{ $arrayElemAt: ['$liked.count', 0] }, 1] },
									true,
									false,
								],
							},
							liked_by: 1,
						},
					},
				])
				.toArray((err, messageList) => {
					if (err) {
						cb(err);
					} else {
						messageList.forEach((friend, MLindex) => {
							if (friend.to_id == currentLoggedInUser) {
								friend.message_status = 'read';
							}
							if (friend.from == 'me') {
								if (
									userDetails.blocked_ids &&
									userDetails.blocked_ids.indexOf(friend.to_id) !== -1
								) {
									friend.blocked_by_me = true;
								} else {
									friend.blocked_by_me = false;
								}
							} else {
								if (
									userDetails.blocked_ids &&
									userDetails.blocked_ids.indexOf(friend.from_id) !== -1
								) {
									friend.blocked_by_me = true;
								} else {
									friend.blocked_by_me = false;
								}
							}
						});
						messageCollection.updateMany(
							{
								to_id: currentLoggedInUser,
								from_id: user_id,
								message_status: { $ne: 'deleted' },
							},
							{ $set: { message_status: 'read' } },
							function (err, readMessages) {
								let finalResponse = {};
								// finalResponse.status = true;
								finalResponse.data = messageList.reverse();
								finalResponse.count = messageList.length;
								finalResponse.currentPage = page;
								finalResponse.nextPage = page + 1;
								cb(null, finalResponse);
							}
						);
					}
				});
		}
	);
};

const likesLookup = (like_type, currentUserId) => {
	return {
		$lookup: {
			from: likeCollectionName,
			let: {
				messageId: '$message_id',
			},
			pipeline: [
				{
					$match: {
						$expr: {
							$eq: ['$message_id', '$$messageId'],
						},
					},
				},
				{
					$match: {
						$expr: {
							$eq: ['$like_type', like_type],
						},
					},
				},
				{
					$limit: 5,
				},
				{
					$lookup: {
						from: userCollectionName,
						localField: 'liked_by',
						foreignField: 'user_id',
						as: 'users',
					},
				},
				{
					$project: {
						_id: 0,
						user_id: { $arrayElemAt: ['$users.user_id', 0] },
						first_name: { $arrayElemAt: ['$users.first_name', 0] },
						last_name: { $arrayElemAt: ['$users.last_name', 0] },
						profile_image_url: {
							$arrayElemAt: ['$users.profile_image_url', 0],
						},
						user_name: {
							$ifNull: [{ $arrayElemAt: ['$users.user_name', 0] }, ''],
						},
					},
				},
			],
			as: 'liked_by',
		},
	};
};

// Mark messages as read
module.exports.readMessages = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let messageCollection = CONNECTION.collection(messageModel.collection_name);
	const currentLoggedInUser = req.data.from_id;
	const user_id = req.data.to_id;
	// let userCollection = CONNECTION.collection(userModel.collection_name);

	// const query = {
	//     $and: [
	//         {
	//             $or: [
	//                 { to_id: req.data.to_id, from_id: req.data.from_id },
	//                 { to_id: req.data.from_id, from_id: req.data.to_id }
	//             ]
	//         },
	//         { message_status: { $ne: 'deleted' } }
	//     ]
	// }
	messageCollection.updateMany(
		{
			to_id: currentLoggedInUser,
			from_id: user_id,
			message_status: { $ne: 'deleted' },
		},
		{ $set: { message_status: 'read' } },
		function (err, readMessages) {
			let finalResponse = {};
			finalResponse.status = true;
			cb(null, finalResponse);
		}
	);
};

const likedByMeLookup = (currentUserId) => {
	return {
		$lookup: {
			from: likeCollectionName,
			let: {
				messageId: '$message_id',
			},
			pipeline: [
				{
					$match: {
						$expr: {
							$eq: ['$message_id', '$$messageId'],
						},
					},
				},
				{
					$match: {
						$expr: {
							$eq: ['$liked_by', currentUserId],
						},
					},
				},
				{
					$group: {
						_id: null,
						count: { $sum: 1 },
					},
				},
			],
			as: 'liked',
		},
	};
};
/* Get Message END */

module.exports.createMessageGroup = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let messageGroupCollection = CONNECTION.collection(
		messageGroupModel.collection_name
	);
	let messageGroupMemberCollection = CONNECTION.collection(
		messageGroupMemberModel.collection_name
	);

	let newGroupData = utility.filterBody(req.body);
	if (newGroupData === {}) {
		return cb({ error: 'invalid data' }, false);
	}
	newGroupData.created_by = Number(newGroupData.created_by);
	newGroupData.members = 1;

	utility.validatePostData(
		CONNECTION,
		newGroupData,
		messageGroupModel,
		'insert',
		0,
		function (err, validatedData) {
			if (err) {
				cb(err);
			} else {
				messageGroupCollection.insertOne(
					validatedData,
					function (err, response) {
						if (err) {
							cb(err);
						} else {
							// console.log(response);
							const memberData = {
								member_id: validatedData.created_by,
								group_id: validatedData.message_group_id,
								is_admin: true,
							};
							utility.validatePostData(
								CONNECTION,
								memberData,
								messageGroupMemberModel,
								'insert',
								0,
								function (err, validatedData2) {
									messageGroupMemberCollection.insertOne(
										validatedData2,
										function (err, response2) {
											if (err) {
												cb(err);
											} else {
												// console.log(response2);
												let finalResponse = {};
												finalResponse.status = true;
												finalResponse.result = validatedData;
												cb(null, finalResponse);
											}
										}
									);
								}
							);
						}
					}
				);
			}
		}
	);
};

/** Code for vishnu (server guy) to check everything working */
module.exports.getProfile = function (CLIENT, req, res, cb) {
	const currentLoggedInUser = req.authorization.user_id || 0;
	let validationError = {};
	if (currentLoggedInUser == 0) {
		let vErr = new Error();
		vErr.name = 'VALIDATION_ERROR';
		vErr.message = validationError['user'] = 'User not found';
		cb(vErr);
	} else {
		let CONNECTION = CLIENT.db(utility.dbName);
		let userCollection = CONNECTION.collection(userCollectionName);

		userCollection.findOne(
			{ user_id: currentLoggedInUser },
			function (err, result) {
				if (err) {
					cb(err);
				}
				if (result) {
					let finalResponse = {};
					finalResponse.status = true;
					finalResponse.data = 'Working';
					cb(err, finalResponse);
				} else {
					let vErr = new Error();
					vErr.name = 'VALIDATION_ERROR';
					vErr.message = validationError['user'] = 'User not found';
					cb(vErr);
				}
			}
		);
	}
};
module.exports.testImage = function (CLIENT, req, res, cb) {
	var err = null;
	const currentLoggedInUser = req.authorization.user_id || 0;
	const imageURL = './public/watermark250.png';
	console.log('==== ===');
	console.log('image: ', imageURL);
	let validationError = {};
	if (currentLoggedInUser == 0) {
		let vErr = new Error();
		vErr.name = 'VALIDATION_ERROR';
		vErr.message = validationError['user'] = 'User not found';
		cb(vErr);
	} else {
		const dirBasePath = SITE_CONFIG.mediaBasePath + 'tempImage/';
		console.log('dirBasePath: ', dirBasePath);
		if (!fs.existsSync(dirBasePath)) {
			fs.mkdirSync(dirBasePath);
		}
		fs.copyFile(imageURL, dirBasePath + 'watermark250.png', (err) => {
			if (err) throw err;
			let finalResponse = {};
			finalResponse.status = true;
			finalResponse.data = {};
			finalResponse.data.FileUpload = 'Working';
			fs.unlink(dirBasePath + 'watermark250.png', (err) => {
				if (err) throw err;
				finalResponse.data.FileDelete = 'Working';
				cb(err, finalResponse);
			});
		});
	}
};
