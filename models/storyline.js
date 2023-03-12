'use strict';
const Model = require('./storyline.json');
let utility = require('../utilities');
const SITE_CONFIG = require('../configs/siteConfig');
// const NOTIFICATION = require('./notification.js');
const request = require('request');
const { sendPush, sendPush2 } = require('../_helpers/push-notification');

const USER_MODEL = require('./user.json');
const { forEach } = require('async');
// const { delete } = require('request');
let userCollectionName = USER_MODEL.collection_name;

const LIKE_MODEL = require('./likes.json');
let likeCollectionName = LIKE_MODEL.collection_name;

const FRIEND_REQUEST_MODEL = require('./friend_request.json');
let friendRequestCollectionName = FRIEND_REQUEST_MODEL.collection_name;

const COMMENT_MODEL = require('./post_comment.json');
let commentCollectionName = COMMENT_MODEL.collection_name;

module.exports.getStoryline = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let storyCollection = CONNECTION.collection(Model.collection_name);

	storyCollection
		.aggregate([
			{ $match: { post_status: 'active' } },
			{ $sort: { story_id: -1 } },
			getComments(1000, req.authorization.user_id),
			getRequestedUsers(1000, req.authorization.user_id),
			postedByUserLookupFunc(req.authorization.user_id),
			likedByMeLookup(req.authorization.user_id),
			postProjection,
		])
		.toArray((err, stories) => {
			if (err) {
				cb(err);
			} else {
				var resStories = [];
				stories.forEach((story) => {
					if (resStories[story.posted_by]) {
						/*****/
						var curUser = req.authorization.user_id;
						let followButton = {};
						if (curUser != story.user_id) {
							if (story.following) {
								followButton = {
									button_text: 'Following',
									button_link: '#',
									button_type: 'warning',
								};
							} else {
								if (story.requestedUser) {
									followButton = {
										button_text: 'Requested',
										button_link: '#',
										button_type: 'warning',
									};
								} else {
									followButton = {
										button_text: story.private === true ? 'Request' : 'Follow',
										button_link: '/profile/' + story.user_id + '/follow',
										button_type: 'success',
									};
								}
							}
						}
						story.request_buttons = [followButton];
						/*****/
						resStories[story.posted_by].unshift(story);
					} else {
						/*****/
						var curUser = req.authorization.user_id;
						let followButton = {};
						if (curUser != story.user_id) {
							if (story.following) {
								followButton = {
									button_text: 'Following',
									button_link: '#',
									button_type: 'warning',
								};
							} else {
								if (story.requestedUser) {
									followButton = {
										button_text: 'Requested',
										button_link: '#',
										button_type: 'warning',
									};
								} else {
									followButton = {
										button_text: story.private === true ? 'Request' : 'Follow',
										button_link: '/profile/' + story.user_id + '/follow',
										button_type: 'success',
									};
								}
							}
						}
						story.request_buttons = [followButton];
						/*****/
						resStories[story.posted_by] = [story];
					}
				});
				var resStoriesF = resStories.filter(function (el) {
					return el != null;
				});
				let finalResponse = {};
				finalResponse.status = true;
				finalResponse.data = resStoriesF;
				cb(null, finalResponse);
			}
		});
};

const postProjection = {
	$project: {
		story_text: 1,
		story_image: 1,
		story_video: 1,
		thumbnail: 1,
		posted_by: 1,
		story_type: 1,
		post_date: 1,
		story_id: 1,
		like_count: 1,
		comment_count: 1,
		comments: 1,
		post_location: 1,
		post_lat_long: 1,
		seen_by: 1,
		// is_seen:1,
		bg_image_post: 1,
		bg_map_post: 1,
		bg_image: 1,
		liked: {
			$cond: [{ $eq: [{ $arrayElemAt: ['$liked.count', 0] }, 1] }, true, false],
		},
		first_name: { $arrayElemAt: ['$userDetails.first_name', 0] },
		last_name: { $arrayElemAt: ['$userDetails.last_name', 0] },
		user_id: { $arrayElemAt: ['$userDetails.user_id', 0] },
		user_name: { $arrayElemAt: ['$userDetails.user_name', 0] },
		private: { $arrayElemAt: ['$userDetails.private', 0] },
		profile_image_url: { $arrayElemAt: ['$userDetails.profile_image_url', 0] },
		following: { $arrayElemAt: ['$userDetails.following', 0] },
		enable_follow: { $arrayElemAt: ['$userDetails.enable_follow', 0] },
		requestedUser: {
			$cond: [
				{ $gt: [{ $arrayElemAt: ['$requestedUsers.count', 0] }, 0] },
				true,
				false,
			],
		},
		post_view_count: 1,
	},
};

const postedByUserLookupFunc = (currentUser) => {
	return {
		$lookup: {
			from: userCollectionName,
			let: {
				postedBy: '$posted_by',
			},
			pipeline: [
				{
					$match: {
						$expr: {
							$eq: ['$user_id', '$$postedBy'],
						},
					},
				},
				{
					$project: {
						first_name: 1,
						last_name: 1,
						user_id: 1,
						user_name: 1,
						profile_image_url: 1,
						private: 1,
						following: {
							$cond: [
								{ $in: [currentUser, { $ifNull: ['$follower_ids', []] }] },
								true,
								false,
							],
						},
						enable_follow: {
							$cond: [{ $eq: [currentUser, '$user_id'] }, false, true],
						},
					},
				},
			],
			as: 'userDetails',
		},
	};
};

const getRequestedUsers = function (limit = 3, userId) {
	return {
		$lookup: {
			from: friendRequestCollectionName,
			let: {
				requestedFrom: userId,
				requestedTo: '$posted_by',
			},
			pipeline: [
				{
					$match: {
						$expr: {
							$eq: ['$requested_by', '$$requestedFrom'],
						},
					},
				},
				{
					$match: {
						$expr: {
							$eq: ['$requested_to', '$$requestedTo'],
						},
					},
				},
				{
					$match: {
						$expr: {
							$eq: ['$request_status', 'sent'],
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
			as: 'requestedUsers',
		},
	};
};

const getComments = function (limit = 3, userId) {
	return {
		$lookup: {
			from: commentCollectionName,
			let: {
				storyId: '$story_id',
			},
			pipeline: [
				{
					$match: {
						$expr: {
							$eq: ['$story_id', '$$storyId'],
						},
					},
				},
				{
					$match: {
						$expr: {
							$eq: ['$comment_status', 'active'],
						},
					},
				},
				{
					$match: {
						$expr: {
							$eq: ['$comment_parent_id', 0],
						},
					},
				},
				{
					$sort: {
						comment_date: -1,
					},
				},
				{
					$limit: limit,
				},
				{
					$lookup: {
						from: userCollectionName,
						localField: 'commented_by',
						foreignField: 'user_id',
						as: 'userDetails',
					},
				},
				getSubComments(1000, userId),
				commentLikedByMeLookup(userId),
				getCommentLikesLookup(userId),
				{
					$project: {
						comment_id: 1,
						story_id: 1,
						comment_parent_id: 1,
						comment_text: 1,
						comment_date: 1,
						my_comment: {
							$cond: [{ $eq: ['$commented_by', userId] }, true, false],
						},
						'commented_by.first_name': {
							$arrayElemAt: ['$userDetails.first_name', 0],
						},
						'commented_by.last_name': {
							$arrayElemAt: ['$userDetails.last_name', 0],
						},
						'commented_by.profile_image_url': {
							$arrayElemAt: ['$userDetails.profile_image_url', 0],
						},
						'commented_by.user_id': {
							$arrayElemAt: ['$userDetails.user_id', 0],
						},
						'commented_by.user_name': {
							$arrayElemAt: ['$userDetails.user_name', 0],
						},
						sub_comments: 1,
						liked: {
							$cond: [
								{ $eq: [{ $arrayElemAt: ['$liked.count', 0] }, 1] },
								true,
								false,
							],
						},
						comment_likes: {
							$cond: [
								{
									$gt: [{ $arrayElemAt: ['$comment_likes_count.count', 0] }, 0],
								},
								{ $arrayElemAt: ['$comment_likes_count.count', 0] },
								0,
							],
						},
					},
				},
			],
			as: 'comments',
		},
	};
};

const getSubComments = function (limit = 1, userId) {
	return {
		$lookup: {
			from: commentCollectionName,
			let: {
				commentParentId: '$comment_id',
			},
			pipeline: [
				{
					$match: {
						$expr: {
							$eq: ['$comment_parent_id', '$$commentParentId'],
						},
					},
				},
				{
					$match: {
						$expr: {
							$eq: ['$comment_status', 'active'],
						},
					},
				},
				{
					$sort: {
						comment_date: -1,
					},
				},
				{
					$limit: limit,
				},
				{
					$lookup: {
						from: userCollectionName,
						localField: 'commented_by',
						foreignField: 'user_id',
						as: 'userDetails',
					},
				},
				commentLikedByMeLookup(userId),
				getCommentLikesLookup(userId),
				{
					$project: {
						comment_id: 1,
						comment_parent_id: 1,
						post_id: 1,
						comment_text: 1,
						comment_date: 1,
						my_comment: {
							$cond: [{ $eq: ['$commented_by', userId] }, true, false],
						},
						'commented_by.first_name': {
							$arrayElemAt: ['$userDetails.first_name', 0],
						},
						'commented_by.last_name': {
							$arrayElemAt: ['$userDetails.last_name', 0],
						},
						'commented_by.profile_image_url': {
							$arrayElemAt: ['$userDetails.profile_image_url', 0],
						},
						'commented_by.user_id': {
							$arrayElemAt: ['$userDetails.user_id', 0],
						},
						'commented_by.user_name': {
							$arrayElemAt: ['$userDetails.user_name', 0],
						},
						liked: {
							$cond: [
								{ $eq: [{ $arrayElemAt: ['$liked.count', 0] }, 1] },
								true,
								false,
							],
						},
						comment_likes: {
							$cond: [
								{
									$gt: [{ $arrayElemAt: ['$comment_likes_count.count', 0] }, 0],
								},
								{ $arrayElemAt: ['$comment_likes_count.count', 0] },
								0,
							],
						},
					},
				},
			],
			as: 'sub_comments',
		},
	};
};

const likedByMeLookup = (currentUserId) => {
	// console.log("currentUserId: ");
	// console.log(currentUserId);
	return {
		$lookup: {
			from: likeCollectionName,
			let: {
				storyId: '$story_id',
			},
			pipeline: [
				{
					$match: {
						$expr: {
							$eq: ['$story_id', '$$storyId'],
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

const commentLikedByMeLookup = (currentUserId) => {
	return {
		$lookup: {
			from: likeCollectionName,
			let: {
				commentId: '$comment_id',
			},
			pipeline: [
				{
					$match: {
						$expr: {
							$eq: ['$comment_id', '$$commentId'],
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

const getCommentLikesLookup = (currentUserId) => {
	return {
		$lookup: {
			from: likeCollectionName,
			let: {
				commentId: '$comment_id',
			},
			pipeline: [
				{
					$match: {
						$expr: {
							$eq: ['$comment_id', '$$commentId'],
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
			as: 'comment_likes_count',
		},
	};
};

module.exports.createStoryline = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let storyCollection = CONNECTION.collection(Model.collection_name);

	let newPostData = req.body;
	if (newPostData.share_post_id) {
		newPostData.share_post_id = parseInt(newPostData.share_post_id);
	}
	newPostData.posted_by = req.authorization.user_id;
	getAddressFromLatLong(newPostData.post_lat_long, async (locationName) => {
		newPostData.post_location = locationName;
		// var newPostData2 = [];
		var counter = 0;
		if (
			newPostData.story_type &&
			newPostData.story_type == 'image' &&
			newPostData.story_image.length > 1
		) {
			for (var i = 0; i < newPostData.story_image.length; i++) {
				await getProperty(req.body, i, async function (newPostData2) {
					await utility.validatePostData(
						CONNECTION,
						newPostData2,
						Model,
						'insert',
						0,
						async function (err, validatedData) {
							if (err) {
								cb(err);
							} else {
								await storyCollection.insertOne(
									validatedData,
									async function (err, response) {
										if (err) {
											cb(err);
										} else {
											counter++;
											if (i == counter) {
												/* Get followers and send notification */
												const userCollection =
													CONNECTION.collection(userCollectionName);
												let notification_type = 'Promo';
												await userCollection
													.findOne({ user_id: req.authorization.user_id })
													.then((Details) => {
														var notify_users = Details.follower_ids;
														let pushData = {
															status: 'Story created By User',
															title: 'Story created By User',
															body: `${Details.first_name} ${Details.last_name} has created a new story`,
															sound: 'default',
															mutable_content: true,
															content_available: true,
															data: {
																status: 'Story created By User',
																message: `${Details.first_name} ${Details.last_name} has created a new story`,
																notification_type: notification_type,
																// validatedData
																// story_id: response.ops[0].story_id,
																story_id: validatedData.story_id,
															},
														};

														notify_users.forEach((user) => {
															userCollection
																.findOne({ user_id: user })
																.then((userDetails) => {
																	var userNameET = '';
																	var userNameEF = '';
																	if (userDetails.user_name) {
																		userNameET = userDetails.user_name;
																	}
																	if (Details.user_name) {
																		userNameEF = Details.user_name;
																	}
																	var sendEmailVar = true;
																	if (userDetails.isUnscribed) {
																		if (userDetails.isUnscribed == 1) {
																			sendEmailVar = false;
																		}
																	}
																	let email = {
																		sendEmail: sendEmailVar,
																		type: 'newStory',
																		toUser: {
																			user_id: userDetails.user_id,
																			first_name: userDetails.first_name,
																			last_name: userDetails.last_name,
																			email: userDetails.email,
																			user_name: userNameET,
																		},
																		fromUser: {
																			user_id: Details.user_id,
																			first_name: Details.first_name,
																			last_name: Details.last_name,
																			email: Details.email,
																			user_name: userNameEF,
																		},
																	};
																	sendPush2(
																		userDetails.firebase_token,
																		'Tagged By User',
																		pushData,
																		true,
																		email
																	);

																	// sendPush(
																	//   userDetails.firebase_token,
																	//   "Tagged By User",
																	//   pushData,
																	//   true,
																	// );
																})
																.catch((err) => console.error(err));
														});
													})
													.catch((err) => console.error(err));
												/* *********************************** */
												let finalResponse = {};
												finalResponse.status = true;
												cb(null, finalResponse);
											}
										}
									}
								);
							}
						}
					);
				});
			}
			console.log('Done');
		} else {
			utility.validatePostData(
				CONNECTION,
				newPostData,
				Model,
				'insert',
				0,
				async function (err, validatedData) {
					if (err) {
						cb(err);
					} else {
						console.log(validatedData);
						storyCollection.insertOne(
							validatedData,
							async function (err, response) {
								if (err) {
									cb(err);
								} else {
									/* Get followers and send notification */
									const userCollection =
										CONNECTION.collection(userCollectionName);
									let notification_type = 'Promo';
									await userCollection
										.findOne({ user_id: req.authorization.user_id })
										.then((Details) => {
											var notify_users = Details.follower_ids;
											let pushData = {
												status: 'Story created By User',
												title: 'Story created By User',
												body: `${Details.first_name} ${Details.last_name} has created a new story`,
												sound: 'default',
												mutable_content: true,
												content_available: true,
												data: {
													status: 'Story created By User',
													message: `${Details.first_name} ${Details.last_name} has created a new story`,
													notification_type: notification_type,
													story_id: response.insertedId,
												},
											};
											console.log(pushData);
											notify_users.forEach((user) => {
												userCollection
													.findOne({ user_id: user })
													.then((userDetails) => {
														var userNameET = '';
														var userNameEF = '';
														if (userDetails.user_name) {
															userNameET = userDetails.user_name;
														}
														if (Details.user_name) {
															userNameEF = Details.user_name;
														}
														var sendEmailVar = true;
														if (userDetails.isUnscribed) {
															if (userDetails.isUnscribed == 1) {
																sendEmailVar = false;
															}
														}
														let email = {
															sendEmail: sendEmailVar,
															type: 'newStory',
															toUser: {
																user_id: userDetails.user_id,
																first_name: userDetails.first_name,
																last_name: userDetails.last_name,
																email: userDetails.email,
																user_name: userNameET,
															},
															fromUser: {
																user_id: Details.user_id,
																first_name: Details.first_name,
																last_name: Details.last_name,
																email: Details.email,
																user_name: userNameEF,
															},
														};
														sendPush2(
															userDetails.firebase_token,
															'Tagged By User',
															pushData,
															true,
															email
														);
														// sendPush(
														//   userDetails.firebase_token,
														//   "Tagged By User",
														//   pushData,
														//   true,
														// );
													})
													.catch((err) => console.error(err));
											});
										})
										.catch((err) => console.error(err));
									/* *********************************** */
									let finalResponse = {};
									finalResponse.status = true;
									cb(null, finalResponse);
								}
							}
						);
					}
				}
			);
		}
	});
};

module.exports.updateStorylineView = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let storyCollection = CONNECTION.collection(Model.collection_name);
	let story_id = Number(req.params.story_id);
	let user_id = Number(req.params.user_id);

	storyCollection.findOneAndUpdate(
		{ story_id: story_id },
		{ $addToSet: { seen_by: user_id } },
		(err, updated) => {
			if (err) {
				cb(err);
			}
			if (updated.value.seen_by.includes(user_id)) {
				console.log('Yes');
				var curView = parseInt(updated.value.seen_by.length);
			} else {
				console.log('No');
				var curView = parseInt(updated.value.seen_by.length) + 1;
			}
			storyCollection.findOneAndUpdate(
				{ story_id: story_id },
				{ $set: { post_view_count: curView } },
				(err, updated1) => {
					if (err) {
						cb(err);
					}
					let finalResponse = {};
					finalResponse.status = true;
					// finalResponse.data = updated.value.seen_by.length;
					cb(err, finalResponse);
				}
			);
		}
	);
};

const getProperty = (body, i, cb) => {
	var newPostData2 = {};
	for (var property in body) {
		if (property == 'story_image') {
			newPostData2[property] = [];
			newPostData2[property].push(body[property][i]);
		} else {
			newPostData2[property] = body[property];
		}
	}
	cb(newPostData2);
};

const getAddressFromLatLong = (latLong, cb) => {
	const latLongRe = /^\d*\.\d*,\d*\.\d*$/;
	if (!latLong || !latLongRe.test(latLong)) {
		return cb('Unknown Location');
	}
	request.get(
		`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latLong}&key=${SITE_CONFIG.googleAPIKey}`,
		(error, response, body) => {
			if (!error && response.statusCode == 200) {
				const info = JSON.parse(body);
				const locationArr = [];
				const countryIndex = info.results[0].address_components.findIndex((x) =>
					x.types.includes('country')
				);
				if (countryIndex !== -1) {
					locationArr.push(
						info.results[0].address_components[countryIndex].long_name
					);
				}

				const areaLevel1Index = info.results[0].address_components.findIndex(
					(x) => x.types.includes('administrative_area_level_1')
				);
				if (areaLevel1Index !== -1) {
					locationArr.unshift(
						info.results[0].address_components[areaLevel1Index].long_name
					);
				}

				const townIndex = info.results[0].address_components.findIndex((x) =>
					x.types.includes('postal_town')
				);
				if (townIndex !== -1) {
					locationArr.unshift(
						info.results[0].address_components[townIndex].long_name
					);
				} else {
					const areaLevel2Index = info.results[0].address_components.findIndex(
						(x) => x.types.includes('administrative_area_level_2')
					);
					if (areaLevel2Index !== -1) {
						locationArr.unshift(
							info.results[0].address_components[areaLevel2Index].long_name
						);
					}
				}

				console.log(locationArr);
				return cb(locationArr.join(', '));
			} else {
				return cb('Unknown Location');
			}
		}
	);
};

module.exports.editStoryline = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let storyCollection = CONNECTION.collection(Model.collection_name);
	let story_id = Number(req.params.story_id);
	let body = utility.filterBody(req.body);
	if (body === {}) {
		return cb({ error: 'invalid data' }, false);
	}
	utility.validatePostData(
		CONNECTION,
		body,
		Model,
		'update',
		story_id,
		function (err, validatedData) {
			if (err) {
				cb(err);
			} else {
				storyCollection.findOneAndUpdate(
					{
						story_id: story_id,
						posted_by: req.authorization.user_id,
					},
					{ $set: validatedData },
					function (err, response) {
						if (err) {
							cb(err);
						} else {
							let finalResponse = {};
							finalResponse.status = true;
							cb(null, finalResponse);
						}
					}
				);
			}
		}
	);
};

module.exports.deleteStoryline = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let storylineCollection = CONNECTION.collection(Model.collection_name);
	let story_id = Number(req.params.story_id);
	storylineCollection.findOne({ story_id: story_id }, (err, postData) => {
		storylineCollection.deleteOne(
			{ story_id: story_id, posted_by: req.authorization.user_id },
			function (err, response) {
				if (err) {
					cb(err);
				} else {
					let finalResponse = {};
					finalResponse.status = true;
					cb(null, finalResponse);
				}
			}
		);
	});
};
