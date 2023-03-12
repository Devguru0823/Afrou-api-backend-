'use strict';
const Model = require('./post.json');
const advertModel = require('./advert.model.json');
let utility = require('../../utilities');
const fs = require('fs');
const SITE_CONFIG = require('../../configs/siteConfig.json');
const NOTIFICATION = require('./notification.js');
const request = require('request');
const notifications = require('../../_helpers/push-notification');
const CryptoJs = require('crypto-js');
const postValidator = require('../../validators/v2/post');

const COMMENT_MODEL = require('./post_comment.json');
let commentCollectionName = COMMENT_MODEL.collection_name;

const LIKE_MODEL = require('./likes.json');
let likeCollectionName = LIKE_MODEL.collection_name;

const USER_MODEL = require('./user.json');
let userCollectionName = USER_MODEL.collection_name;

const GROUP_MODEL = require('./group.json');

const FRIEND_REQUEST_MODEL = require('./friend_request.json');
let friendRequestCollectionName = FRIEND_REQUEST_MODEL.collection_name;

const HASHTAG_MODULE = require('./hashtag');

/**
 * GET MOST POPULAR POSTS
 * @param CLIENT
 * @param req
 * @param res
 * @param cb
 */

module.exports.getMostPopulatPosts = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let postCollection = CONNECTION.collection(Model.collection_name);
	const posted_for = req.query.type || 'afroswagger';

	/* Only load those posts which are not seen by user */
	let userCollection = CONNECTION.collection(userCollectionName);
	let user_id = req.authorization.user_id;
	var userMostPopularPostSeen = [];
	userCollection.findOne({ user_id: user_id }, function (err, user) {
		if (err) {
			cb(err);
		} else {
			if (user.mostpopularpostseen) {
				console.log(user.mostpopularpostseen);
				userMostPopularPostSeen = user.mostpopularpostseen;
			}
			postCollection
				.aggregate([
					{
						$match: {
							post_status: 'active',
							posted_for: posted_for,
							post_type: { $in: ['image', 'video'] },
							post_id: { $nin: userMostPopularPostSeen },
						},
					},
					{
						$addFields: {
							like_comment_count: {
								$add: ['$like_count', '$comment_count', '$video_play_count'],
							},
						},
					},
					{
						$sort: {
							like_comment_count: -1,
						},
					},
					{
						$limit: SITE_CONFIG.mostPopularPostsCount,
					},
					sharedPostLookup(),
					getComments(1000, req.authorization.user_id),
					getRequestedUsers(1000, req.authorization.user_id),
					postedByUserLookupFunc(req.authorization.user_id),
					likesLookup('post', req.authorization.user_id),
					likedByMeLookup(req.authorization.user_id),
					postProjection,
					{
						$match: {
							$or: [
								{ post_type: { $ne: 'shared' } },
								{
									$and: [
										{ post_type: 'shared' },
										{ shared_post_data: { $exists: true, $not: { $size: 0 } } },
									],
								},
							],
						},
					},
				])
				.toArray((err, postList) => {
					if (err) {
						cb(err);
					} else {
						postList.forEach((post) => {
							if (!post.post_text) {
								if (post.post_type === 'image') {
									post.post_text = 'Image Post';
								}
								if (post.post_type === 'video') {
									post.post_text = 'Video Post';
								}
								if (post.post_type === 'shared') {
									post.post_text = 'Shared Post';
								}
							}
							/*****/
							var curUser = req.authorization.user_id;
							let followButton = {};
							if (curUser != post.user_id) {
								if (post.following) {
									followButton = {
										button_text: 'Following',
										button_link: '#',
										button_type: 'warning',
									};
								} else {
									if (post.requestedUser) {
										followButton = {
											button_text: 'Requested',
											button_link: '#',
											button_type: 'warning',
										};
									} else {
										followButton = {
											button_text: post.private === true ? 'Request' : 'Follow',
											button_link: '/profile/' + post.user_id + '/follow',
											button_type: 'success',
										};
									}
								}
							}
							post.request_buttons = [followButton];
							/*****/
						});
						let finalResponse = {};
						finalResponse.status = true;
						// const cipherPostList = CryptoJs.AES.encrypt(JSON.stringify(postList), process.env.CRYPTO_SECRET).toString();
						// finalResponse.data = cipherPostList;
						finalResponse.data = postList;
						cb(null, finalResponse);
					}
				});
		}
	});
	/* ================================================= */
};

module.exports.getMostPopulatPostsV2 = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let postCollection = CONNECTION.collection(Model.collection_name);
	const posted_for = req.query.type || 'afroswagger';

	/* Only load those posts which are not seen by user */
	let userCollection = CONNECTION.collection(userCollectionName);
	let user_id = req.authorization.user_id;
	var userMostPopularPostSeen = [];
	let page = Number(req.query.page) || 1;
	let limit = 20;
	let skip = (page - 1) * limit;
	userCollection.findOne({ user_id: user_id }, function (err, user) {
		if (err) {
			cb(err);
		} else {
			if (user.mostpopularpostseen) {
				console.log(user.mostpopularpostseen);
				userMostPopularPostSeen = user.mostpopularpostseen;
			}
			postCollection
				.aggregate([
					{
						$match: {
							post_status: 'active',
							posted_for: posted_for,
							post_type: { $in: ['image', 'video'] },
							post_id: { $nin: userMostPopularPostSeen },
						},
					},
					{
						$addFields: {
							like_comment_count: {
								$add: ['$like_count', '$comment_count', '$video_play_count'],
							},
						},
					},
					{
						$sort: {
							like_comment_count: -1,
						},
					},
					{
						$skip: skip,
					},
					{
						$limit: limit,
					},
					sharedPostLookup(),
					getComments(1000, req.authorization.user_id),
					getRequestedUsers(1000, req.authorization.user_id),
					postedByUserLookupFunc(req.authorization.user_id),
					likesLookup('post', req.authorization.user_id),
					likedByMeLookup(req.authorization.user_id),
					postProjection,
					{
						$match: {
							$or: [
								{ post_type: { $ne: 'shared' } },
								{
									$and: [
										{ post_type: 'shared' },
										{ shared_post_data: { $exists: true, $not: { $size: 0 } } },
									],
								},
							],
						},
					},
				])
				.toArray((err, postList) => {
					if (err) {
						cb(err);
					} else {
						postList.forEach((post) => {
							if (!post.post_text) {
								if (post.post_type === 'image') {
									post.post_text = 'Image Post';
								}
								if (post.post_type === 'video') {
									post.post_text = 'Video Post';
								}
								if (post.post_type === 'shared') {
									post.post_text = 'Shared Post';
								}
							}
							/*****/
							var curUser = req.authorization.user_id;
							let followButton = {};
							if (curUser != post.user_id) {
								if (post.following) {
									followButton = {
										button_text: 'Following',
										button_link: '#',
										button_type: 'warning',
									};
								} else {
									if (post.requestedUser) {
										followButton = {
											button_text: 'Requested',
											button_link: '#',
											button_type: 'warning',
										};
									} else {
										followButton = {
											button_text: post.private === true ? 'Request' : 'Follow',
											button_link: '/profile/' + post.user_id + '/follow',
											button_type: 'success',
										};
									}
								}
							}
							post.request_buttons = [followButton];
							/*****/
						});
						let finalResponse = {};
						finalResponse.status = true;
						finalResponse.data = postList;
						finalResponse.count = postList.length;
						finalResponse.currentPage = page;
						finalResponse.nextPage = page + 1;
						cb(null, finalResponse);
					}
				});
		}
	});
	/* ================================================= */
};

module.exports.getMostPopulatPostsOpen = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let postCollection = CONNECTION.collection(Model.collection_name);
	const posted_for = req.query.type || 'afroswagger';

	/* Only load those posts which are not seen by user */
	let userCollection = CONNECTION.collection(userCollectionName);
	let user_id = Number(req.query.user_id) || 0;
	var userMostPopularPostSeen = [];
	let page = Number(req.query.page) || 1;
	let limit = 20;
	let skip = (page - 1) * limit;
	userCollection.findOne({ user_id: user_id }, function (err, user) {
		if (err) {
			cb(err);
		} else {
			if (user.mostpopularpostseen) {
				console.log(user.mostpopularpostseen);
				userMostPopularPostSeen = user.mostpopularpostseen;
			}
			postCollection
				.aggregate([
					{
						$match: {
							post_status: 'active',
							posted_for: posted_for,
							post_type: { $in: ['image', 'video'] },
							post_id: { $nin: userMostPopularPostSeen },
						},
					},
					{
						$addFields: {
							like_comment_count: {
								$add: ['$like_count', '$comment_count', '$video_play_count'],
							},
						},
					},
					{
						$sort: {
							like_comment_count: -1,
						},
					},
					{
						$skip: skip,
					},
					{
						$limit: limit,
					},
					sharedPostLookup(),
					getComments(1000, user_id),
					getRequestedUsers(1000, user_id),
					postedByUserLookupFunc(user_id),
					likesLookup('post', user_id),
					likedByMeLookup(user_id),
					postProjection,
					{
						$match: {
							$or: [
								{ post_type: { $ne: 'shared' } },
								{
									$and: [
										{ post_type: 'shared' },
										{ shared_post_data: { $exists: true, $not: { $size: 0 } } },
									],
								},
							],
						},
					},
				])
				.toArray((err, postList) => {
					if (err) {
						cb(err);
					} else {
						postList.forEach((post) => {
							if (!post.post_text) {
								if (post.post_type === 'image') {
									post.post_text = 'Image Post';
								}
								if (post.post_type === 'video') {
									post.post_text = 'Video Post';
								}
								if (post.post_type === 'shared') {
									post.post_text = 'Shared Post';
								}
							}
							/*****/
							var curUser = 0;
							let followButton = {};
							if (curUser != post.user_id) {
								if (post.following) {
									followButton = {
										button_text: 'Following',
										button_link: '#',
										button_type: 'warning',
									};
								} else {
									if (post.requestedUser) {
										followButton = {
											button_text: 'Requested',
											button_link: '#',
											button_type: 'warning',
										};
									} else {
										followButton = {
											button_text: post.private === true ? 'Request' : 'Follow',
											button_link: '/profile/' + post.user_id + '/follow',
											button_type: 'success',
										};
									}
								}
							}
							post.request_buttons = [followButton];
							/*****/
						});
						let finalResponse = {};
						finalResponse.status = true;
						finalResponse.data = postList;
						finalResponse.count = postList.length;
						finalResponse.currentPage = page;
						finalResponse.nextPage = page + 1;
						cb(null, finalResponse);
					}
				});
		}
	});
	/* ================================================= */
};

module.exports.getMostPopulatPostsNew = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let postCollection = CONNECTION.collection(Model.collection_name);
	const posted_for = req.query.type || 'afroswagger';
	postCollection
		.aggregate([
			{
				$match: {
					post_status: 'active',
					posted_for: posted_for,
					post_type: { $in: ['image'] },
				},
			},
			{
				$addFields: {
					like_comment_count: { $add: ['$like_count', '$comment_count'] },
				},
			},
			{
				$sort: {
					like_comment_count: -1,
				},
			},
			{
				$limit: SITE_CONFIG.mostPopularPostsCount,
			},
			{
				$unwind: '$post_image',
			},
			sharedPostLookup(),
			getComments(1000, req.authorization.user_id),
			getRequestedUsers(1000, req.authorization.user_id),
			postedByUserLookupFunc(req.authorization.user_id),
			likesLookup('post', req.authorization.user_id),
			likedByMeLookup(req.authorization.user_id),
			postProjection,
			{
				$match: {
					$or: [
						{ post_type: { $ne: 'shared' } },
						{
							$and: [
								{ post_type: 'shared' },
								{ shared_post_data: { $exists: true, $not: { $size: 0 } } },
							],
						},
					],
				},
			},
		])
		.toArray((err, postList) => {
			if (err) {
				cb(err);
			} else {
				postList.forEach((post) => {
					if (!post.post_text) {
						if (post.post_type === 'image') {
							post.post_text = 'Image Post';
						}
						if (post.post_type === 'video') {
							post.post_text = 'Video Post';
						}
						if (post.post_type === 'shared') {
							post.post_text = 'Shared Post';
						}
					}
					/*****/
					var curUser = req.authorization.user_id;
					let followButton = {};
					if (curUser != post.user_id) {
						if (post.following) {
							followButton = {
								button_text: 'Following',
								button_link: '#',
								button_type: 'warning',
							};
						} else {
							if (post.requestedUser) {
								followButton = {
									button_text: 'Requested',
									button_link: '#',
									button_type: 'warning',
								};
							} else {
								followButton = {
									button_text: post.private === true ? 'Request' : 'Follow',
									button_link: '/profile/' + post.user_id + '/follow',
									button_type: 'success',
								};
							}
						}
					}
					post.request_buttons = [followButton];
					/*****/
				});
				let finalResponse = {};
				finalResponse.status = true;
				finalResponse.data = postList;
				cb(null, finalResponse);
			}
		});
};

/**
 * GET ENTERTAINMENT POSTS
 * @param CLIENT
 * @param req
 * @param res
 * @param cb
 */

module.exports.getEntertainmentPosts = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let postCollection = CONNECTION.collection(Model.collection_name);
	// Pagination
	let page = Number(req.query.page) || 1;
	let limit = SITE_CONFIG.postsLimitPerPage;
	let skip = (page - 1) * limit;
	postCollection
		.aggregate([
			{
				$match: {
					post_status: 'active',
					posted_for: { $in: ['afroswagger', 'afrotalent', 'hashtag'] },
					post_type: { $in: ['image', 'video'] },
				},
			},
			{
				$sort: {
					post_date: -1,
				},
			},
			{
				$skip: skip,
			},
			{
				$limit: limit,
			},
			sharedPostLookup(),
			getComments(1000, req.authorization.user_id),
			getRequestedUsers(1000, req.authorization.user_id),
			postedByUserLookupFunc(req.authorization.user_id),
			likesLookup('post', req.authorization.user_id),
			likedByMeLookup(req.authorization.user_id),
			postProjection,
			{
				$match: {
					$or: [
						{ post_type: { $ne: 'shared' } },
						{
							$and: [
								{ post_type: 'shared' },
								{ shared_post_data: { $exists: true, $not: { $size: 0 } } },
							],
						},
					],
				},
			},
		])
		.toArray((err, postList) => {
			if (err) {
				cb(err);
			} else {
				postList.forEach((post) => {
					var curUser = req.authorization.user_id;
					/*****/
					let followButton = {};
					if (curUser != post.user_id) {
						if (post.following) {
							followButton = {
								button_text: 'Following',
								button_link: '#',
								button_type: 'warning',
							};
						} else {
							if (post.requestedUser) {
								followButton = {
									button_text: 'Requested',
									button_link: '#',
									button_type: 'warning',
								};
							} else {
								followButton = {
									button_text: post.private === true ? 'Request' : 'Follow',
									button_link: '/profile/' + post.user_id + '/follow',
									button_type: 'success',
								};
							}
						}
					}
					post.request_buttons = [followButton];
					/*****/
				});
				let finalResponse = {};
				finalResponse.status = true;
				finalResponse.data = postList;
				finalResponse.count = postList.length;
				finalResponse.currentPage = page;
				finalResponse.nextPage = page + 1;
				cb(null, finalResponse);
			}
		});
};

/**
 *
 * @param CLIENT
 * @param req
 * @param res
 * @param posted_for
 * @param cb
 */
module.exports.getPosts = function (CLIENT, req, res, posted_for, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let postCollection = CONNECTION.collection(Model.collection_name);

	// Get Conditions for the timeline Posts
	utility.getPostsConditions(
		CONNECTION,
		req,
		posted_for,
		function (err, conditions) {
			let userId = req.authorization.user_id;
			if (err) {
				cb(err);
				return;
			}
			// Pagination
			let page = Number(req.query.page) || 1;
			let limit = SITE_CONFIG.postsLimitPerPage;
			let skip = (page - 1) * limit;

			// Sorting
			let sort = {
				post_date: -1,
			};

			postCollection
				.aggregate([
					{
						$match: conditions,
					},
					// {
					//   "$addFields": {
					//     "seen_by": {
					//       "$cond": {
					//         "if": {
					//           "$ne": [
					//             {
					//               "$type": "$seen_by"
					//             },
					//             "array"
					//           ]
					//         },
					//         "then": [],
					//         "else": "$seen_by"
					//       }
					//     }
					//   }
					// },
					// {
					//   "$addFields": {
					//     is_seen: {
					//       $cond: {
					//         if: {
					//           $in: [
					//             userId,
					//             "$seen_by"
					//           ]
					//         },
					//         then: 1,
					//         else: 0
					//       }
					//     }
					//   },
					// },
					{
						$sort: sort,
						// $sort: {
						//   is_seen: 1,
						//   created_date:-1
						// }
					},
					{
						$skip: skip,
					},
					{
						$limit: limit,
					},
					sharedPostLookup(req.authorization.user_id),
					getComments(1000, req.authorization.user_id),
					getRequestedUsers(1000, req.authorization.user_id),
					postedByUserLookupFunc(req.authorization.user_id),
					likesLookup('post', req.authorization.user_id),
					likedByMeLookup(req.authorization.user_id),
					postProjection,
					{
						$match: {
							$or: [
								{ post_type: { $ne: 'shared' } },
								{
									$and: [
										{ post_type: 'shared' },
										{ shared_post_data: { $exists: true, $not: { $size: 0 } } },
									],
								},
							],
						},
					},
				])
				.toArray((err, postList) => {
					if (err) {
						cb(err);
					} else {
						postList.forEach((post) => {
							// console.log("post===>",post);
							var curUser = req.authorization.user_id;
							/*****/
							let followButton = {};
							if (curUser != post.user_id) {
								if (post.following) {
									followButton = {
										button_text: 'Following',
										button_link: '#',
										button_type: 'warning',
									};
								} else {
									if (post.requestedUser) {
										followButton = {
											button_text: 'Requested',
											button_link: '#',
											button_type: 'warning',
										};
									} else {
										followButton = {
											button_text: post.private === true ? 'Request' : 'Follow',
											button_link: '/profile/' + post.user_id + '/follow',
											button_type: 'success',
										};
									}
								}
							}
							post.request_buttons = [followButton];
							/*****/
						});
						let finalResponse = {};
						finalResponse.status = true;
						// const cipherPostList = CryptoJs.AES.encrypt(JSON.stringify(postList), process.env.CRYPTO_SECRET).toString();
						// finalResponse.data = cipherPostList;
						finalResponse.data = postList;
						finalResponse.count = postList.length;
						finalResponse.currentPage = page;
						finalResponse.nextPage = page + 1;
						cb(null, finalResponse);
					}
				});
		}
	);
};

/*
 * Get Afroswager posts
 */

module.exports.getAfroswaggerPosts = async function (
	CLIENT,
	req,
	res,
	posted_for,
	cb
) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let postCollection = CONNECTION.collection(Model.collection_name);
	const Advert = CONNECTION.collection(advertModel.collection_name);

	// updated advert
	const expiredAdverts = await Advert.find({
		end_timestamp: { $lte: new Date().getTime() },
	}).toArray();
	// get expired post ids
	const postIds = expiredAdverts.map((x) => x.post_id);
	// update status promoted to false
	const postUpdate = await postCollection.updateMany(
		{ post_id: { $in: postIds } },
		{ $set: { promoted: false } }
	);
	console.log('post Update', postUpdate);
	// update status of advert to expired
	const advertUpdate = await Advert.updateMany(
		{ post: { $in: postIds } },
		{ $set: { status: 'expired' } }
	);

	// Get Conditions for the timeline Posts
	utility.getPostsConditions(
		CONNECTION,
		req,
		posted_for,
		async function (err, conditions) {
			let userId = req.authorization.user_id;
			if (err) {
				cb(err);
				return;
			}
			// Pagination
			let page = Number(req.query.page) || 1;
			let limit = SITE_CONFIG.postsLimitPerPage;
			let skip = (page - 1) * limit;

			// Sorting
			let sort = {
				post_date: -1,
			};

			console.log('=== X ===');
			console.log('conditions: ');
			console.log(JSON.stringify(conditions));
			console.log('=== X ===');

			// Get user details
			let userCollection = CONNECTION.collection(userCollectionName);
			const userDetails = await userCollection.findOne({ user_id: userId });
			let userAge;
			// convert age to string and split
			const userBirthDateSplit = userDetails.date_of_birth
				? userDetails.date_of_birth.toString().split(' ')
				: null;
			// get the year
			const userBirthYear =
				userBirthDateSplit !== null
					? Number.parseInt(userBirthDateSplit[3])
					: null;
			userAge =
				userBirthYear !== null
					? new Date().getFullYear() - userBirthYear
					: null;

			postCollection
				.aggregate([
					{
						$match: conditions,
					},
					{
						$addFields: {
							seen_by: {
								$cond: {
									if: {
										$ne: [
											{
												$type: '$seen_by',
											},
											'array',
										],
									},
									then: [],
									else: '$seen_by',
								},
							},
						},
					},
					{
						$addFields: {
							is_seen: {
								$cond: {
									if: {
										$and: [
											{
												$in: [userId, '$seen_by'],
											},
											{
												promoted: false,
											},
										],
									},
									then: 1,
									else: 0,
								},
							},
						},
					},
					{
						// $sort: sort
						$sort: {
							is_seen: 1,
							created_date: -1,
						},
					},
					{
						$skip: skip,
					},
					{
						$limit: limit,
					},
					sharedPostLookup(),
					advertDetailsLookup(),
					audienceDetailsLookup(),
					getComments(1000, req.authorization.user_id),
					getRequestedUsers(1000, req.authorization.user_id),
					postedByUserLookupFunc(req.authorization.user_id),
					likesLookup('post', req.authorization.user_id),
					likedByMeLookup(req.authorization.user_id),
					{
						$lookup: {
							from: 'goal',
							localField: 'post_id',
							foreignField: 'post_id',
							as: 'goal',
						},
					},

					{
						$match: {
							'userDetails.blocked_ids': { $nin: [req.authorization.user_id] },
						},
					},

					// returnProjection(req.authorization.user_id),
					postProjection,
					{
						$addFields: {
							likes_and_comment_count: {
								$sum: { $add: ['$like_count', '$comment_count'] },
							},
						},
					},
					// {
					//     $match: {
					//       $or: [
					//         { post_type : { $ne: "shared" } },
					//         {
					//           $and: [
					//             { post_type : "shared" },
					//             { shared_post_data: { $exists: true, $not: {$size: 0} } }
					//           ]
					//         }
					//       ],
					//       likes_and_comment_count: { $gte: 50 }
					//     }
					// },

					{
						$match: {
							logged_in_user_blocked: { $ne: true },
						},
					},
					{
						$project: {
							likes_and_comment_count: 0,
						},
					},
					// set condition for advertized posts
					{
						$match: {
							$or: [
								{ promoted: { $ne: true } },
								{
									$and: [
										{ promoted: true },
										{ 'audience_details.country': userDetails.nationality },
										{
											'audience_details.interests': {
												$in: userDetails.sports_interests,
											},
										},
										{
											'audience_details.minAge': {
												$lte: userAge ? userAge : 35,
											},
										},
										{
											'audience_details.maxAge': {
												$gte: userAge ? userAge : 35,
											},
										},
										{
											$or: [
												{ 'audience_details.gender': 'all' },
												{ 'audience_details.gender': userDetails.gender },
											],
										},
									],
								},
							],
						},
					},
				])
				.toArray((err, postList) => {
					console.log('=== POST ===');
					console.log(postList);
					console.log('============');
					if (err) {
						cb(err);
					} else {
						postProcess(
							postList,
							req.authorization.user_id,
							function (postList) {
								let finalResponse = {};
								finalResponse.status = true;
								finalResponse.data = shuffle(
									postList,
									req.authorization.user_id
								);
								// const cipherPostList = CryptoJs.AES.encrypt(JSON.stringify(postList), process.env.CRYPTO_SECRET).toString();
								// finalResponse.data = cipherPostList;
								finalResponse.count = postList.length;
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

function shuffle(array, user_id) {
	var currentIndex = array.length,
		randomIndex;

	// While there remain elements to shuffle...
	while (currentIndex != 0) {
		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;

		// And swap it with the current element.
		if (array[randomIndex].user_id === user_id) {
			// set user's post to first post in array
			[array[0], array[randomIndex]] = [array[randomIndex], array[0]];
		} else {
			[array[currentIndex], array[randomIndex]] = [
				array[randomIndex],
				array[currentIndex],
			];
		}
	}

	return array;
}

const postProcess = function (postList, curUser, cb) {
	postList.forEach((post) => {
		// get dimension
		if (post.post_type == 'image') {
			getDimension(post.post_image, 'image', function (dimensionResult) {
				post.dimension = dimensionResult;
			});
		} else {
			if (!post.dimension) {
				post.dimension = [];
			}
		}
		/*****/
		let followButton = {};
		if (curUser != post.user_id) {
			if (post.following) {
				followButton = {
					button_text: 'Following',
					button_link: '#',
					button_type: 'warning',
				};
			} else {
				if (post.requestedUser) {
					followButton = {
						button_text: 'Requested',
						button_link: '#',
						button_type: 'warning',
					};
				} else {
					followButton = {
						button_text: post.private === true ? 'Request' : 'Follow',
						button_link: '/profile/' + post.user_id + '/follow',
						button_type: 'success',
					};
				}
			}
		}
		post.request_buttons = [followButton];
	});
	cb(postList);
};

const getDimension = function (path, type, cb) {
	var res = [];
	if (type == 'image') {
		var sizeOf = require('image-size');
		var cdnPath = SITE_CONFIG.mediaBasePath.replace('uploads/', '');
		if (path) {
			path.forEach((img) => {
				img = cdnPath + img;
				if (fs.existsSync(img)) {
					var dimensions = sizeOf(img);
					res.push({ height: dimensions.height, width: dimensions.width });
					cb(res);
				} else {
					console.log(img);
					res.push([]);
				}
			});
		}
	} else if (type == 'video') {
		var cdnPath = SITE_CONFIG.mediaBasePath.replace('uploads/', '');
		path = cdnPath + path;
		// if(fs.existsSync(path)) {
		var ffmpeg = require('fluent-ffmpeg');
		ffmpeg.ffprobe(path, function (err, metadata) {
			if (err) {
				cb(res);
			} else {
				if (!metadata.streams[0].height) {
					if (metadata.streams[1].height) {
						metadata.streams[0].height = metadata.streams[1].height;
					} else {
						metadata.streams[0].height = 0;
					}
				}
				if (!metadata.streams[0].width) {
					if (metadata.streams[1].width) {
						metadata.streams[0].width = metadata.streams[1].width;
					} else {
						metadata.streams[0].width = 0;
					}
				}
				res.push({
					height: metadata.streams[0].height,
					width: metadata.streams[0].width,
				});
				cb(res);
			}
		});
		// }
	}
};

module.exports.getDimensionAsync = function (path, type) {
	var res = [];
	if (type == 'image') {
		var sizeOf = require('image-size');
		var cdnPath = SITE_CONFIG.mediaBasePath.replace('uploads/', '');
		if (path) {
			path.forEach((img) => {
				img = cdnPath + img;
				if (fs.existsSync(img)) {
					var dimensions = sizeOf(img);
					res.push({ height: dimensions.height, width: dimensions.width });
				} else {
					console.log(img);
					res.push([]);
				}
			});
		}
	} else if (type == 'video') {
		var cdnPath = SITE_CONFIG.mediaBasePath.replace('uploads/', '');
		path = cdnPath + path;
		// if(fs.existsSync(path)) {
		var ffmpeg = require('fluent-ffmpeg');
		ffmpeg.ffprobe(path, function (err, metadata) {
			if (err) {
				return res;
			} else {
				if (!metadata.streams[0].height) {
					if (metadata.streams[1].height) {
						metadata.streams[0].height = metadata.streams[1].height;
					} else {
						metadata.streams[0].height = 0;
					}
				}
				if (!metadata.streams[0].width) {
					if (metadata.streams[1].width) {
						metadata.streams[0].width = metadata.streams[1].width;
					} else {
						metadata.streams[0].width = 0;
					}
				}
				res.push({
					height: metadata.streams[0].height,
					width: metadata.streams[0].width,
				});
				return res;
			}
		});
		// }
	}
	return res;
};

module.exports.getUserPosts = function (CLIENT, req, res, user_id, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let postCollection = CONNECTION.collection(Model.collection_name);

	let page = Number(req.query.page) || 1;
	let limit = SITE_CONFIG.postsLimitPerPage;
	let skip = (page - 1) * limit;

	// Sorting
	let sort = {
		post_date: -1,
	};
	// check if User is active
	let userCollection = CONNECTION.collection(userCollectionName);
	userCollection.findOne(
		{ user_id: user_id, status: 'active' },
		function (err, userDetails) {
			if (userDetails) {
				// Check if the User is My Friend or not
				let isMyFriend = utility.checkIAmFollowing(
					req.authorization.user_id,
					userDetails
				);
				let condition = {
					post_status: 'active',
					post_privacy: 'public',
					posted_by: userDetails.user_id,
					posted_for: { $ne: 'group' },
				};
				if (isMyFriend) {
					delete condition.post_privacy;
				}

				postCollection
					.aggregate([
						{
							$match: condition,
						},
						{
							$sort: sort,
						},
						{
							$skip: skip,
						},
						{
							$limit: limit,
						},
						sharedPostLookup(),
						getComments(1000, req.authorization.user_id),
						getRequestedUsers(1000, req.authorization.user_id),
						postedByUserLookupFunc(req.authorization.user_id),
						likesLookup('post', req.authorization.user_id),
						likedByMeLookup(req.authorization.user_id),
						postProjection,
						{
							$match: {
								$or: [
									{ post_type: { $ne: 'shared' } },
									{
										$and: [
											{ post_type: 'shared' },
											{
												shared_post_data: { $exists: true, $not: { $size: 0 } },
											},
										],
									},
								],
							},
						},
					])
					.toArray((err, postList) => {
						if (err) {
							cb(err);
						} else {
							postList.forEach((post) => {
								var curUser = req.authorization.user_id;
								/*****/
								let followButton = {};
								if (curUser != post.user_id) {
									if (post.following) {
										followButton = {
											button_text: 'Following',
											button_link: '#',
											button_type: 'warning',
										};
									} else {
										if (post.requestedUser) {
											followButton = {
												button_text: 'Requested',
												button_link: '#',
												button_type: 'warning',
											};
										} else {
											followButton = {
												button_text:
													post.private === true ? 'Request' : 'Follow',
												button_link: '/profile/' + post.user_id + '/follow',
												button_type: 'success',
											};
										}
									}
								}
								post.request_buttons = [followButton];
								/*****/
							});

							let finalResponse = {};
							finalResponse.status = true;
							finalResponse.data = postList;
							finalResponse.count = postList.length;
							finalResponse.currentPage = page;
							finalResponse.nextPage = page + 1;
							cb(null, finalResponse);
						}
					});
			} else {
				let error = new Error('User does not exists');
				cb(error);
			}
		}
	);
};

module.exports.getGroupPosts = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let postCollection = CONNECTION.collection(Model.collection_name);
	const group_id = Number(req.params.group_id);
	const userCollection = CONNECTION.collection(USER_MODEL.collection_name);
	userCollection.findOne(
		{ user_id: req.authorization.user_id },
		(err, userDetails) => {
			let hiddenPosts = [];
			if (userDetails.hidden_posts) {
				hiddenPosts = [...userDetails.hidden_posts];
			}
			utility.checkGroupMembership(
				CONNECTION,
				group_id,
				req.authorization.user_id,
				function (isAllowed) {
					if (isAllowed) {
						// Pagination
						let page = Number(req.query.page) || 1;
						let limit = SITE_CONFIG.postsLimitPerPage;
						let skip = (page - 1) * limit;

						// Sorting
						let sort = {
							post_date: -1,
						};

						postCollection
							.aggregate([
								{
									$match: {
										posted_for: 'group',
										group_id: group_id,
										post_status: 'active',
										post_id: { $nin: hiddenPosts },
									},
								},
								{
									$sort: sort,
								},
								{
									$skip: skip,
								},
								{
									$limit: limit,
								},
								sharedPostLookup(),
								getComments(1000, req.authorization.user_id),
								postedByUserLookupFunc(req.authorization.user_id),
								likedByMeLookup(req.authorization.user_id),
								postProjection,
								{
									$match: {
										$or: [
											{ post_type: { $ne: 'shared' } },
											{
												$and: [
													{ post_type: 'shared' },
													{
														shared_post_data: {
															$exists: true,
															$not: { $size: 0 },
														},
													},
												],
											},
										],
									},
								},
							])
							.toArray((err, postList) => {
								if (err) {
									cb(err);
								} else {
									let finalResponse = {};
									finalResponse.status = true;
									finalResponse.data = postList;
									finalResponse.count = postList.length;
									finalResponse.currentPage = page;
									finalResponse.nextPage = page + 1;
									cb(null, finalResponse);
								}
							});
					} else {
						let error = new Error();
						error.name = 'PERMISSION_DENIED_ERROR';
						cb(error);
					}
				}
			);
		}
	);
};

module.exports.getHashtagPosts = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let postCollection = CONNECTION.collection(Model.collection_name);
	const hashtag_slug = req.params.hashtag_slug;
	const userCollection = CONNECTION.collection(USER_MODEL.collection_name);
	userCollection.findOne(
		{ user_id: req.authorization.user_id },
		(err, userDetails) => {
			let hiddenPosts = [];
			if (userDetails.hidden_posts) {
				hiddenPosts = [...userDetails.hidden_posts];
			}

			// Pagination
			let page = Number(req.query.page) || 1;
			let limit = SITE_CONFIG.postsLimitPerPage;
			let skip = (page - 1) * limit;

			// Sorting
			let sort = {
				post_date: -1,
			};

			postCollection
				.aggregate([
					{
						$match: {
							// posted_for: 'hashtag',
							hashtags: hashtag_slug,
							post_status: 'active',
							post_id: { $nin: hiddenPosts },
						},
					},
					{
						$sort: sort,
					},
					{
						$skip: skip,
					},
					{
						$limit: limit,
					},
					sharedPostLookup(),
					getComments(1000, req.authorization.user_id),
					getRequestedUsers(1000, req.authorization.user_id),
					postedByUserLookupFunc(req.authorization.user_id),
					likedByMeLookup(req.authorization.user_id),
					postProjection,
					{
						$match: {
							$or: [
								{ post_type: { $ne: 'shared' } },
								{
									$and: [
										{ post_type: 'shared' },
										{ shared_post_data: { $exists: true, $not: { $size: 0 } } },
									],
								},
							],
						},
					},
				])
				.toArray((err, postList) => {
					if (err) {
						cb(err);
					} else {
						postList.forEach((post) => {
							var curUser = req.authorization.user_id;
							/*****/
							let followButton = {};
							if (curUser != post.user_id) {
								if (post.following) {
									followButton = {
										button_text: 'Following',
										button_link: '#',
										button_type: 'warning',
									};
								} else {
									if (post.requestedUser) {
										followButton = {
											button_text: 'Requested',
											button_link: '#',
											button_type: 'warning',
										};
									} else {
										followButton = {
											button_text: post.private === true ? 'Request' : 'Follow',
											button_link: '/profile/' + post.user_id + '/follow',
											button_type: 'success',
										};
									}
								}
							}
							post.request_buttons = [followButton];
							/*****/
						});
						let finalResponse = {};
						finalResponse.status = true;
						// const cipherPostList = CryptoJs.AES.encrypt(JSON.stringify(postList), process.env.CRYPTO_SECRET).toString();
						// finalResponse.data = cipherPostList;
						finalResponse.data = postList;
						finalResponse.count = postList.length;
						finalResponse.currentPage = page;
						finalResponse.nextPage = page + 1;
						cb(null, finalResponse);
					}
				});
		}
	);
};

module.exports.addPost = async function (CLIENT, req, res, cb) {
	console.log(req.body);
	let CONNECTION = CLIENT.db(utility.dbName);
	let postCollection = CONNECTION.collection(Model.collection_name);

	try {
		const postObject = await postValidator.validateAsync(req.body);
	} catch (error) {
		const vErr = new Error();
		vErr.name = error.name;
		vErr.message = error.message;
		cb(vErr);
		return;
	}

	let newPostData = utility.filterBody(req.body);
	if (newPostData === {}) {
		return cb({ error: 'invalid data' }, false);
	}
	if (newPostData.share_post_id) {
		newPostData.share_post_id = parseInt(newPostData.share_post_id);
	}
	newPostData.posted_by = req.authorization.user_id;
	/* Remove bad words *
  var Filter = require('bad-words-plus');
  var filter = new Filter({ list: ['f0ck'] });
  newPostData.post_text = filter.clean(newPostData.post_text);
  /* *** */

	const hashTags = utility.getHashTags(newPostData.post_text);
	getAddressFromLatLong(newPostData.post_lat_long, (locationName) => {
		console.log(locationName);
		newPostData.post_location = locationName;
		/* get video dimension */
		getDimension(newPostData.post_video, 'video', function (result) {
			newPostData.dimension = result;
			HASHTAG_MODULE.addUpdateHashtags(CLIENT, hashTags, (err, hashtagsArr) => {
				/* If not follower then follow */
				if (hashtagsArr[0]) {
					if (
						hashtagsArr[0].followers.indexOf(req.authorization.user_id) == -1
					) {
						HASHTAG_MODULE.followHashtagFromPost(
							CLIENT,
							hashtagsArr[0].hashtag_slug,
							req.authorization.user_id,
							function (err, result) {
								console.log(result);
							}
						);
					}
				}
				/* *********** */
				if (!Array.isArray(hashtagsArr)) {
					hashtagsArr = [];
				}
				newPostData.hashtags = hashtagsArr.map((x) => x.hashtag_slug);
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
							/* Add image to notification */
							var postImagePath = '';
							if (validatedData.post_type == 'image') {
								if (validatedData.post_image) {
									if (validatedData.post_image[0]) {
										postImagePath = validatedData.post_image[0];
									}
								}
							} else if (validatedData.post_type == 'video') {
								if (validatedData.thumbnail) {
									postImagePath = validatedData.thumbnail;
								}
							}
							if (postImagePath != '') {
								postImagePath =
									'https://cdn.staging.afrocamgist.com/' + postImagePath;
							}
							/* ========================= */

							if (Number(validatedData.share_post_id) > 0) {
								validatedData.post_type = 'shared';
								const userCollection = CONNECTION.collection(
									USER_MODEL.collection_name
								);
								await userCollection
									.findOne({ user_id: req.authorization.user_id })
									.then((Details) => {
										let pushData = {
											status: 'Share Post',
											title: 'Share Post',
											body: `${Details.first_name} ${Details.last_name} shared your post`,
											image: postImagePath,
											sound: 'default',
											mutable_content: true,
											content_available: true,
											data: {
												status: 'Share Post',
												message: `${Details.first_name} ${Details.last_name} shared your post`,
												image: postImagePath,
												notification_type: 'share_post',
												post_id: validatedData.post_id,
											},
										};
										postCollection
											.findOne({ post_id: validatedData.share_post_id })
											.then((postDetails) => {
												let notification_details = {
													text_template:
														'{{USER_ID_' +
														validatedData.posted_by +
														'}} shared your post',
													post_id: validatedData.post_id,
												};
												let notification_type = 'post_share';
												let notify_users = [postDetails.posted_by];
												userCollection
													.findOne({ user_id: postDetails.posted_by })
													.then((userDetails) => {
														if (
															userDetails.user_id != validatedData.posted_by
														) {
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
																post_id: notification_details.post_id,
																type: 'postShare',
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
															notifications.sendPush2(
																userDetails.firebase_token,
																'Follow Request',
																pushData,
																true,
																email
															);
															// sendPush(
															//   userDetails.firebase_token,
															//   "Follow Request",
															//   pushData,
															//   true,
															// );
															/**/
															NOTIFICATION.addNotification(
																CLIENT,
																req,
																res,
																notification_type,
																notify_users,
																notification_details,
																function (err, notificationResp) {
																	postCollection.insertOne(
																		validatedData,
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
															);
															/**/
														} else {
															postCollection.insertOne(
																validatedData,
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
													})
													.catch((err) => console.error(err));
											})
											.catch((err) => console.error(err));
									})
									.catch((err) => console.error(err));
							} else {
								if (validatedData.posted_for == 'group') {
									/* Get group members */
									let groupCollection = CONNECTION.collection(
										GROUP_MODEL.collection_name
									);
									const userCollection = CONNECTION.collection(
										USER_MODEL.collection_name
									);
									groupCollection.findOne(
										{ group_id: validatedData.group_id },
										function (err, response) {
											if (err) {
												cb(err);
											} else {
												console.log('=== GROUP ===');
												//add_group_post
												let notification_details = {
													text_template:
														'{{USER_ID_' +
														validatedData.posted_by +
														'}} posted on group',
													post_id: validatedData.post_id,
												};
												let notification_type = 'add_group_post';
												let notify_users = [];

												/* === */
												userCollection
													.findOne({ user_id: validatedData.posted_by })
													.then((senderDetails) => {
														var userName =
															senderDetails.first_name +
															' ' +
															senderDetails.last_name;

														let pushData = {
															status: 'Group Post',
															title: 'Group Post',
															body: `${userName} posted on ${response.group_title}`,
															image: postImagePath,
															sound: 'default',
															mutable_content: true,
															content_available: true,
															data: {
																status: 'Group Post',
																message: `${userName} posted on ${response.group_title}`,
																image: postImagePath,
																notification_type: 'add_group_post',
																post_id: validatedData.post_id,
															},
														};

														response.group_members.forEach((member) => {
															userCollection
																.findOne({ user_id: member })
																.then((userDetails) => {
																	console.log(
																		'userId = postedBy : ' +
																			userDetails.user_id +
																			' = ' +
																			validatedData.posted_by
																	);
																	if (
																		userDetails.user_id !=
																		validatedData.posted_by
																	) {
																		console.log('Notification yes');
																		notify_users.push(userDetails.user_id);
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
																			post_id: notification_details.post_id,
																			group_title: response.group_title,
																			type: 'postOnGroup',
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
																		notifications.sendPush2(
																			userDetails.firebase_token,
																			'Follow Request',
																			pushData,
																			true,
																			email
																		);
																		// sendPush(
																		//   userDetails.firebase_token,
																		//   "Follow Request",
																		//   pushData,
																		//   true,
																		// );
																	} else {
																		console.log('Notification no');
																	}
																})
																.catch((err) => console.error(err));
														});
													})
													.catch((err) => console.error(err));
												/* === */

												/**/
												NOTIFICATION.addNotification(
													CLIENT,
													req,
													res,
													notification_type,
													notify_users,
													notification_details,
													function (err, notificationResp) {
														console.log(err);
														console.log(notificationResp);
														postCollection.insertOne(
															validatedData,
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
												);
												/**/
												console.log('=== GROUP ===');
											}
										}
									);
								} else {
									postCollection.insertOne(
										validatedData,
										async function (err, response) {
											if (err) {
												cb(err);
											} else {
												console.log(response);
												// let finalResponse = {};
												// finalResponse.status = true;
												// cb(null, finalResponse);
												/* */
												if (validatedData.tagged_id) {
													let notification_details = {
														text_template:
															'{{USER_ID_' +
															req.authorization.user_id +
															'}} has Tagged in post',
														tag_id: validatedData.tagged_id,
													};
													let notification_type = 'user_tagged';
													let notify_users = [validatedData.tagged_id];
													const userCollection = CONNECTION.collection(
														USER_MODEL.collection_name
													);
													await userCollection
														.findOne({ user_id: req.authorization.user_id })
														.then((Details) => {
															let pushData = {
																status: 'Tagged By User',
																title: 'Tagged By User',
																body: `${Details.first_name} ${Details.last_name} has Tagged you`,
																image: postImagePath,
																sound: 'default',
																mutable_content: true,
																content_available: true,
																data: {
																	status: 'Tagged By User',
																	message: `${Details.first_name} ${Details.last_name} has Tagged you`,
																	image: postImagePath,
																	notification_type: notification_type,
																	tag_id: validatedData?.tag_id,
																},
															};
															notify_users[0].forEach((user) => {
																userCollection
																	.findOne({
																		$or: [
																			{ user_id: user },
																			{ user_name: user },
																		],
																	})
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
																			post_id: validatedData?.post_id,
																			type: 'taggedByUser',
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
																		notifications.sendPush2(
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
													NOTIFICATION.addNotification(
														CLIENT,
														req,
														res,
														notification_type,
														notify_users,
														notification_details,
														async function (err, notificationResp) {
															/* Get followers and send notification */
															const userCollection = CONNECTION.collection(
																USER_MODEL.collection_name
															);
															let notification_type = 'post_like';
															await userCollection
																.findOne({ user_id: req.authorization.user_id })
																.then((Details) => {
																	var notify_users = Details.follower_ids;
																	let pushData = {
																		status: 'Post created By User',
																		title: 'Post created By User',
																		body: `${Details.first_name} ${Details.last_name} has created a new post`,
																		image: postImagePath,
																		sound: 'default',
																		mutable_content: true,
																		content_available: true,
																		data: {
																			status: 'Post created By User',
																			message: `${Details.first_name} ${Details.last_name} has created a new post`,
																			image: postImagePath,
																			notification_type: notification_type,
																			post_id: validatedData?.post_id,
																		},
																	};
																	console.log(pushData);
																	notify_users.forEach((user) => {
																		if (req.authorization.user_id != user) {
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
																						post_id: validatedData?.post_id,
																						type: 'postCreated',
																						toUser: {
																							user_id: userDetails.user_id,
																							first_name:
																								userDetails.first_name,
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
																					notifications.sendPush2(
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
																		}
																	});
																})
																.catch((err) => console.error(err));
															/* *********************************** */
															let finalResponse = {};
															finalResponse.status = true;
															cb(null, finalResponse);
														}
													);
												} else {
													/* Get followers and send notification */
													const userCollection = CONNECTION.collection(
														USER_MODEL.collection_name
													);
													let notification_type = 'post_like';
													await userCollection
														.findOne({ user_id: req.authorization.user_id })
														.then((Details) => {
															var notify_users = Details.follower_ids;
															let pushData = {
																status: 'Post created By User',
																title: 'Post created By User',
																body: `${Details.first_name} ${Details.last_name} has created a new post`,
																image: postImagePath,
																sound: 'default',
																mutable_content: true,
																content_available: true,
																data: {
																	status: 'Post created By User',
																	message: `${Details.first_name} ${Details.last_name} has created a new post`,
																	image: postImagePath,
																	notification_type: notification_type,
																	post_id: validatedData?.post_id,
																},
															};
															console.log(pushData);
															notify_users.forEach((user) => {
																if (req.authorization.user_id != user) {
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
																				post_id: validatedData?.post_id,
																				type: 'postCreated',
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
																			notifications.sendPush2(
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
																}
															});
														})
														.catch((err) => console.error(err));
													/* *********************************** */

													let finalResponse = {};
													finalResponse.data = validatedData;
													finalResponse.status = true;
													cb(null, finalResponse);
												}
												/* */
											}
										}
									);
								}
							}
						}
					}
				);
			});
		});
	});
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

module.exports.updateVideoPlayCount = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let postCollection = CONNECTION.collection(Model.collection_name);
	let post_id = Number(req.params.post_id);

	postCollection.findOne(
		{ post_id: post_id, post_type: 'video' },
		function (err, result) {
			if (err) {
				cb(err);
			} else {
				if (result) {
					var min = Math.ceil(35);
					var max = Math.floor(45);
					let RanNo = Math.floor(Math.random() * (max - min) + min);
					var curCount = RanNo;
					console.log('RanNo: ' + RanNo);
					if (result.video_play_count) {
						var curCount = Number(result.video_play_count);
						curCount = parseInt(curCount) + parseInt(RanNo);
						postCollection.findOneAndUpdate(
							{
								post_id: post_id,
							},
							{ $set: { video_play_count: curCount } },
							function (err, response) {
								if (err) {
									cb(err);
								} else {
									console.log(result);
									let finalResponse = {};
									finalResponse.status = true;
									finalResponse.counter = curCount;
									cb(null, finalResponse);
								}
							}
						);
					} else {
						postCollection.findOneAndUpdate(
							{
								post_id: post_id,
							},
							{ $set: { video_play_count: curCount } },
							function (err, response) {
								if (err) {
									cb(err);
								} else {
									console.log(result);
									let finalResponse = {};
									finalResponse.status = true;
									finalResponse.counter = curCount;
									cb(null, finalResponse);
								}
							}
						);
					}
				} else {
					let finalResponse = {};
					finalResponse.status = false;
					finalResponse.result = 'No post found';
					cb(null, finalResponse);
				}
			}
		}
	);
};

module.exports.editPost = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let postCollection = CONNECTION.collection(Model.collection_name);
	let post_id = Number(req.params.post_id);
	let body = utility.filterBody(req.body);
	if (body === {}) {
		return cb({ error: 'invalid data' }, false);
	}

	const hashTags = utility.getHashTags(body.post_text);
	HASHTAG_MODULE.addUpdateHashtags(CLIENT, hashTags, (err, hashtagsArr) => {
		/* If not follower then follow */
		if (hashtagsArr[0]) {
			if (hashtagsArr[0].followers.indexOf(req.authorization.user_id) == -1) {
				HASHTAG_MODULE.followHashtagFromPost(
					CLIENT,
					hashtagsArr[0].hashtag_slug,
					req.authorization.user_id,
					function (err, result) {
						console.log(result);
					}
				);
			}
		}
		/* *********** */
		if (!Array.isArray(hashtagsArr)) {
			hashtagsArr = [];
		}
		body.hashtags = hashtagsArr.map((x) => x.hashtag_slug);
		utility.validatePostData(
			CONNECTION,
			body,
			Model,
			'update',
			post_id,
			function (err, validatedData) {
				if (err) {
					cb(err);
				} else {
					postCollection.findOneAndUpdate(
						{
							post_id: post_id,
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
	});
};

module.exports.deletePost = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let postCollection = CONNECTION.collection(Model.collection_name);
	let post_id = Number(req.params.post_id);
	postCollection.findOne({ post_id: post_id }, (err, postData) => {
		if (postData.posted_for === 'group') {
			const groupCollection = CONNECTION.collection(
				GROUP_MODEL.collection_name
			);
			groupCollection.findOne(
				{
					group_id: postData.group_id,
					group_admins: req.authorization.user_id,
				},
				(err, groupDetails) => {
					if (groupDetails) {
						// I am Group Admin
						postCollection.deleteOne(
							{ post_id: post_id },
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
					} else {
						postCollection.deleteOne(
							{ post_id: post_id, posted_by: req.authorization.user_id },
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
		} else {
			postCollection.deleteOne(
				{ post_id: post_id, posted_by: req.authorization.user_id },
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
	});
};

// Related Functions
const postedByUserLookup = {
	$lookup: {
		from: userCollectionName,
		localField: 'posted_by',
		foreignField: 'user_id',
		as: 'userDetails',
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
						user_name: { $ifNull: ['$user_name', ''] },
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
						blocked_ids: { $ifNull: ['$blocked_ids', []] },
					},
				},
			],
			as: 'userDetails',
		},
	};
};

const commentLookup = {
	$lookup: {
		from: commentCollectionName,
		localField: 'post_id',
		foreignField: 'post_id',
		as: 'comments',
	},
};

const getComments = function (limit = 3, userId) {
	return {
		$lookup: {
			from: commentCollectionName,
			let: {
				postId: '$post_id',
			},
			pipeline: [
				{
					$match: {
						$expr: {
							$eq: ['$post_id', '$$postId'],
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
						post_id: 1,
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
							$ifNull: [{ $arrayElemAt: ['$userDetails.user_name', 0] }, ''],
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
							$ifNull: [{ $arrayElemAt: ['$userDetails.user_name', 0] }, ''],
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

const postProjection = {
	$project: {
		post_text: 1,
		post_image: 1,
		post_video: 1,
		thumbnail: 1,
		posted_by: 1,
		posted_for: 1,
		promoted: 1,
		group_id: 1,
		post_type: 1,
		like_count: 1,
		comment_count: 1,
		post_date: 1,
		post_privacy: 1,
		post_id: 1,
		// comments: 1,
		comments: [],
		bg_image_post: { $ifNull: ['$bg_image_post', false] },
		bg_map_post: { $ifNull: ['$bg_map_post', false] },
		bg_image: 1,
		post_location: 1,
		post_lat_long: 1,
		// seen_by: 1,
		// is_seen:1,
		dimension: 1,
		shared_post_data: { $arrayElemAt: ['$shared_post_data', 0] },
		advert_details: {
			$arrayElemAt: ['$advert_details', 0],
		},
		audience_details: {
			$arrayElemAt: ['$audience_details', 0],
		},
		liked: {
			$cond: [{ $eq: [{ $arrayElemAt: ['$liked.count', 0] }, 1] }, true, false],
		},
		first_name: { $arrayElemAt: ['$userDetails.first_name', 0] },
		last_name: { $arrayElemAt: ['$userDetails.last_name', 0] },
		user_id: { $arrayElemAt: ['$userDetails.user_id', 0] },
		user_name: {
			$ifNull: [{ $arrayElemAt: ['$userDetails.user_name', 0] }, ''],
		},
		private: { $arrayElemAt: ['$userDetails.private', 0] },
		profile_image_url: { $arrayElemAt: ['$userDetails.profile_image_url', 0] },
		following: { $arrayElemAt: ['$userDetails.following', 0] },
		enable_follow: { $arrayElemAt: ['$userDetails.enable_follow', 0] },
		// "users_blocked": { $cond: { if: { 'userDetails.blocked_ids': { $elemMatch: { $eq: '' } } }, then: true, else: false } },
		// liked_by: 1,
		liked_by: [],
		requestedUser: {
			$cond: [
				{ $gt: [{ $arrayElemAt: ['$requestedUsers.count', 0] }, 0] },
				true,
				false,
			],
		},
		video_play_count: 1,
		tagged_id: 1,
		font_face: { $ifNull: ['$font_face', ''] },
		image_size: { $ifNull: ['$image_size', ''] },
	},
};

const likedByMeLookup = (currentUserId) => {
	return {
		$lookup: {
			from: likeCollectionName,
			let: {
				postId: '$post_id',
			},
			pipeline: [
				{
					$match: {
						$expr: {
							$eq: ['$post_id', '$$postId'],
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
				postId: '$post_id',
			},
			pipeline: [
				{
					$match: {
						$expr: {
							$eq: ['$post_id', '$$postId'],
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

const advertDetailsLookup = () => {
	return {
		$lookup: {
			from: 'advert',
			localField: 'post_id',
			foreignField: 'post',
			as: 'advert_details',
		},
	};
};

const audienceDetailsLookup = () => {
	return {
		$lookup: {
			from: 'audience',
			localField: 'advert_details.audience',
			foreignField: 'audience_id',
			as: 'audience_details',
		},
	};
};

const sharedPostLookup = function () {
	return {
		$lookup: {
			from: Model.collection_name,
			let: {
				postId: '$share_post_id',
			},
			pipeline: [
				{
					$match: {
						$expr: {
							$eq: ['$post_id', '$$postId'],
						},
					},
				},
				postedByUserLookup,
				postProjection,
			],
			as: 'shared_post_data',
		},
	};
};

module.exports.getPostById = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let postCollection = CONNECTION.collection(Model.collection_name);
	let post_id = Number(req.params.post_id);

	postCollection
		.aggregate([
			{
				$match: {
					post_id: post_id,
					post_status: 'active',
				},
			},
			sharedPostLookup(req.authorization.user_id),
			getComments(1000, req.authorization.user_id),
			getRequestedUsers(1000, req.authorization.user_id),
			postedByUserLookupFunc(req.authorization.user_id),
			likedByMeLookup(req.authorization.user_id),
			postProjection,
		])
		.toArray((err, postList) => {
			if (err) {
				cb(err);
			} else {
				if (postList[0]) {
					let postDetails = postList[0];

					var curUser = req.authorization.user_id;
					/*****/
					let followButton = {};
					if (curUser != postDetails.user_id) {
						if (postDetails.following) {
							followButton = {
								button_text: 'Following',
								button_link: '#',
								button_type: 'warning',
							};
						} else {
							if (postDetails.requestedUser) {
								followButton = {
									button_text: 'Requested',
									button_link: '#',
									button_type: 'warning',
								};
							} else {
								followButton = {
									button_text:
										postDetails.private === true ? 'Request' : 'Follow',
									button_link: '/profile/' + postDetails.user_id + '/follow',
									button_type: 'success',
								};
							}
						}
					}
					postDetails.request_buttons = [followButton];
					/*****/

					if (postDetails.posted_for === 'group') {
						const groupCollection = CONNECTION.collection(
							GROUP_MODEL.collection_name
						);
						groupCollection.findOne(
							{
								group_id: postDetails.group_id,
								group_admins: req.authorization.user_id,
							},
							(err, groupDetails) => {
								if (groupDetails) {
									postDetails.group_admin = true;
									let finalResponse = {};
									finalResponse.status = true;
									// const cipherPostList = CryptoJs.AES.encrypt(JSON.stringify(postDetails), process.env.CRYPTO_SECRET).toString();
									// finalResponse.data = cipherPostList;
									finalResponse.data = postDetails;
									cb(null, finalResponse);
								} else {
									postDetails.group_admin = false;
									let finalResponse = {};
									finalResponse.status = true;
									// const cipherPostList = CryptoJs.AES.encrypt(JSON.stringify(postDetails), process.env.CRYPTO_SECRET).toString();
									// finalResponse.data = cipherPostList;
									finalResponse.data = postDetails;
									cb(null, finalResponse);
								}
							}
						);
					} else {
						postDetails.group_admin = false;
						let finalResponse = {};
						finalResponse.status = true;
						// const cipherPostList = CryptoJs.AES.encrypt(JSON.stringify(postDetails), process.env.CRYPTO_SECRET).toString();
						// finalResponse.data = cipherPostList;
						finalResponse.data = postDetails;
						cb(null, finalResponse);
					}
				} else {
					let error = new Error();
					error.name = 'NOT_FOUND_ERROR';
					cb(error);
				}
			}
		});
};

module.exports.reportPostByPostId = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let postCollection = CONNECTION.collection(Model.collection_name);
	let post_id = Number(req.params.post_id);
	postCollection.findOne({ post_id: post_id }, (err, postDetails) => {
		if (!postDetails) {
			let error = new Error('Invalid Post');
			cb(error);
		} else {
			const reportCollection = CONNECTION.collection('report');
			let reportData = {
				report_for: 'post',
				post_id: post_id,
				reported_by: req.authorization.user_id,
				report_time: new Date(),
				report_reason: req.body['report_reason'],
				report_status: 'pending',
			};
			reportCollection.insertOne(reportData, (err, inserted) => {
				if (postDetails.posted_for === 'group') {
					const groupCollection = CONNECTION.collection(
						GROUP_MODEL.collection_name
					);
					groupCollection.findOne(
						{ group_id: postDetails.group_id },
						async (err, groupDetails) => {
							let notification_details = {
								text_template:
									'{{USER_ID_' +
									req.authorization.user_id +
									'}} has reported a Post in your Group',
								post_id: post_id,
							};

							let notification_type = 'group_post_report';
							let notify_users = groupDetails.group_admins;
							let userCollection = CONNECTION.collection(userCollectionName);
							await userCollection
								.findOne({ user_id: req.authorization.user_id })
								.then((Details) => {
									let pushData = {
										status: 'Group Post Report',
										title: 'Group Post Report',
										body: `${Details.first_name} ${Details.last_name} has reported a Post in your Group`,
										sound: 'default',
										mutable_content: true,
										content_available: true,
										data: {
											status: 'Group Post Report',
											message: `${Details.first_name} ${Details.last_name} has reported a Post in your Group`,
											notification_type: notification_type,
											post_id: notification_details.post_id,
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
													post_id: notification_details.post_id,
													type: 'groupPostReport',
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
												notifications.sendPush2(
													userDetails.firebase_token,
													'Group Post Report',
													pushData,
													true,
													email
												);
												// sendPush(
												//   userDetails.firebase_token,
												//   "Group Post Report",
												//   pushData,
												//   true,
												// );
											})
											.catch((err) => console.error(err));
									});
								})
								.catch((err) => console.error(err));
							NOTIFICATION.addNotification(
								CLIENT,
								req,
								res,
								notification_type,
								notify_users,
								notification_details,
								function (err, notificationResp) {
									let finalResponse = {};
									finalResponse.status = true;
									cb(null, finalResponse);
								}
							);
						}
					);
				} else {
					cb(err, { status: true, data: 'Report Successful!' });
				}
			});
		}
	});
};

module.exports.getPostLikes = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let postLikesCollection = CONNECTION.collection(LIKE_MODEL.collection_name);
	let post_id = Number(req.params.post_id);

	postLikesCollection
		.aggregate([
			{
				$match: {
					like_type: 'post',
					post_id: post_id,
				},
			},
			{
				$lookup: {
					from: 'user',
					localField: 'liked_by',
					foreignField: 'user_id',
					as: 'userDetails',
				},
			},
			{
				$project: {
					email: { $arrayElemAt: ['$userDetails.email', 0] },
					first_name: { $arrayElemAt: ['$userDetails.first_name', 0] },
					last_name: { $arrayElemAt: ['$userDetails.last_name', 0] },
					profile_image_url: {
						$arrayElemAt: ['$userDetails.profile_image_url', 0],
					},
					user_id: { $arrayElemAt: ['$userDetails.user_id', 0] },
					user_name: { $arrayElemAt: ['$userDetails.user_name', 0] },
				},
			},
		])
		.toArray((err, userList) => {
			if (userList) {
				userList.map((x) => (x.request_buttons = []));
			}
			cb(err, { status: true, data: userList });
		});
};

module.exports.hidePostByPostId = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let post_id = Number(req.params.post_id);
	const user_id = req.authorization.user_id;
	const userCollection = CONNECTION.collection(USER_MODEL.collection_name);
	userCollection.findOneAndUpdate(
		{ user_id: user_id },
		{ $addToSet: { hidden_posts: post_id } },
		(err, updated) => {
			cb(err, { status: true });
		}
	);
};

module.exports.getPostBackgrounds = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	console.log('DDDDD');
	const postBackgroundCollection = CONNECTION.collection('post_backgrounds');
	postBackgroundCollection.find({}).toArray((err, backgrounds) => {
		cb(err, { status: true, data: backgrounds });
	});
};

module.exports.updatePostSeenuser = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let postCollection = CONNECTION.collection(Model.collection_name);
	let post_id = Number(req.params.post_id);
	let user_id = req.authorization.user_id;

	postCollection.findOneAndUpdate(
		{ post_id: post_id },
		{ $addToSet: { seen_by: user_id } },
		(err, updated) => {
			let finalResponse = {};
			finalResponse.status = true;
			// finalResponse.data = updated;
			cb(err, finalResponse);
		}
	);
};

module.exports.getPostSeenuser = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let postCollection = CONNECTION.collection(Model.collection_name);
	let user_id = req.authorization.user_id;

	db.getCollection('your-collection').aggregate([
		{
			$match: {
				Rank: { $gt: 24 },
			},
		},
		{ $sort: { Rank: 1 } },
		{
			$limit: 20,
		},
	]);
	postCollection
		.aggregate([
			{
				$match: {
					seen_by: user_id,
				},
			},
		])
		.toArray((err, userList) => {
			console.log('seen======>', userList);
			if (err) {
				cb(err);
			}
			postCollection
				.aggregate([
					{
						$match: {
							seen_by: !user_id,
						},
					},
				])
				.toArray((err, userSeenList) => {
					console.log('unSeen=========>', userSeenList);
					let finalResponse = {};
					finalResponse.status = true;
					finalResponse.seen = userList;
					finalResponse.unSeen = userSeenList;
					cb(null, finalResponse);
				});
		});
};

module.exports.updatePostViewCount = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let postCollection = CONNECTION.collection(Model.collection_name);
	let post_id = Number(req.params.post_id);

	postCollection.findOne({ post_id: post_id }, function (err, result) {
		if (err) {
			cb(err);
		} else {
			if (result) {
				var curCount = 1;
				if (result.post_view_count) {
					curCount = Number(result.post_view_count);
					curCount = parseInt(curCount) + parseInt(1);
					postCollection.findOneAndUpdate(
						{
							post_id: post_id,
						},
						{ $set: { post_view_count: curCount } },
						function (err, response) {
							if (err) {
								cb(err);
							} else {
								let finalResponse = {};
								finalResponse.status = true;
								finalResponse.counter = curCount;
								cb(null, finalResponse);
							}
						}
					);
				} else {
					postCollection.findOneAndUpdate(
						{
							post_id: post_id,
						},
						{ $set: { post_view_count: curCount } },
						function (err, response) {
							if (err) {
								cb(err);
							} else {
								let finalResponse = {};
								finalResponse.status = true;
								finalResponse.counter = curCount;
								cb(null, finalResponse);
							}
						}
					);
				}
			} else {
				let finalResponse = {};
				finalResponse.status = false;
				finalResponse.result = 'No post found';
				cb(null, finalResponse);
			}
		}
	});
};

module.exports.updateMostPopularSeen = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(userCollectionName);
	let post_id = Number(req.params.post_id);
	let user_id = req.authorization.user_id;

	userCollection.findOneAndUpdate(
		{ user_id: user_id },
		{ $addToSet: { mostpopularpostseen: post_id } },
		(err, updated) => {
			let finalResponse = {};
			finalResponse.status = true;
			cb(err, finalResponse);
		}
	);
};

module.exports.updateMostPopularSeenOpen = function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let userCollection = CONNECTION.collection(userCollectionName);
	let post_id = Number(req.params.post_id);
	let user_id = Number(req.body.user_id);

	userCollection.findOneAndUpdate(
		{ user_id: user_id },
		{ $addToSet: { mostpopularpostseen: post_id } },
		(err, updated) => {
			let finalResponse = {};
			finalResponse.status = true;
			cb(err, finalResponse);
		}
	);
};
