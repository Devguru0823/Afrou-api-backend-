'use strict';
const FRIEND_REQUEST_MODEL = require('./friend_request.json');
const USER_MODEL = require('./user.json');
const POST_MODEL = require('./post.json');
const FOLLOW_REQ = require('./friend_request.json');
let utility = require('../utilities');
const moment = require('moment');
const bcrypt = require('bcryptjs');
const messages = require('./message');
const CyptoJs = require('crypto-js');

/**
 * FRIEND LIst
 * @param CLIENT
 * @param req
 * @param res
 * @param callback
 */
module.exports.getFriendList = function (CLIENT, req, res, callback) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(USER_MODEL.collection_name);
	userCollection
		.aggregate([
			{
				$match: {
					user_id: req.authorization.user_id,
				},
			},
			{
				$lookup: {
					from: USER_MODEL.collection_name,
					localField: 'friend_ids',
					foreignField: 'user_id',
					as: 'friends',
				},
			},
			{
				$unwind: {
					path: '$friends',
					preserveNullAndEmptyArrays: false,
				},
			},
			{
				$match: {
					'friends.status': 'active',
				},
			},
			{
				$group: {
					_id: '$_id',
					following_ids: { $first: '$following_ids' },
					friends: { $push: '$friends' },
				},
			},
			{
				$project: {
					_id: 0,
					'friends.password': 0,
					'friends.friend_ids': 0,
					'friends.created_date': 0,
					'friends.status': 0,
					'friends.email': 0,
					'friends._id': 0,
					'followers.last_login_ip': 0,
				},
			},
		])
		.toArray((err, friendsArr) => {
			if (err) {
				callback(err);
			} else {
				let friends = [];
				if (friendsArr && friendsArr.length > 0) {
					friends = friendsArr[0].friends;
				}
				if (friendsArr && friendsArr.length > 0) {
					const myFollowings = friendsArr[0].following_ids || [];
					friends.forEach((friend) => {
						const unfriendButton = {
							button_text: 'Undo',
							button_link: '/profile/' + friend.user_id + '/cancel-friend',
							button_type: 'danger',
						};
						// let followUnfollowButton = {};
						// if (myFollowings.indexOf(friend.user_id) !== -1) {
						//     // Already Following
						//     followUnfollowButton = {
						//         button_text: 'Unfollow',
						//         button_link: '/profile/' + friend.user_id + '/cancel-follow',
						//         button_type: 'warning'
						//     };
						// } else {
						//     // Not following
						//     followUnfollowButton = {
						//         button_text: 'Follow',
						//         button_link: '/profile/' + friend.user_id + '/follow',
						//         button_type: 'success'
						//     };
						// }
						friend.request_buttons = [unfriendButton];
					});
				}

				let finalResponse = {};
				finalResponse.status = true;
				finalResponse.data = friends;
				callback(null, finalResponse);
			}
		});
};

/**
 * FOLLOWING LIST
 * @param CLIENT
 * @param req
 * @param res
 * @param callback
 */

module.exports.getFollowingList = async function (CLIENT, req, res, callback) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(USER_MODEL.collection_name);
	const userFollowerData = await userCollection.findOne(
		{ user_id: req.authorization.user_id })
	let perPage = req?.query?.limit || 15,
		page = req?.query?.page;
	const totalCount = userFollowerData.follower_ids.length
	userCollection
		.aggregate([
			{
				$match: {
					user_id: req.authorization.user_id,
				},
			},
			{
				$lookup: {
					from: USER_MODEL.collection_name,
					localField: 'following_ids',
					foreignField: 'user_id',
					"let": { "user_id": "$user_id" },
					pipeline: [
						{ "$match": { "$expr": { "$in": ["$$user_id", "$following_ids"] } } },
						{ $skip: page ? Number(perPage * page) : 0 },
						{ $limit: perPage ? Number(perPage) : totalCount },

					],
					as: 'followings',
				},
			},
			{
				$unwind: {
					path: '$followings',
					preserveNullAndEmptyArrays: false,
				},
			},
			{
				$match: {
					'followings.status': 'active',
				},
			},
			{
				$group: {
					_id: '$_id',
					followings: { $push: '$followings' },
				},
			},
			{
				$project: {
					_id: 0,
					'followings.password': 0,
					'followings.friend_ids': 0,
					'followings.created_date': 0,
					'followings.status': 0,
					'followings.email': 0,
					'followings._id': 0,
					'followings.last_login_ip': 0,
				},
			},
		])
		.toArray((err, followingsArr) => {
			if (err) {
				callback(err);
			} else {
				let followings = [];
				if (followingsArr && followingsArr.length > 0) {
					followings = followingsArr[0].followings;
				}

				followings.forEach((friend) => {
					const followUnfollowButton = {
						button_text: 'Unfollow',
						button_link: '/profile/' + friend.user_id + '/cancel-follow',
						button_type: 'warning',
					};
					friend.request_buttons = [followUnfollowButton];
				});

				let finalResponse = {};
				finalResponse.status = true;
				finalResponse.data = followings;
				finalResponse.page = page ? Number(page) + 1 : 1;
				finalResponse.count = totalCount;
				finalResponse.pages = Math.ceil(totalCount / perPage);
				callback(null, finalResponse);
			}
		});
};

/**
 * FOLLOWER LIST
 * @param CLIENT
 * @param req
 * @param res
 * @param callback
 */
module.exports.getFollowerList = async function (CLIENT, req, res, callback) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(USER_MODEL.collection_name);
	const userFollowerData = await userCollection.findOne(
		{ user_id: req.authorization.user_id })
	let perPage = req?.query?.limit || 15,
		page = req?.query?.page;
	const totalCount = userFollowerData.follower_ids.length
	userCollection.findOne(
		{ user_id: req.authorization.user_id },
		(err, userDetails) => {
			userCollection
				.aggregate([
					{
						$match: {
							user_id: req.authorization.user_id,
						},
					},
					{
						$lookup: {
							from: USER_MODEL.collection_name,
							"let": { "user_id": "$user_id" },
							localField: 'follower_ids',
							foreignField: 'user_id',
							pipeline: [
								{ "$match": { "$expr": { "$in": ["$$user_id", "$follower_ids"] } } },
								{ $skip: page ? Number(perPage * page) : 0 },
								{ $limit: perPage ? Number(perPage) : totalCount },

							],
							as: 'followers',
						},
					},
					{
						$unwind: {
							path: '$followers',
							preserveNullAndEmptyArrays: false,
						},
					},
					{
						$match: {
							'followers.status': 'active',
						},
					},
					{
						$group: {
							_id: '$_id',
							followers: { $push: '$followers' },
						},
					},
					{
						$project: {
							_id: 0,
							'followers.password': 0,
							'followers.friend_ids': 0,
							'followers.created_date': 0,
							'followers.status': 0,
							'followers.email': 0,
							'followers._id': 0,
							'followers.last_login_ip': 0,
						},
					},
				])
				.toArray((err, followersArr) => {
					if (err) {
						callback(err);
					} else {
						let followers = [];
						if (followersArr && followersArr.length > 0) {
							followers = followersArr[0].followers;
						}

						followers.forEach((follower) => {
							let followButton = {};
							if (
								userDetails.following_ids &&
								userDetails.following_ids.indexOf(follower.user_id) !== -1
							) {
								followButton = {
									button_text: 'Following',
									button_link: '#',
									button_type: 'warning',
								};
							} else {
								followButton = {
									button_text: 'Follow',
									button_link: '/profile/' + follower.user_id + '/follow',
									button_type: 'success',
								};
							}
							follower.request_buttons = [followButton];
						});

						let finalResponse = {};
						finalResponse.status = true;
						finalResponse.data = followers;
						finalResponse.page = page ? Number(page) + 1 : 1;
						finalResponse.count = totalCount;
						finalResponse.pages = Math.ceil(totalCount / perPage);
						callback(null, finalResponse);
					}
				});
		}
	);
};

/**
 * GET USER PROFILE
 * @param CLIENT
 * @param req
 * @param res
 * @param user_id
 * @param callback
 */
module.exports.getUserProfile = function (CLIENT, req, res, user_id, callback) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(USER_MODEL.collection_name);
	let postCollection = CONNECTION.collection(POST_MODEL.collection_name);
	// Own Profile
	if (user_id === req.authorization.user_id) {
		userCollection
			.aggregate([
				{
					$match: {
						user_id: user_id,
					},
				},
				{
					$project: {
						password: 0,
						verification_token: 0,
						verification_otp: 0,
					},
				},
				{
					$lookup: {
						from: 'user',
						let: {
							userIds: {
								$cond: [{ $isArray: ['$following_ids'] }, '$following_ids', []],
							},
						},
						pipeline: [
							{
								$match: {
									$expr: {
										$in: ['$user_id', '$$userIds'],
									},
								},
							},
							{
								$match: {
									status: 'active',
								},
							},
							{
								$project: {
									first_name: 1,
									last_name: 1,
									user_id: 1,
									profile_image_url: 1,
									_id: 0,
									follower_ids: 1,
								},
							},
						],
						as: 'followings_list',
					},
				},
				{
					$lookup: {
						from: 'user',
						let: {
							userIds: {
								$cond: [{ $isArray: ['$follower_ids'] }, '$follower_ids', []],
							},
						},
						pipeline: [
							{
								$match: {
									$expr: {
										$in: ['$user_id', '$$userIds'],
									},
								},
							},
							{
								$match: {
									status: 'active',
								},
							},
							{
								$project: {
									first_name: 1,
									last_name: 1,
									user_id: 1,
									profile_image_url: 1,
									_id: 0,
									follower_ids: 1,
								},
							},
						],
						as: 'followers_list',
					},
				},
			])
			.toArray((err, userDataArr) => {
				let finalOutput = {};
				finalOutput.status = true;
				finalOutput.data = userDataArr[0];
				// Online Offline Friends
				// if (finalOutput.data.friends_list) {
				//     finalOutput.data.friends_list.forEach(friend => {
				//         if (friend.last_active) {
				//             let minutesDifference = moment().diff(friend.last_active, 'minutes');
				//             if (minutesDifference === 0) {
				//                 friend.online_status = true;
				//             } else {
				//                 friend.online_status = false;
				//             }
				//         } else {
				//             friend.online_status = false;
				//         }
				//     });
				// }
				messages.getMessagesList(CLIENT, req, res, (err, chatList) => {
					finalOutput.data.friends_list = chatList.data;
					// Profile Strength
					//   let totalSize = Object.keys(USER_MODEL.properties).length - 9;
					let arr = [
						'user_id',
						'first_name',
						'last_name',
						'facebook_id',
						'google_id',
						'email',
						'date_of_birth',
						'gender',
						'contact_number',
						'about',
						'state',
						'nationality',
						'religion',
						'profile_image_url',
						'cover_image_url',
						'sports_interests',
						'politics_interest',
						'career_interest',
						'introduced',
						'status',
						'profile_title',
						'mostpopularpostseen',
						'register_device_detail',
					];
					let totalSize = arr.length;
					console.log({ totalSize });

					let profileSize = 0;
					let i = 0;
					arr.forEach((key) => {
						if (userDataArr[0][key]) {
							profileSize++;
						} else {
							console.log({ key, val: userDataArr[0][key], i });
							i++;
						}
					});

					finalOutput.data.profile_strength =
						Math.round((profileSize / totalSize) * 100) || 0;
					delete finalOutput.data.two_fa_secret;
					postCollection
						.aggregate([
							{
								$match: {
									posted_by: user_id,
								},
							},
							{ $group: { _id: null, sum: { $sum: '$like_count' } } },
						])
						.toArray((err, postResult) => {
							if (postResult[0]) {
								finalOutput.data.totalPostLikes = postResult[0].sum;
							} else {
								finalOutput.data.totalPostLikes = 0;
							}

							/** Check for user_name */
							if (!finalOutput.data.user_name) {
								finalOutput.data.user_name = '';
							}
							/** Check for profile_title */
							if (!finalOutput.data.profile_title) {
								finalOutput.data.profile_title = '';
							}
							// Encrypt response
							// const cipherUserDetails = CyptoJs.AES.encrypt(JSON.stringify(finalOutput.data), process.env.CRYPTO_SECRET).toString();
							// finalOutput.data = cipherUserDetails;
							callback(err, finalOutput);
						});
				});
			});
	} else {
		// Other Profile
		userCollection
			.find(
				{
					user_id: { $in: [user_id, req.authorization.user_id] },
					status: 'active',
				},
				{ projection: { password: 0, verification_token: 0, two_fa_secret: 0 } }
			)
			.toArray((err, userDetailsArr) => {
				if (err) {
					callback(err);
				} else {
					if (userDetailsArr.length === 2) {
						// Valid Other Profile
						let currentUserProfile = {};
						let otherUserProfile = {};
						userDetailsArr.forEach((elem) => {
							if (elem.user_id === user_id) {
								otherUserProfile = elem;
							} else {
								currentUserProfile = elem;
							}
						});

						let mutualFriendsIds = utility.getMutualFriendIds(
							currentUserProfile,
							otherUserProfile
						);
						let isMyFriend = utility.checkFriend(
							otherUserProfile.user_id,
							currentUserProfile
						);
						let isFollowing = false;
						if (
							currentUserProfile &&
							currentUserProfile.following_ids &&
							currentUserProfile.following_ids.indexOf(user_id) !== -1
						) {
							isFollowing = true;
						}

						otherUserProfile.mutual_friends = [];
						otherUserProfile.is_my_friend = isFollowing;

						// Check if there is a Follow Request
						const followRequestCollection = CONNECTION.collection(
							FRIEND_REQUEST_MODEL.collection_name
						);
						followRequestCollection
							.find({
								$or: [
									{
										requested_to: user_id,
										requested_by: req.authorization.user_id,
									},
									{
										requested_to: req.authorization.user_id,
										requested_by: user_id,
									},
								],
							})
							.toArray((err, requests) => {
								let haveRequestFromMe = false;
								let haveRequestFromHim = false;
								if (requests && requests.length > 0) {
									requests.forEach((request) => {
										if (request.requested_by === user_id) {
											haveRequestFromHim = true;
										} else {
											haveRequestFromMe = true;
										}
									});
								}

								let requestButton = null;
								let followingButton = {};

								otherUserProfile.blocked_by_me =
									Array.isArray(currentUserProfile.blocked_ids) &&
									currentUserProfile.blocked_ids.includes(
										otherUserProfile.user_id
									);

								const blockButton = {};
								if (isFollowing) {
									followingButton.button_text = 'Unfollow';
									followingButton.button_link =
										'/profile/' + user_id + '/cancel-follow';
									followingButton.button_type = 'removefriend';

									if (isMyFriend) {
										requestButton = {};
										requestButton.button_text = 'Remove Role Model';
										requestButton.button_link =
											'/profile/' + user_id + '/cancel-friend';
										requestButton.button_type = 'removefriend';
									} else {
										requestButton = {};
										requestButton.button_text = 'Role Model';
										requestButton.button_link =
											'/profile/' + user_id + '/add-friend';
										requestButton.button_type = 'addfriend';
									}
								} else {
									followingButton.button_text = 'Follow';
									followingButton.button_link =
										'/profile/' + user_id + '/follow';
									followingButton.button_type = 'addfriend';

									if (haveRequestFromMe) {
										followingButton.button_text = 'Follow Requested';
										followingButton.button_link = '#';
										followingButton.button_type = 'addfriend';
									}
								}

								otherUserProfile.request_buttons = [followingButton];
								if (requestButton) {
									otherUserProfile.request_buttons.push(requestButton);
								}

								if (haveRequestFromHim) {
									otherUserProfile.request_buttons.push({
										button_text: 'Accept Follow Request',
										button_link: '/profile/' + user_id + '/confirm-follow',
										button_type: 'addfriend',
									});

									otherUserProfile.request_buttons.push({
										button_text: 'Reject Follow Request',
										button_link:
											'/profile/' + user_id + '/cancel-follow-request',
										button_type: 'removefriend',
									});
								}

								if (otherUserProfile.blocked_by_me) {
									blockButton.button_text = 'Unblock';
									blockButton.button_link = '/profile/' + user_id + '/unblock';
									blockButton.button_type = 'addfriend';
									otherUserProfile.request_buttons = [blockButton];
								} else {
									blockButton.button_text = 'Block User';
									blockButton.button_link = '/profile/' + user_id + '/block';
									blockButton.button_type = 'removefriend';
									otherUserProfile.request_buttons.push(blockButton);
								}

								// Get Friend List, Following List and Followers List
								userCollection
									.aggregate([
										{
											$match: {
												user_id: user_id,
											},
										},
										{
											$lookup: {
												from: 'user',
												let: {
													userIds: {
														$cond: [
															{ $isArray: ['$friend_ids'] },
															'$friend_ids',
															[],
														],
													},
												},
												pipeline: [
													{
														$match: {
															$expr: {
																$in: ['$user_id', '$$userIds'],
															},
														},
													},
													{
														$match: {
															status: 'active',
														},
													},
													{
														$project: {
															first_name: 1,
															last_name: 1,
															user_id: 1,
															profile_image_url: 1,
															_id: 0,
															follower_ids: 1,
														},
													},
												],
												as: 'friends_list',
											},
										},
										{
											$lookup: {
												from: 'user',
												let: {
													userIds: {
														$cond: [
															{ $isArray: ['$following_ids'] },
															'$following_ids',
															[],
														],
													},
												},
												pipeline: [
													{
														$match: {
															$expr: {
																$in: ['$user_id', '$$userIds'],
															},
														},
													},
													{
														$match: {
															status: 'active',
														},
													},
													{
														$project: {
															first_name: 1,
															last_name: 1,
															user_id: 1,
															profile_image_url: 1,
															_id: 0,
															follower_ids: 1,
														},
													},
												],
												as: 'followings_list',
											},
										},
										{
											$lookup: {
												from: 'user',
												let: {
													userIds: {
														$cond: [
															{ $isArray: ['$follower_ids'] },
															'$follower_ids',
															[],
														],
													},
												},
												pipeline: [
													{
														$match: {
															$expr: {
																$in: ['$user_id', '$$userIds'],
															},
														},
													},
													{
														$match: {
															status: 'active',
														},
													},
													{
														$project: {
															first_name: 1,
															last_name: 1,
															user_id: 1,
															profile_image_url: 1,
															_id: 0,
															follower_ids: 1,
														},
													},
												],
												as: 'followers_list',
											},
										},
									])
									.toArray((err, extraFriendFollowingDetails) => {
										if (err) {
											callback(err);
											return;
										}

										otherUserProfile.friends_list =
											extraFriendFollowingDetails[0].friends_list || [];
										otherUserProfile.followings_list =
											extraFriendFollowingDetails[0].followings_list || [];
										otherUserProfile.followers_list =
											extraFriendFollowingDetails[0].followers_list || [];

										postCollection
											.aggregate([
												{
													$match: {
														posted_by: user_id,
													},
												},
												{ $group: { _id: null, sum: { $sum: '$like_count' } } },
											])
											.toArray((err, postResult) => {
												if (postResult[0]) {
													otherUserProfile.totalPostLikes = postResult[0].sum;
												} else {
													otherUserProfile.totalPostLikes = 0;
												}

												/** Check for user_name */
												if (!otherUserProfile.user_name) {
													otherUserProfile.user_name = '';
												}
												/** Check for profile_title */
												if (!otherUserProfile.profile_title) {
													otherUserProfile.profile_title = '';
												}
												let finalOutput = {};
												finalOutput.status = true;
												// encrypt response
												// const cipherUserDetails = CyptoJs.AES.encrypt(JSON.stringify(otherUserProfile), process.env.CRYPTO_SECRET).toString();
												// finalOutput.data = cipherUserDetails;
												finalOutput.data = otherUserProfile;
												callback(null, finalOutput);
											});

										// let finalOutput = {};
										// finalOutput.status = true;
										// finalOutput.data = otherUserProfile;
										// ecnrypt response
										// const cipherUserDetails = CyptoJs.AES.encrypt(JSON.stringify(otherUserProfile), process.env.CRYPTO_SECRET).toString();
										// finalOutput.data = cipherUserDetails;
										// callback(null, finalOutput);
									});
							});
					} else {
						let error = new Error('Invalid Profile');
						error.name = 'NOT_FOUND_ERROR';
						callback(error);
					}
				}
			});
	}
};

/**
 * GET PROFILE SETTINGS
 * @param CLIENT
 * @param req
 * @param res
 * @param callback
 */
module.exports.getProfileSetting = function (CLIENT, req, res, callback) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(USER_MODEL.collection_name);
	let postCollection = CONNECTION.collection(POST_MODEL.collection_name);
	let currentUserId = req.authorization.user_id;
	userCollection.findOne(
		{ user_id: currentUserId },
		{ projection: { password: 0 } },
		function (err, userData) {
			postCollection
				.aggregate([
					{
						$match: {
							posted_by: currentUserId,
						},
					},
					{ $group: { _id: null, sum: { $sum: '$like_count' } } },
				])
				.toArray((err, postResult) => {
					if (postResult[0]) {
						console.log(postResult[0].sum);
						userData.totalPostLikes = postResult[0].sum;
					} else {
						userData.totalPostLikes = 0;
					}
					/** Check for user_name */
					if (!userData.user_name) {
						userData.user_name = '';
					}
					/** Check for profile_title */
					if (!userData.profile_title) {
						userData.profile_title = '';
					}
					let finalResponse = {};
					finalResponse.status = true;
					finalResponse.data = userData;
					callback(err, finalResponse);
				});
		}
	);
};

module.exports.getMyHashTags = function (CLIENT, req, res, callback) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(USER_MODEL.collection_name);
	let currentUserId = req.authorization.user_id;
	userCollection.findOne(
		{ user_id: currentUserId },
		{ projection: { password: 0 } },
		function (err, userData) {
			let finalResponse = {};
			finalResponse.status = true;
			finalResponse.data = userData.following_hashtags || [];
			callback(err, finalResponse);
		}
	);
};

/**
 * UPDATE PROFILE
 * @param CLIENT
 * @param req
 * @param res
 * @param callback
 */
module.exports.updateProfileSetting = function (CLIENT, req, res, callback) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(USER_MODEL.collection_name);
	let currentUserId = req.authorization.user_id;

	let updatedProfileData = utility.filterBody(req.body);
	if (updatedProfileData === {}) {
		return cb({ error: 'invalid data' }, false);
	}

	/** Validate profile title length */
	if (updatedProfileData.profile_title) {
		if (updatedProfileData.profile_title.length > 100) {
			let error = new Error(
				'Profile title should not be greater then 100 characters'
			);
			error.name = 'VALIDATION_ERROR';
			callback(error);
			return;
		}
	}
	/* user_name */
	if (!updatedProfileData.user_name) {
		// let error = new Error("Username Can not be Empty");
		// error.name = "VALIDATION_ERROR";
		// cb(error);
		// return;
	} else {
		let unique_user_name = {};
		unique_user_name.user_name = updatedProfileData.user_name;
		unique_user_name.status = 'active';
		unique_user_name.user_id = { $ne: currentUserId };

		userCollection.findOne(unique_user_name, function (err, user) {
			if (err) {
				callback(err);
			} else {
				if (user) {
					let error = new Error('User with this username already exists');
					error.name = 'VALIDATION_ERROR';
					callback(error);
					return;
				}
			}
		});
	}
	/**/
	if (typeof updatedProfileData.private === 'string') {
		if (
			updatedProfileData.private == 'true' ||
			updatedProfileData.private == '1'
		) {
			updatedProfileData.private = true;
		} else {
			updatedProfileData.private = false;
		}
	}
	const introduced = updatedProfileData.introduced;
	delete updatedProfileData.introduced;
	changePassword(
		CONNECTION,
		currentUserId,
		updatedProfileData.password,
		function () {
			delete updatedProfileData.password;
			utility.validatePostData(
				CONNECTION,
				updatedProfileData,
				USER_MODEL,
				'update',
				currentUserId,
				function (err, validatedData) {
					if (err) {
						callback(err);
					} else {
						if (introduced) {
							console.log('introduced inside===>', introduced);
							validatedData.introduced = true;
						}
						console.log('validatedData ===>', validatedData);
						userCollection.findOneAndUpdate(
							{ user_id: currentUserId },
							{ $set: validatedData },
							{
								projection: { password: 0 },
								returnOriginal: false,
							},
							function (err, userData) {
								let updatedFields = {};
								Object.keys(updatedProfileData).forEach((key) => {
									updatedFields[key] = userData.value[key];
								});
								let finalResponse = {};
								finalResponse.status = true;
								finalResponse.data = updatedFields;
								callback(err, finalResponse);
							}
						);
					}
				}
			);
		}
	);
};

const changePassword = function (CONNECTION, user_id, new_password, cb) {
	if (new_password) {
		const salt = bcrypt.genSaltSync(10);
		const password = bcrypt.hashSync(new_password, salt);
		const userCollection = CONNECTION.collection(USER_MODEL.collection_name);
		userCollection.findOneAndUpdate(
			{ user_id: user_id },
			{ $set: { password: password } },
			cb
		);
	} else {
		cb();
	}
};

/**
 * GET SUGGESTED PEOPLE
 * @param CLIENT
 * @param req
 * @param res
 * @param callback
 */
module.exports.getSuggestedPeople = function (CLIENT, req, res, callback) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(USER_MODEL.collection_name);
	userCollection.findOne(
		{ user_id: req.authorization.user_id },
		{
			projection: {
				friend_ids: 1,
				following_ids: 1,
				follower_ids: 1,
				user_id: 1,
				sports_interests: 1,
				state: 1,
				blocked_ids: 1,
			},
		},
		function (err, userData) {
			let blocked_ids = userData.blocked_ids || [];
			let following_ids = userData.following_ids || [];
			following_ids.push(req.authorization.user_id);
			// Get already friend Requested user Ids
			if (!Array.isArray(userData.sports_interests)) {
				userData.sports_interests = [];
			}

			const followRequestCollection = CONNECTION.collection(
				FRIEND_REQUEST_MODEL.collection_name
			);
			followRequestCollection
				.find({ requested_by: req.authorization.user_id })
				.toArray((err, requestList) => {
					if (!requestList) {
						requestList = [];
					}
					let sent_requests_ids = requestList.map((x) => x.requested_to);
					// following_ids.push(...sent_requests_ids);
					userCollection
						.aggregate([
							{
								$match: {
									user_id: { $nin: [...following_ids, ...blocked_ids] },
									status: 'active',
								},
							},
							{
								$unwind: {
									path: '$sports_interests',
									preserveNullAndEmptyArrays: true,
								},
							},
							{
								$match: {
									$or: [
										{ sports_interests: { $in: userData.sports_interests } },
										{ state: userData.state },
									],
								},
							},
							{
								$group: {
									_id: '$user_id',
									user_id: { $first: '$user_id' },
									first_name: { $first: '$first_name' },
									last_name: { $first: '$last_name' },
									profile_image_url: { $first: '$profile_image_url' },
									user_name: { $first: { $ifNull: ['$user_name', ''] } },
								},
							},
							{
								$limit: 100,
							},
						])
						.toArray((err, suggestedPeople) => {
							if (err) {
								callback(err);
							} else {
								let finalArr = [];
								suggestedPeople.forEach((elem) => {
									let tmpObj = {};
									tmpObj.user_id = elem.user_id;
									tmpObj.first_name = elem.first_name;
									tmpObj.last_name = elem.last_name;
									tmpObj.profile_image_url = elem.profile_image_url;
									tmpObj.follow_button = {
										button_link: 'profile/' + elem.user_id + '/follow',
										button_text: 'Follow',
										button_type: 'success',
									};
									if (sent_requests_ids.indexOf(elem.user_id) !== -1) {
										tmpObj.follow_button['button_text'] = 'Requested';
										tmpObj.follow_button['button_link'] = '#';
										tmpObj.follow_button['button_type'] = 'warning';
									}
									finalArr.push(tmpObj);
								});

								let finalResponse = {};
								finalResponse.status = true;
								finalResponse.data = finalArr;
								callback(null, finalResponse);
							}
						});
				});
		}
	);
};

module.exports.findFriends = function (CLIENT, req, res, callback) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(USER_MODEL.collection_name);
	const currentUserId = req.authorization.user_id;
	let page = Number(req.query.page) || 1;
	let limit = Number(req.query.page) ? 20 : 50;
	let skip = (page - 1) * limit;
	userCollection.findOne(
		{ user_id: req.authorization.user_id },
		function (err, userData) {
			if (err) {
				callback(err);
			} else {
				userCollection
					.aggregate([
						{
							$match: {
								status: 'active',
							},
						},
						{
							$project: {
								user_id: 1,
								user_name: 1,
								first_name: 1,
								last_name: 1,
								email: 1,
								full_name: { $concat: ['$first_name', ' ', '$last_name'] },
								profile_image_url: 1,
								follower_ids: 1,
								private: 1,
								blocked_ids: 1,
							},
						},
						{
							$match: {
								$or: [
									{ full_name: new RegExp(req.query.search, 'i') },
									{ email: new RegExp(req.query.search, 'i') },
									{ user_name: new RegExp(req.query.search, 'i') },
								],
							},
						},
						{
							$skip: skip,
						},
						{
							$limit: limit,
						},
					])
					.toArray(async (err, userList) => {
						if (err) {
							callback(err);
						} else {
							for (const [ULindex, friend] of userList.entries()) {
								let followButton = {};
								let CONNECTION = CLIENT.db(utility.dbName);
								let follow_request = CONNECTION.collection(
									FOLLOW_REQ.collection_name
								);
								let followRequest = await follow_request.findOne({
									$and: [
										{ requested_by: req.authorization.user_id },
										{ requested_to: friend.user_id },
									],
								});
								if (
									userData.following_ids &&
									userData.following_ids.indexOf(friend.user_id) !== -1
								) {
									followButton = {
										button_text: 'Following',
										button_link: '#',
										button_type: 'warning',
									};
								} else {
									console.log('followRequest===>', followRequest);
									if (friend.private === true && followRequest != null) {
										followButton = {
											button_text: 'Requested',
											button_link: '#',
											button_type: 'warning',
										};
									} else {
										followButton = {
											button_text: 'Follow',
											button_link: '/profile/' + friend.user_id + '/follow',
											button_type: 'success',
										};
									}
								}
								if (
									friend.blocked_ids &&
									friend.blocked_ids.indexOf(userData.user_id) !== -1
								) {
									userList.splice(ULindex, 1);
								}
								if (
									userData.blocked_ids &&
									userData.blocked_ids.indexOf(friend.user_id) !== -1
								) {
									followButton = {
										button_text: 'Blocked',
										button_link: '#',
										button_type: 'warning',
									};
									friend.blocked_by_me = true;
								} else {
									friend.blocked_by_me = false;
								}
								friend.request_buttons = [followButton];
								console.log(
									'friend.request_buttons===>',
									friend.request_buttons
								);
							}
							let finalResponse = {};
							finalResponse.status = true;
							finalResponse.data = userList;
							finalResponse.count = userList.length;
							finalResponse.currentPage = page;
							finalResponse.nextPage = page + 1;
							callback(null, finalResponse);
						}
					});
			}
		}
	);
};
