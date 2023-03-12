'use strict';
const Model = require('../../models/post.json');
let utility = require('../../utilities');
const SITE_CONFIG = require('../../configs/siteConfig');
const USER_MODEL = require('../../models/user.json');
const {
	sharedPostLookup,
	getComments,
	getRequestedUsers,
	postedByUserLookupFunc,
	likedByMeLookup,
	postProjection,
} = require('../../models/post');

// module.exports.getHashtagPosts = function (args, context, req, res) {
//   return new Promise((resolve, reject) => {
//     utility.mongoConnect(req, res, function (CLIENT) {
//       let CONNECTION = CLIENT.db(utility.dbName);
//       let postCollection = CONNECTION.collection(Model.collection_name);
//       const hashtag_slug = args.slug;
//       const userCollection = CONNECTION.collection(USER_MODEL.collection_name);
//       userCollection.findOne(
//         { user_id: context.user.user_id },
//         (err, userDetails) => {
//           let hiddenPosts = [];
//           if (userDetails.hidden_posts) {
//             hiddenPosts = [...userDetails.hidden_posts];
//           }

//           // Pagination
//           let page = Number(args.page) || 1;
//           let limit = SITE_CONFIG.postsLimitPerPage;
//           let skip = (page - 1) * limit;

//           // Sorting
//           let sort = {
//             post_date: -1,
//           };

//           postCollection
//             .aggregate([
//               {
//                 $match: {
//                   // posted_for: 'hashtag',
//                   hashtags: hashtag_slug,
//                   post_status: "active",
//                   post_id: { $nin: hiddenPosts },
//                 },
//               },
//               {
//                 $sort: sort,
//               },
//               {
//                 $skip: skip,
//               },
//               {
//                 $limit: limit,
//               },
//               sharedPostLookup(),
//               getComments(1000, context.user.user_id),
//               getRequestedUsers(1000, context.user.user_id),
//               postedByUserLookupFunc(context.user.user_id),
//               likedByMeLookup(context.user.user_id),
//               postProjection,
//               {
//                 $match: {
//                   $or: [
//                     { post_type: { $ne: "shared" } },
//                     {
//                       $and: [
//                         { post_type: "shared" },
//                         {
//                           shared_post_data: {
//                             $exists: true,
//                             $not: { $size: 0 },
//                           },
//                         },
//                       ],
//                     },
//                   ],
//                 },
//               },
//             ])
//             .toArray((err, postList) => {
//               if (err) {
//                 reject(err);
//               } else {
//                 postList.forEach((post) => {
//                   var curUser = context.user.user_id;
//                   /*****/
//                   let followButton = {};
//                   if (curUser != post.user_id) {
//                     if (post.following) {
//                       followButton = {
//                         button_text: "Following",
//                         button_link: "#",
//                         button_type: "warning",
//                       };
//                     } else {
//                       if (post.requestedUser) {
//                         followButton = {
//                           button_text: "Requested",
//                           button_link: "#",
//                           button_type: "warning",
//                         };
//                       } else {
//                         followButton = {
//                           button_text:
//                             post.private === true ? "Request" : "Follow",
//                           button_link: "/profile/" + post.user_id + "/follow",
//                           button_type: "success",
//                         };
//                       }
//                     }
//                   }
//                   post.request_buttons = [followButton];
//                   /*****/
//                 });
//                 let finalResponse = {};
//                 finalResponse.status = true;
//                 // const cipherPostList = CryptoJs.AES.encrypt(JSON.stringify(postList), process.env.CRYPTO_SECRET).toString();
//                 // finalResponse.data = cipherPostList;
//                 finalResponse.data = postList;
//                 finalResponse.count = postList.length;
//                 finalResponse.currentPage = page;
//                 finalResponse.nextPage = page + 1;
//                 resolve(finalResponse);
//               }
//             });
//         }
//       );
//     });
//   });
// };

module.exports.getHashtagPosts = function (args, context, req, res) {
	return new Promise(async (resolve, reject) => {
		utility.mongoConnect(req, res, function (CLIENT) {
			let CONNECTION = CLIENT.db(utility.dbName);
			let postCollection = CONNECTION.collection(Model.collection_name);
			const hashtag_slug = args.slug;
			const userCollection = CONNECTION.collection(USER_MODEL.collection_name);
			userCollection.findOne(
				{ user_id: context.user.user_id },
				(err, userDetails) => {
					let hiddenPosts = [];
					if (userDetails.hidden_posts) {
						hiddenPosts = [...userDetails.hidden_posts];
					}

					// Pagination
					let page = Number(args.page) || 1;
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
							getComments(1000, context.user.user_id),
							getRequestedUsers(1000, context.user.user_id),
							postedByUserLookupFunc(context.user.user_id),
							likedByMeLookup(context.user.user_id),
							postProjection,
						])
						.toArray((err, postList) => {
							if (err) {
								reject(err);
							} else {
								postList.forEach((post) => {
									var curUser = context.user.user_id;
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
								return resolve(finalResponse);
							}
						});
				}
			);
		});
	});
};
