'use strict';
const Model = require('./message.json');
const userModel = require('./user.json');
let utility = require('../utilities');
const moment = require('moment');
const { sendPush, sendPush2 } = require('../_helpers/push-notification');
const SITE_CONFIG = require('../configs/siteConfig');

const LIKE_MODEL = require('./likes.json');
let likeCollectionName = LIKE_MODEL.collection_name;

const USER_MODEL = require('./user.json');
let userCollectionName = USER_MODEL.collection_name;

const SOCKET_MODEL = require('./socket.json');
let socketCollectionName = SOCKET_MODEL.collection_name;

module.exports.getMessagesByUserId = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let messageCollection = CONNECTION.collection(Model.collection_name);
	let userCollection = CONNECTION.collection(userModel.collection_name);
	const user_id = Number(req.params.user_id);
	const currentLoggedInUser = req.authorization.user_id;
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
						$limit: 20,
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
								finalResponse.status = true;
								finalResponse.data = messageList.reverse();
								cb(null, finalResponse);
							}
						);
					}
				});
		}
	);
};

module.exports.getMessagesByUserIdV2 = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let messageCollection = CONNECTION.collection(Model.collection_name);
	let userCollection = CONNECTION.collection(userModel.collection_name);
	let page = Number(req.query.page) || 1;
	let limit = SITE_CONFIG.messageLimitPerPage;
	let skip = (page - 1) * limit;

	const user_id = Number(req.params.user_id);
	const currentLoggedInUser = req.authorization.user_id;
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
								finalResponse.status = true;
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
						user_name: { $arrayElemAt: ['$users.user_name', 0] },
					},
				},
			],
			as: 'liked_by',
		},
	};
};

module.exports.getMessagesList = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let messageCollection = CONNECTION.collection(Model.collection_name);
	let userCollection = CONNECTION.collection(userModel.collection_name);
	let currentUserId = req.authorization.user_id;
	userCollection.findOne(
		{ user_id: currentUserId },
		function (err, userDetails) {
			let friendIds = userDetails.friend_ids || [];
			if (!userDetails.following_ids) {
				userDetails.following_ids = [];
			}
			if (!userDetails.follower_ids) {
				userDetails.follower_ids = [];
			}
			friendIds.push(...userDetails.following_ids);
			friendIds.push(...userDetails.follower_ids);

			// Search For Messages who are not in Following or Follower
			messageCollection
				.aggregate([
					{
						$match: {
							$or: [{ from_id: currentUserId }, { to_id: currentUserId }],
							message_status: { $ne: 'deleted' },
						},
					},
					{
						$group: {
							_id: null,
							to_ids: { $addToSet: '$to_id' },
							from_ids: { $addToSet: '$from_id' },
						},
					},
					{
						$project: {
							user_ids: {
								$filter: {
									input: { $setUnion: ['$to_ids', '$from_ids'] },
									as: 'item',
									cond: { $ne: ['$$item', currentUserId] },
								},
							},
						},
					},
				])
				.toArray((err, messageUserList) => {
					if (messageUserList && messageUserList.length > 0) {
						if (messageUserList[0].user_ids) {
							friendIds.push(...messageUserList[0].user_ids);
						}
					}
					userCollection
						.aggregate([
							{
								$match: {
									user_id: { $in: friendIds },
									status: 'active',
								},
							},
							{
								$project: {
									first_name: 1,
									last_name: 1,
									user_name: { $ifNull: ['$user_name', ''] },
									user_id: 1,
									profile_image_url: 1,
									last_active: 1,
									blocked_ids: 1,
								},
							},
							{
								$lookup: {
									from: Model.collection_name,
									let: {
										userId: '$user_id',
									},
									pipeline: [
										{
											$match: {
												$expr: {
													$or: [
														{
															$and: [
																{ $eq: ['$to_id', currentUserId] },
																{ $eq: ['$from_id', '$$userId'] },
															],
														},
														{
															$and: [
																{ $eq: ['$to_id', '$$userId'] },
																{ $eq: ['$from_id', currentUserId] },
															],
														},
													],
												},
											},
										},
										{
											$sort: {
												created_date: -1,
											},
										},
										{
											$group: {
												_id: null,
												last_message: { $first: '$message_text' },
												last_message_image: { $first: '$message_image' },
												last_message_time: { $first: '$created_date' },
												unread_count: {
													$sum: {
														$cond: [
															{
																$and: [
																	{ $eq: ['$message_status', 'unread'] },
																	{ $eq: ['$to_id', currentUserId] },
																],
															},
															1,
															0,
														],
													},
												},
											},
										},
									],
									as: 'messages',
								},
							},
							{
								$project: {
									first_name: 1,
									last_name: 1,
									user_name: { $ifNull: ['$user_name', ''] },
									profile_image_url: 1,
									user_id: 1,
									last_active: 1,
									last_message: { $arrayElemAt: ['$messages.last_message', 0] },
									last_message_image: {
										$arrayElemAt: ['$messages.last_message_image', 0],
									},
									last_message_time: {
										$arrayElemAt: ['$messages.last_message_time', 0],
									},
									unread_count: { $arrayElemAt: ['$messages.unread_count', 0] },
									blocked_ids: 1,
								},
							},
							{
								$sort: {
									last_message_time: -1,
								},
							},
						])
						.toArray((err, messagesList) => {
							messagesList.forEach((friend, MLindex) => {
								if (
									friend.blocked_ids &&
									friend.blocked_ids.indexOf(userDetails.user_id) !== -1
								) {
									messagesList.splice(MLindex, 1);
								}
								if (
									userDetails.blocked_ids &&
									userDetails.blocked_ids.indexOf(friend.user_id) !== -1
								) {
									friend.blocked_by_me = true;
								} else {
									friend.blocked_by_me = false;
								}
								if (friend.last_active) {
									let minutesDifference = moment().diff(
										friend.last_active,
										'minutes'
									);
									friend.online_status = minutesDifference === 0;
								} else {
									friend.online_status = false;
								}
							});
							let finalResponse = {};
							finalResponse.status = true;
							finalResponse.data = messagesList;
							cb(null, finalResponse);
						});
				});
		}
	);
};

module.exports.addMessage = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let messageCollection = CONNECTION.collection(Model.collection_name);

	let newMessageData = utility.filterBody(req.body);
	if (newMessageData === {}) {
		return cb({ error: 'invalid data' }, false);
	}
	newMessageData.from_id = req.authorization.user_id;
	newMessageData.to_id = Number(req.params.to_id);

	utility.validatePostData(
		CONNECTION,
		newMessageData,
		Model,
		'insert',
		0,
		function (err, validatedData) {
			if (err) {
				cb(err);
			} else {
				messageCollection.insertOne(
					validatedData,
					async function (err, response) {
						if (err) {
							cb(err);
						} else {
							let userCollection = CONNECTION.collection(
								userModel.collection_name
							);
							let socketCollection =
								CONNECTION.collection(socketCollectionName);
							await userCollection
								.findOne({ user_id: newMessageData.from_id })
								.then(async (Details) => {
									/** If receiver mark as deleted then remove */
									let addTodellist = {
										delmsglist_users: { $in: [newMessageData.to_id] },
									};
									const updateDelUser = await userCollection.findOneAndUpdate(
										{ user_id: newMessageData.from_id },
										{ $pull: addTodellist },
										{ returnOriginal: false }
									);
									/** */
									await userCollection
										.findOne({ user_id: newMessageData.to_id })
										.then(async (Details_to) => {
											/** If receiver mark as deleted then remove */
											let addTodellist1 = {
												delmsglist_users: { $in: [newMessageData.from_id] },
											};
											const updateDelUser1 =
												await userCollection.findOneAndUpdate(
													{ user_id: newMessageData.to_id },
													{ $pull: addTodellist1 },
													{ returnOriginal: false }
												);
											/** */
											/*Blocked sender by receiver logic*/
											if (
												Details_to.blocked_ids &&
												Details_to.blocked_ids.indexOf(Details.user_id) !== -1
											) {
												Details_to.blocked_by_me = true;
											} else {
												Details_to.blocked_by_me = false;
											}
											var result = {};
											result.blocked_by_me = Details_to.blocked_by_me;
											result.created_date = validatedData.created_date;
											result.from = 'me';
											result.from_id = validatedData.from_id;
											result.from_user = {
												first_name: Details.first_name,
												last_name: Details.last_name,
												profile_image_url: Details.profile_image_url,
											};
											result.like_count = 0;
											result.liked = false;
											result.liked_by = [];
											result.message_id = validatedData.message_id;
											result.message_image = validatedData.message_image
												? validatedData.message_image
												: '';
											result.message_status = validatedData.message_status;
											result.message_text = validatedData.message_text;
											result.to_id = validatedData.to_id;
											result._id = validatedData._id;
											/**********************************/
											var userName =
												Details.first_name + ' ' + Details.last_name;
											if (Details.user_name && Details.user_name != '') {
												userName = Details.user_name;
											}
											let pushData = {
												status: 'New Message',
												title: 'New Message',
												body: `You got new message from ${userName}`,
												sound: 'default',
												mutable_content: true,
												content_available: true,
												data: {
													status: 'New Message',
													message: `You got new message from ${userName}`,
													notification_type: 'message',
													user_info: {
														first_name: Details.first_name,
														last_name: Details.last_name,
														user_id: Details.user_id,
														blocked_by_me: Details_to.blocked_by_me,
														profile_image_url: `https://cdn.afrocamgist.com/${Details.profile_image_url}`,
													},
												},
											};
											userCollection
												.findOne({ user_id: newMessageData.to_id })
												.then((userDetails) => {
													socketCollection
														.findOne({
															user_id: userDetails.user_id,
															status: 'active',
														})
														.then((socketUser) => {
															var userNameET = '';
															var userNameEF = '';
															if (userDetails.user_name) {
																userNameET = userDetails.user_name;
															}
															if (Details.user_name) {
																userNameEF = Details.user_name;
															}
															/*Blocked sender by receiver logic*/
															if (
																Details_to.blocked_ids &&
																Details_to.blocked_ids.indexOf(
																	Details.user_id
																) !== -1
															) {
																Details_to.blocked_by_me = true;
															} else {
																Details_to.blocked_by_me = false;
															}

															var result = {};
															result.blocked_by_me = Details_to.blocked_by_me;
															result.created_date = validatedData.created_date;
															result.from = 'me';
															result.from_id = validatedData.from_id;
															result.from_user = {
																first_name: Details.first_name,
																last_name: Details.last_name,
																profile_image_url: Details.profile_image_url,
															};
															result.like_count = 0;
															result.liked = false;
															result.liked_by = [];
															result.message_id = validatedData.message_id;
															result.message_image = validatedData.message_image
																? validatedData.message_image
																: '';
															result.message_status =
																validatedData.message_status;
															result.message_text = validatedData.message_text;
															result.to_id = validatedData.to_id;
															result._id = validatedData?._id;
															/**********************************/
															var socketId = socketUser
																? socketUser.socket
																: '';
															var emailMessage = `You got new message from ${Details.first_name} ${Details.last_name}`;

															var sendEmailVar = true;
															if (userDetails.isUnscribed) {
																if (userDetails.isUnscribed == 1) {
																	sendEmailVar = false;
																}
															}
															let email = {
																sendEmail: sendEmailVar,
																message: emailMessage,
																type: 'newMessage',
																toUser: {
																	user_id: userDetails.user_id,
																	first_name: userDetails.first_name,
																	last_name: userDetails.last_name,
																	email: userDetails.email,
																	user_name: userNameET,
																	socketId: socketId,
																},
																fromUser: {
																	user_id: Details.user_id,
																	first_name: Details.first_name,
																	last_name: Details.last_name,
																	email: Details.email,
																	user_name: userNameEF,
																},
															};
															// console.log('=== Add ===');
															// console.log(pushData);
															// userDetails.firebase_token = "fs4iycYXEkU:APA91bHtKvoobXV4qP_gibACJRxZNCcQ_dgm0HkT7AzWhDlVAXoIWWmsM3HMIXHX2SL7rVl35tM4YekC7hbaDTvEcfNtRtHfyrNe-OA2CPnbOKEBBQhYsOz2GQo5GbvupHaiQeMVFny0";
															// console.log(userDetails.firebase_token);
															// console.log(email);
															// console.log('===========');
															sendPush2(
																userDetails.firebase_token,
																'New Message',
																pushData,
																true,
																email
															);
															// sendPush(
															//     userDetails.firebase_token,
															//     "New Message",
															//     pushData,
															//     true,
															// );
															let finalResponse = {};
															finalResponse.status = true;
															finalResponse.data = result;
															cb(null, finalResponse);
														})
														.catch((err) => console.error(err));
												})
												.catch((err) => console.error(err));
										})
										.catch((err) => console.error(err));
								})
								.catch((err) => console.error(err));
							// let finalResponse = {};
							// finalResponse.status = true;
							// cb(null, finalResponse);
						}
					}
				);
			}
		}
	);
};

module.exports.getMessagesStatusByUserId = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let messageCollection = CONNECTION.collection(Model.collection_name);
	const message_id = Number(req.params.message_id);
	const currentLoggedInUser = req.authorization.user_id;
	messageCollection.findOne(
		{ from_id: currentLoggedInUser },
		{ message_id: message_id },
		function (err, messageDetails) {
			// console.log("MessageDatttttttttt",messageDetails)
			let finalResponse = {};
			finalResponse.status = true;
			finalResponse.data = messageDetails;
			cb(err, finalResponse);
		}
	);
};

module.exports.updateMessage = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let messageCollection = CONNECTION.collection(Model.collection_name);

	let newMessageData = utility.filterBody(req.body);
	// newMessageData.from_id = req.authorization.user_id;
	// newMessageData.to_id = Number(req.params.to_id);

	if (newMessageData === {}) {
		return cb({ error: 'invalid data' }, false);
	}
	var user_id = 0;
	if (req) {
		if (req.authorization) {
			if (req.authorization.user_id) {
				user_id = req.authorization.user_id;
			}
		}
	}
	let message_id = Number(req.params.message_id);

	utility.validatePostData(
		CONNECTION,
		newMessageData,
		Model,
		'update',
		message_id,
		function (err, validatedData) {
			if (err) {
				cb(err);
			} else {
				// console.log(validatedData);
				messageCollection.findOneAndUpdate(
					{ message_id: message_id },
					{ $set: validatedData },
					async function (err, response) {
						if (err) {
							cb(err);
						} else {
							let userCollection = CONNECTION.collection(
								userModel.collection_name
							);
							await userCollection
								.findOne({ user_id: response.value.from_id })
								.then(async (Details) => {
									await userCollection
										.findOne({ user_id: response.value.to_id })
										.then((Details_to) => {
											/*Blocked sender by receiver logic*/
											if (
												Details_to.blocked_ids &&
												Details_to.blocked_ids.indexOf(Details.user_id) !== -1
											) {
												Details_to.blocked_by_me = true;
											} else {
												Details_to.blocked_by_me = false;
											}
											messageCollection
												.aggregate([
													{
														$match: {
															message_status: { $ne: 'deleted' },
															message_id: response.value.message_id,
														},
													},
													{
														$lookup: {
															from: userModel.collection_name,
															localField: 'from_id',
															foreignField: 'user_id',
															as: 'fromUserDetails',
														},
													},
													likesLookup('message', user_id),
													likedByMeLookup(user_id),
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
																$arrayElemAt: [
																	'$fromUserDetails.first_name',
																	0,
																],
															},
															'from_user.last_name': {
																$arrayElemAt: ['$fromUserDetails.last_name', 0],
															},
															'from_user.user_name': {
																$ifNull: [
																	{
																		$arrayElemAt: [
																			'$fromUserDetails.user_name',
																			0,
																		],
																	},
																	'',
																],
															},
															'from_user.profile_image_url': {
																$arrayElemAt: [
																	'$fromUserDetails.profile_image_url',
																	0,
																],
															},
															from: {
																$cond: [
																	{ $eq: ['$from_id', user_id] },
																	'me',
																	'friend',
																],
															},
															message_reply_id: 1,
															message_reply_text: 1,
															like_count: { $ifNull: ['$like_count', 0] },
															liked: {
																$cond: [
																	{
																		$eq: [
																			{ $arrayElemAt: ['$liked.count', 0] },
																			1,
																		],
																	},
																	true,
																	false,
																],
															},
															liked_by: 1,
															updated_date: 1,
														},
													},
												])
												.toArray((err, messageList) => {
													messageList[0].blocked_by_me =
														Details_to.blocked_by_me;
													messageList[0].message_text =
														validatedData.message_text;
													messageList[0].updated_date =
														validatedData.updated_date;

													let finalResponse = {};
													finalResponse.status = true;
													finalResponse.data = messageList[0];
													cb(null, finalResponse);
												});
										});
								});
							// let finalResponse = {};
							// finalResponse.status = true;
							// cb(null, finalResponse);
						}
					}
				);
			}
		}
	);
};

module.exports.deleteMessage = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let messageCollection = CONNECTION.collection(Model.collection_name);

	let newMessageData = {
		message_status: 'deleted',
	};
	let message_id = Number(req.params.message_id);

	utility.validatePostData(
		CONNECTION,
		newMessageData,
		Model,
		'update',
		message_id,
		function (err, validatedData) {
			if (err) {
				cb(err);
			} else {
				// console.log(validatedData);
				messageCollection.findOneAndUpdate(
					{ message_id: message_id },
					{ $set: validatedData },
					async function (err, response) {
						if (err) {
							cb(err);
						} else {
							let finalResponse = {};
							finalResponse.status = true;
							finalResponse.data = response.value;
							cb(null, finalResponse);
						}
					}
				);
			}
		}
	);
};

module.exports.replyMessage = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let messageCollection = CONNECTION.collection(Model.collection_name);

	let newMessageData = utility.filterBody(req.body);
	newMessageData.from_id = req.authorization.user_id;
	newMessageData.to_id = Number(req.params.to_id);
	newMessageData.message_id = Number(req.params.message_id);

	// console.log(newMessageData);

	/* Find valide message */
	messageCollection.findOne(
		{
			message_id: newMessageData.message_id,
			message_status: { $ne: 'deleted' },
		},
		async function (err, response) {
			if (err) {
				cb(err);
			} else if (response) {
				newMessageData.message_type = 'replied';
				newMessageData.message_reply_id = response.message_id;
				newMessageData.message_reply_text = response.message_text;

				/* Validate data*/
				utility.validatePostData(
					CONNECTION,
					newMessageData,
					Model,
					'insert',
					0,
					function (err, validatedData) {
						if (err) {
							cb(err);
						} else {
							/* Inser message */
							messageCollection.insertOne(
								validatedData,
								async function (err, response) {
									if (err) {
										cb(err);
									} else {
										let userCollection = CONNECTION.collection(
											userModel.collection_name
										);
										await userCollection
											.findOne({ user_id: newMessageData.from_id })
											.then(async (Details) => {
												await userCollection
													.findOne({ user_id: newMessageData.to_id })
													.then((Details_to) => {
														/*Blocked sender by receiver logic*/
														if (
															Details_to.blocked_ids &&
															Details_to.blocked_ids.indexOf(
																Details.user_id
															) !== -1
														) {
															Details_to.blocked_by_me = true;
														} else {
															Details_to.blocked_by_me = false;
														}
														var result = {};
														result.blocked_by_me = Details_to.blocked_by_me;
														result.created_date = validatedData.created_date;
														result.from = 'me';
														result.from_id = validatedData.from_id;
														result.from_user = {
															first_name: Details.first_name,
															last_name: Details.last_name,
															profile_image_url: Details.profile_image_url,
														};
														result.like_count = 0;
														result.liked = false;
														result.liked_by = [];
														result.message_id = validatedData.message_id;
														result.message_image = validatedData.message_image
															? validatedData.message_image
															: '';
														result.message_status =
															validatedData.message_status;
														result.message_text = validatedData.message_text;
														result.to_id = validatedData.to_id;
														result._id = validatedData?._id;
														result.message_reply_id =
															validatedData.message_reply_id;
														result.message_reply_text =
															validatedData.message_reply_text;
														/**********************************/
														var userName =
															Details.first_name + ' ' + Details.last_name;
														if (Details.user_name && Details.user_name != '') {
															userName = Details.user_name;
														}
														let pushData = {
															status: 'New Message',
															title: 'New Message',
															body: `You got new message from ${userName}`,
															sound: 'default',
															mutable_content: true,
															content_available: true,
															data: {
																status: 'New Message',
																message: `You got new message from ${userName}`,
																notification_type: 'message',
																user_info: {
																	first_name: Details.first_name,
																	last_name: Details.last_name,
																	user_id: Details.user_id,
																	blocked_by_me: Details_to.blocked_by_me,
																	profile_image_url: `https://cdn.afrocamgist.com/${Details.profile_image_url}`,
																},
															},
														};
														userCollection
															.findOne({ user_id: newMessageData.to_id })
															.then((userDetails) => {
																var userNameET = '';
																var userNameEF = '';
																if (
																	userDetails.user_name &&
																	userDetails.user_name != ''
																) {
																	userNameET = userDetails.user_name;
																}
																if (
																	Details.user_name &&
																	Details.user_name != ''
																) {
																	userNameEF = Details.user_name;
																}
																var emailMessage = `You got new message from ${Details.first_name} ${Details.last_name}`;
																let email = {
																	sendEmail: true,
																	message: emailMessage,
																	post_id: notification_details?.post_id,
																	type: 'newMessage',
																	toUser: {
																		user_id: userDetails?.user_id,
																		first_name: userDetails?.first_name,
																		last_name: userDetails?.last_name,
																		email: userDetails?.email,
																		user_name: userNameET,
																	},
																	fromUser: {
																		user_id: Details?.user_id,
																		first_name: Details?.first_name,
																		last_name: Details?.last_name,
																		email: Details?.email,
																		user_name: userNameEF,
																	},
																};
																sendPush2(
																	userDetails?.firebase_token,
																	'New Message',
																	pushData,
																	true,
																	email
																);
																// sendPush(
																//     userDetails.firebase_token,
																//     "New Message",
																//     pushData,
																//     true,
																// );
															})
															.catch((err) => console.error(err));
														let finalResponse = {};
														finalResponse.status = true;
														finalResponse.data = result;
														cb(null, finalResponse);
													})
													.catch((err) => console.error(err));
											})
											.catch((err) => console.error(err));
										// let finalResponse = {};
										// finalResponse.status = true;
										// cb(null, finalResponse);
									}
								}
							);
						}
					}
				);
			} else {
				let err = {};
				err.status = true;
				err.message = 'Invalid message';
				cb(err);
			}
		}
	);
};

module.exports.deleteAllMessages = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let messageCollection = CONNECTION.collection(Model.collection_name);

	// let messageDataStatus = {
	//     "message_status": "deleted"
	// }
	let from_id = Number(req.authorization.user_id);
	let to_id = Number(req.body.to_id);
	var addToDelete = {
		delete_by: from_id,
	};
	if (req.body.delete_for) {
		if (req.body.delete_for == 2) {
			addToDelete = {
				delete_by: { $each: [from_id, to_id] },
			};
		}
	}

	messageCollection.updateMany(
		{
			$or: [
				{ from_id: from_id, to_id: to_id, message_status: { $ne: 'deleted' } },
				{ from_id: to_id, to_id: from_id, message_status: { $ne: 'deleted' } },
			],
		},
		{ $addToSet: addToDelete },
		{ returnOriginal: false },
		async function (err, response) {
			if (err) {
				cb(err);
			} else {
				// console.log("===");
				// console.log(response);
				// console.log("===");

				let finalResponse = {};
				finalResponse.status = true;
				finalResponse.data = response.value;
				cb(null, finalResponse);
			}
		}
	);
};

module.exports.archiveMessages = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let messageCollection = CONNECTION.collection(Model.collection_name);

	let from_id = Number(req.authorization.user_id);
	let to_id = req.body.to_id;

	let addToArchive = {
		archive_by: from_id,
	};

	messageCollection.updateMany(
		{
			$or: [
				{ from_id: from_id, to_id: { $in: to_id } },
				{ from_id: { $in: to_id }, to_id: from_id },
			],
		},
		{ $addToSet: addToArchive },
		{ returnOriginal: false },
		async function (err, response) {
			if (err) {
				cb(err);
			} else {
				let finalResponse = {};
				finalResponse.status = true;
				finalResponse.data = response.value;
				cb(null, finalResponse);
			}
		}
	);
};

module.exports.archiveUsers = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(userCollectionName);

	let from_id = Number(req.authorization.user_id);
	let to_id = req.body.to_id;

	if (req.body.to_id) {
		req.body.to_id.forEach((toId, index) => {
			req.body.to_id[index] = Number(toId);
		});
	}

	let addToArchive = {
		archived_users: { $each: to_id },
	};

	userCollection.findOneAndUpdate(
		{ user_id: from_id },
		{ $addToSet: addToArchive },
		{ returnOriginal: false },
		async function (err, response) {
			if (err) {
				cb(err);
			} else {
				let finalResponse = {};
				finalResponse.status = true;
				finalResponse.data = response.value;
				cb(null, finalResponse);
			}
		}
	);
};

module.exports.removeArchiveMessages = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let messageCollection = CONNECTION.collection(Model.collection_name);

	let from_id = Number(req.authorization.user_id);
	let to_id = req.body.to_id;

	let addToArchive = {
		archive_by: from_id,
	};

	messageCollection.updateMany(
		{
			$or: [
				{ from_id: from_id, to_id: { $in: to_id } },
				{ from_id: { $in: to_id }, to_id: from_id },
			],
		},
		{ $pull: addToArchive },
		{ returnOriginal: false },
		async function (err, response) {
			if (err) {
				cb(err);
			} else {
				let finalResponse = {};
				finalResponse.status = true;
				finalResponse.data = response.value;
				cb(null, finalResponse);
			}
		}
	);
};

module.exports.removeArchiveUsers = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(userCollectionName);

	let from_id = Number(req.authorization.user_id);
	let to_id = req.body.to_id;

	if (req.body.to_id) {
		req.body.to_id.forEach((toId, index) => {
			req.body.to_id[index] = Number(toId);
		});
	}

	let addToArchive = {
		archived_users: { $in: to_id },
	};

	userCollection.findOneAndUpdate(
		{ user_id: from_id },
		{ $pull: addToArchive },
		{ returnOriginal: false },
		async function (err, response) {
			if (err) {
				cb(err);
			} else {
				let finalResponse = {};
				finalResponse.status = true;
				finalResponse.data = response.value;
				cb(null, finalResponse);
			}
		}
	);
};

module.exports.deleteUserfromMessageList = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(userCollectionName);

	let from_id = Number(req.authorization.user_id);
	let to_id = req.body.to_id;

	if (req.body.to_id) {
		req.body.to_id.forEach((toId, index) => {
			req.body.to_id[index] = Number(toId);
		});
	}

	let addToArchive = {
		delmsglist_users: { $each: to_id },
	};

	userCollection.findOneAndUpdate(
		{ user_id: from_id },
		{ $addToSet: addToArchive },
		{ returnOriginal: false },
		async function (err, response) {
			if (err) {
				cb(err);
			} else {
				let finalResponse = {};
				finalResponse.status = true;
				finalResponse.data = response.value;
				cb(null, finalResponse);
			}
		}
	);
};

module.exports.getMessagesListSocket = function (CLIENT, req, res, cb) {
	console.log(req.query)
	// process.exit(1)
	let CONNECTION = CLIENT.db(utility.dbName);
	let messageCollection = CONNECTION.collection(Model.collection_name);
	let userCollection = CONNECTION.collection(userModel.collection_name);
	let currentUserId = req.authorization.user_id;
	console.log(req.body);
	userCollection.findOne(
		{ user_id: currentUserId },
		function (err, userDetails) {
			let friendIds = userDetails?.friend_ids || [];
			if (!userDetails.following_ids) {
				userDetails.following_ids = [];
			}
			if (!userDetails.follower_ids) {
				userDetails.follower_ids = [];
			}

			friendIds.push(...userDetails.following_ids);
			friendIds.push(...userDetails.follower_ids);

			var type = 'listAll';
			if (req.body) {
				type = req.body.type || 'listAll';
			}
			// console.log("type: ", type);

			messageCollection
				.aggregate([
					{
						$match: {
							$or: [{ from_id: currentUserId }, { to_id: currentUserId }],
							archive_by: { $ne: currentUserId },
							delete_by: { $ne: currentUserId },
							message_status: { $ne: 'deleted' },
						},
					},
					{
						$group: {
							_id: null,
							to_ids: { $addToSet: '$to_id' },
							from_ids: { $addToSet: '$from_id' },
						},
					},
					{
						$project: {
							user_ids: {
								$filter: {
									input: { $setUnion: ['$to_ids', '$from_ids'] },
									as: 'item',
									cond: { $ne: ['$$item', currentUserId] },
								},
							},
						},
					},
				])
				.toArray(async (err, messageUserList) => {
					if (messageUserList && messageUserList.length > 0) {
						if (messageUserList[0].user_ids) {
							friendIds.push(...messageUserList[0].user_ids);
						}
					}
					if (userDetails.archived_users) {
						if (type == 'listAll') {
							friendIds = friendIds.filter(function (el) {
								return userDetails.archived_users.indexOf(el) < 0;
							});
						} else if (type == 'archivedAll') {
							friendIds = friendIds.filter(function (el) {
								return userDetails.archived_users.indexOf(el) >= 0;
							});
						}
					} else {
						if (type == 'archivedAll') {
							friendIds = {};
						}
					}

					try {
						if (userDetails.delmsglist_users) {
							friendIds = friendIds.filter(function (el) {
								return userDetails.delmsglist_users.indexOf(el) < 0;
							});
						}
					} catch (e) {
						console.log('Friends Error: ', e);
					}
					let perPage = req?.query?.limit,
						page = req?.query?.page;
					const totalCount = await userCollection
						.find({ user_id: { $in: friendIds }, status: 'active' })
						.count();
					userCollection
						.aggregate([
							{
								$match: {
									user_id: { $in: friendIds },
									status: 'active',
								},
							},
							{
								$project: {
									first_name: 1,
									last_name: 1,
									user_name: { $ifNull: ['$user_name', ''] },
									user_id: 1,
									profile_image_url: 1,
									last_active: 1,
									blocked_ids: 1,
								},
							},
							{
								$lookup: {
									from: socketCollectionName,
									let: {
										userId: '$user_id',
									},
									pipeline: [
										{
											$match: {
												$expr: {
													$eq: ['$user_id', '$$userId'],
												},
											},
										},
										{
											$project: {
												user_id: 1,
												status: 1,
											},
										},
									],
									as: 'SocketUser',
								},
							},
							{
								$lookup: {
									from: Model.collection_name,
									let: {
										userId: '$user_id',
									},
									pipeline: [
										{
											$match: {
												$expr: {
													$or: [
														{
															$and: [
																{ $eq: ['$to_id', currentUserId] },
																{ $eq: ['$from_id', '$$userId'] },
															],
														},
														{
															$and: [
																{ $eq: ['$to_id', '$$userId'] },
																{ $eq: ['$from_id', currentUserId] },
															],
														},
													],
												},
												archive_by: { $ne: currentUserId },
												delete_by: { $ne: currentUserId },
												message_status: { $ne: 'deleted' },
											},
										},
										{
											$sort: {
												created_date: -1,
											},
										},
										{
											$group: {
												_id: null,
												last_message: { $first: '$message_text' },
												last_message_image: { $first: '$message_image' },
												last_message_time: { $first: '$created_date' },
												unread_count: {
													$sum: {
														$cond: [
															{
																$and: [
																	{ $eq: ['$message_status', 'unread'] },
																	{ $eq: ['$to_id', currentUserId] },
																],
															},
															1,
															0,
														],
													},
												},
											},
										},
									],
									as: 'messages',
								},
							},
							{
								$project: {
									first_name: 1,
									last_name: 1,
									user_name: { $ifNull: ['$user_name', ''] },
									profile_image_url: 1,
									user_id: 1,
									last_active: 1,
									last_message: { $arrayElemAt: ['$messages.last_message', 0] },
									last_message_image: {
										$arrayElemAt: ['$messages.last_message_image', 0],
									},
									last_message_time: {
										$arrayElemAt: ['$messages.last_message_time', 0],
									},
									unread_count: { $arrayElemAt: ['$messages.unread_count', 0] },
									blocked_ids: 1,
									SocketUser_user_id: {
										$arrayElemAt: ['$SocketUser.user_id', 0],
									},
									SocketUser_status: {
										$arrayElemAt: ['$SocketUser.status', 0],
									},
								},
							},
							{
								$sort: {
									last_message_time: -1,
								},
							},
							//   { $skip: perPage * page },
							//   { $limit: 10 },
						])
						.skip(page ? Number(perPage * page) : 0)
						.limit(perPage ? Number(perPage) : totalCount)
						.toArray((err, messagesList) => {
							console.log(perPage ? Number(perPage) : totalCount, page ? Number(perPage * page) : 0, req.query)
							// process.exit(0)
							if (messagesList) {
								messagesList.forEach((friend, MLindex) => {
									if (
										friend.blocked_ids &&
										friend.blocked_ids.indexOf(userDetails.user_id) !== -1
									) {
										messagesList.splice(MLindex, 1);
									}
									if (
										userDetails.blocked_ids &&
										userDetails.blocked_ids.indexOf(friend.user_id) !== -1
									) {
										friend.blocked_by_me = true;
									} else {
										friend.blocked_by_me = false;
									}
									// console.log("MLindex: ", MLindex);
									// console.log("friend: ", friend);
									if (messagesList[MLindex]) {
										messagesList[MLindex].online_status = false;
										if (
											friend.SocketUser_status &&
											friend.SocketUser_status == 'active'
										) {
											messagesList[MLindex].online_status = true;
										}
									}
								});
							} else {
								messagesList = [];
							}
							let finalResponse = {};
							finalResponse.status = true;
							finalResponse.data = messagesList;
							finalResponse.page = Number(page ?? 1);
							finalResponse.count = totalCount;
							finalResponse.pages = Math.ceil(totalCount / perPage);
							cb(null, finalResponse);
						});
				});
			// });
		}
	);
};
module.exports.deleteSelectedMessages = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let messageCollection = CONNECTION.collection(Model.collection_name);

	let from_id = Number(req.authorization.user_id);
	let to_id = Number(req.body.to_id);
	var addToDelete = {
		delete_by: from_id,
	};
	if (req.body.delete_for) {
		if (req.body.delete_for == 2) {
			addToDelete = {
				delete_by: { $each: [from_id, to_id] },
			};
		}
	}

	messageCollection.updateMany(
		{
			$or: [
				{
					from_id: from_id,
					to_id: to_id,
					message_status: { $ne: 'deleted' },
					message_id: { $in: req.body.message_ids },
				},
				/* ,
			{ "from_id" : to_id, "to_id" : from_id } */
			],
		},
		{ $addToSet: addToDelete },
		{ returnOriginal: false },
		async function (err, response) {
			if (err) {
				cb(err);
			} else {
				// console.log("===");
				// console.log(response);
				// console.log("===");

				let finalResponse = {};
				finalResponse.status = true;
				finalResponse.data = response.value;
				cb(null, finalResponse);
			}
		}
	);
};

module.exports.socketCollectionName = socketCollectionName;
module.exports.likesLookup = likesLookup;
module.exports.likedByMeLookup = likedByMeLookup;
module.exports.userCollectionName = userCollectionName;
