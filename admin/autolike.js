'use strict';
let router = require('express').Router();
let utility = require('../utilities');
let CronJob = require('cron').CronJob;




const { sendPush } = require('../_helpers/push-notification');
const NOTIFICATION = require('../models/notification.js');

const getRandomLike = async function (perMinuteCount) {
	return;
	// const rndInt = randomIntFromInterval(1, 20);
	utility.mongoConnect({}, {},
		async function (CLIENT) {
			// if (err) {
			// 	console.log(err);
			// 	return;
			// }
			let CONNECTION = CLIENT.db('afrou_db');
			let userCollection = CONNECTION.collection('user');
			let postCollection = CONNECTION.collection('post');
			let likeCollection = CONNECTION.collection('likes');
			// let settingsData = await settingsCollection.find({ "setting_id": 1, "setting_type": "autolike" }).toArray();
			let autolikeCollection = CONNECTION.collection('autolike');
			let ALNCollection = CONNECTION.collection('autolikenotifylimites');

			await generateLike(
				CLIENT,
				CONNECTION,
				userCollection,
				postCollection,
				likeCollection,
				ALNCollection,
				1,
				1,
				autolikeCollection,
				perMinuteCount
			);
		}
	);
};

const generateLike = async function (
	CLIENT,
	CONNECTION,
	userCollection,
	postCollection,
	likeCollection,
	ALNCollection,
	likeRange = 1,
	numOfLike = 1,
	autolikeCollection,
	perMinuteCount
) {
	for (var i = 0; i < numOfLike; i++) {
		userCollection
			.aggregate([
				{
					$project: {
						user_id: 1,
						first_name: 1,
						last_name: 1,
						status: 1,
						last_active: 1,
						firebase_token: 1,
					},
				},
				{
					$match: {
						last_active: {
							$lt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
						},
						status: 'active',
					},
				},
				{ $sample: { size: 1 } },
			])
			.toArray((err, userList) => {
				if (err) {
					// cb(err);
				} else {
					let user_id = userList[0].user_id;
					postCollection
						.aggregate([
							{
								$project: {
									post_id: 1,
									posted_by: 1,
									post_date: 1,
									post_status: 1,
									posted_for: 1,
									post_type: 1,
									like_count: 1,
									video_play_count: 1,
								},
							},
							{
								$match: {
									// "post_date":likeRangeQuery,
									post_status: 'active',
									posted_for: 'afroswagger',
									posted_by: { $ne: user_id },
								},
							},
							{ $sample: { size: 1 } },
						])
						.toArray(async (errP, postLists) => {
							if (errP) {
								// console.log(errP)
								// cb(errP);
							} else {
								// console.log(postLists)
								if (postLists && postLists[0] && postLists[0].post_type) {
									if (
										postLists[0].post_type != 'video' ||
										(postLists[0].post_type == 'video' &&
											postLists[0].video_play_count)
									) {
										const post_id_results = [];
										await postLists.forEach((postList) => {
											post_id_results.push(postList.post_id);
										});
										likeCollection
											.aggregate([
												{
													$match: {
														post_id: { $in: post_id_results },
														like_type: 'post',
														liked_by: user_id,
													},
												},
											])
											.toArray(async (errP, likeLists) => {
												if (errP) {
													// cb(errP);
												} else {
													/* If like found then remove from list */
													likeLists.forEach((likeList) => {
														console.log('likeList: ' + likeList);
														console.log(likeList);
														const index = post_id_results.indexOf(
															likeList.post_id
														);
														if (index > -1) {
															post_id_results.splice(index, 1);
														}
													});
													// console.log(post_id_results);
													const post_id_result = post_id_results[0];
													if (post_id_result != null) {
														// post_id_results.forEach( async (post_id_result) => {
														// console.log("==> " + post_id_result);
														await generatePrimaryKey(
															CONNECTION,
															'likes',
															async function (err, primaryKeyValue) {
																if (err) {
																	// cb(err);
																} else {
																	var validatedData = {
																		post_id: post_id_result,
																		comment_id: 0,
																		liked_by: user_id,
																		like_type: 'post',
																		like_date: new Date(
																			Date.now()
																		).toISOString(),
																		created_date: new Date(
																			Date.now()
																		).toISOString(),
																		like_id: primaryKeyValue,
																		like_from: 'Cron',
																	};
																	// console.log(validatedData);
																	await likeCollection.insertOne(
																		validatedData,
																		async function (err, response) {
																			if (err) {
																				// cb(err);
																			} else {
																				/* Update like counter */
																				postCollection.findOneAndUpdate(
																					{ post_id: post_id_result },
																					{ $inc: { like_count: 1 } },
																					async function (err, resp) { }
																				);

																				autolikeCollection.findOneAndUpdate(
																					{ perMinute: perMinuteCount },
																					{ $inc: { count: 1 } },
																					async function (err, resp) { }
																				);
																				// ,perMinuteCount
																				/* ******************* */
																				console.log('Liked: ' + post_id_result);

																				let requested_by = user_id;
																				let requested_to =
																					postLists[0].posted_by;
																				let notification_details = {
																					text_template:
																						'{{USER_ID_' +
																						requested_by +
																						'}} liked  your post',
																					post_id: postLists[0].post_id,
																				};
																				let notification_type = 'post_like';
																				let notify_users = [requested_to];
																				let pushData = {};

																				var userName =
																					userList[0].first_name +
																					' ' +
																					userList[0].last_name;
																				if (
																					userList[0].user_name &&
																					userList[0].user_name != ''
																				) {
																					userName = userList[0].user_name;
																				}

																				pushData = {
																					status: 'Like',
																					title: 'Like on post',
																					body: `${userName} liked  your post`,
																					sound: 'default',
																					mutable_content: true,
																					content_available: true,
																					data: {
																						status: 'Like',
																						message: `${userName} liked  your post`,
																						notification_type:
																							notification_type,
																						post_id:
																							notification_details.post_id,
																					},
																				};
																				/** Get notification counter in last 2 hours */
																				let isSendNotification = true;
																				let now = new Date();
																				let expiry = new Date();
																				expiry.setHours(expiry.getHours() + 2);
																				let ALNuser =
																					await ALNCollection.findOne({
																						user_id: requested_to,
																					});
																				if (ALNuser) {
																					// Check counter and set flag.
																					if (ALNuser.notify_counter < 4) {
																						// increase counter
																						let updateRec =
																							await ALNCollection.findOneAndUpdate(
																								{ user_id: requested_to },
																								{ $inc: { notify_counter: 1 } }
																							);
																					} else {
																						if (now > ALNuser.limit_date) {
																							var ALNvalidatedData = {
																								start_date: new Date(
																									Date.now()
																								).toISOString(),
																								notify_counter: 1,
																								limit_date: expiry,
																							};
																							let updateRec =
																								await ALNCollection.findOneAndUpdate(
																									{ user_id: requested_to },
																									{ $set: ALNvalidatedData }
																								);
																						} else {
																							isSendNotification = false;
																						}
																					}
																				} else {
																					// create new entry in db
																					await generatePrimaryKey(
																						CONNECTION,
																						'autolikenotifylimites',
																						async function (
																							err,
																							ALNprimaryKeyValue
																						) {
																							if (err) {
																								// cb(err);
																							} else {
																								var ALNvalidatedData = {
																									start_date: new Date(
																										Date.now()
																									).toISOString(),
																									created_date: new Date(
																										Date.now()
																									).toISOString(),
																									aln_id: ALNprimaryKeyValue,
																									user_id: requested_to,
																									notify_counter: 1,
																									limit_date: expiry,
																								};
																								await ALNCollection.insertOne(
																									ALNvalidatedData
																								);
																							}
																						}
																					);
																				}
																				/** ************* **/
																				if (isSendNotification) {
																					notify_users.forEach((user) => {
																						userCollection
																							.findOne({ user_id: user })
																							.then((userDetails) => {
																								sendPush(
																									userDetails?.firebase_token,
																									'Like',
																									pushData,
																									true
																								);
																							})
																							.catch((err) =>
																								console.error(err)
																							);
																					});
																					var req = {};
																					var res = {};
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
																							finalResponse.data = 'Done';
																							// cb(null, finalResponse);
																						}
																					);
																				} else {
																					let finalResponse = {};
																					finalResponse.status = true;
																					finalResponse.data = 'Done';
																					return validatedData;
																				}
																			}
																		}
																	);
																}
															}
														);
														// });
													}
												}
											});
									}
								}
							}
						});
					/* ************** */
				}
			});
	}
	return true;
};

let generatePrimaryKey = function (CONNECTION, Model, cb) {
	let sequenceCollection = CONNECTION.collection('sequence');
	let collectionName = Model; //Model.collection_name;

	sequenceCollection.findOneAndUpdate(
		{ collection: collectionName },
		{ $inc: { counter: 1 } },
		{
			upsert: true,
			returnOriginal: false,
		},
		function (err, updatedSequence) {
			cb(err, updatedSequence.value.counter);
		}
	);
};

let tenLikesPerMin = new CronJob(
	'*/15 * * * * *',
	function () {
		// let after = Date.now()
		// let difference = (after - now) / 1000;

		// console.log(`\x1b[33m ${difference} \x1b[0m`);
		console.log('\x1b[33m autolike 10likes/1min running! \x1b[0m');
		// getRandomLike(10);
		// console.log("#######################################################");
	},
	function () {
		// console.log('\x1b[33m autolike 10likes/1min stop \x1b[0m');
	}
);
// 20/1min
let twentyLikesPerMin = new CronJob(
	'*/3 * * * * *',
	function () {
		// console.log('\x1b[33m autolike 20likes/1min running! \x1b[0m');
		// getRandomLike(20);
		// console.log('#######################################################');
	},
	function () {
		// console.log('\x1b[33m autolike 20likes/1min stop \x1b[0m');
	}
);
// 30/1min
let therteeLikesPerMin = new CronJob(
	'*/2 * * * * *',
	function () {
		// console.log('\x1b[33m autolike 30likes/1min running! \x1b[0m');
		// getRandomLike(30);
	},
	function () {
		// console.log('\x1b[33m autolike 30likes/1min stop \x1b[0m');
	}
);
// 60/1min
let sixtyLikesPerMin = new CronJob(
	'*/1 * * * * *',
	function () {
		// console.log('\x1b[33m autolike 60likes/1min running! \x1b[0m');
		// getRandomLike(60);
	},
	function () {
		// console.log('\x1b[33m autolike 60likes/1min stop \x1b[0m');
	}
);
// 120/1min
let hundredTwentyLikesPerMin = new CronJob(
	'*/2 * * * * *',
	async function () {
		console.log('\x1b[33m autolike 120likes/1min running! \x1b[0m');
		// await getRandomLike(120);
		// await getRandomLike(120);
		// console.log("#######################################################");
	},
	function () {
		console.log('\x1b[33m autolike 120likes/1min stop \x1b[0m');
	}
);
router.get('/', function (req, res, next) {
	getSwitches(req, res, (err, data) => {
		if (err) {
			console.log(err);
			return next(err);
		} else {
			if (Array.isArray(data)) {
				data.forEach((ele, index, arr) => {
					handleSwitches(ele.perMinute, ele.status);
				});
			}
			return res.send({ status: true, data });
		}
	});
});

router.post('/', function (req, res, next) {
	// let user_id = req.authorization.user_id;
	utility.mongoConnect(req, res, function (client) {
		console.log(req.body);
		let CONNECTION = client.db(utility.dbName);
		let autolikeCollection = CONNECTION.collection('autolike');
		if (!req.body.perMinute) {
			return res.send({ error: 'perMinute is required', status: false });
		}
		if (!'status' in req.body) {
			return res.send({ error: 'status is required', status: false });
		}
		const isBoolean = (val) => 'boolean' === typeof val;
		if (!isBoolean(req.body.status)) {
			return res.send({
				error: 'status must be a boolean value',
				status: false,
			});
		}
		let find = [10, 20, 30, 60, 120];
		if (!find.includes(Number(req.body.perMinute))) {
			return res.send({
				status: false,
				error: 'document with perMinute ' + req.body.perMinute + ' not exist ',
			});
		}
		autolikeCollection.findOneAndUpdate(
			{ perMinute: req.body.perMinute },
			{ $set: { status: req.body.status } },
			(err, data) => {
				if (err) {
					return next(err);
				} else {
					handleSwitches(req.body.perMinute, req.body.status);
					return res.send({ status: true });
				}
			}
		);
	});
});
/**
 * @description find switches in db ,  if not found creates a new one with the given value in `find` params
 * @default find [10,20,30,60,120]
 * @param {*} req
 * @param {*} res
 * @param {CallableFunction} cb
 * @param {Array} find
 */
function getSwitches(req, res, cb, find = [10, 20, 30, 60, 120]) {
	utility.mongoConnect(req, res, async function (client) {
		let CONNECTION = client.db(utility.dbName);
		let autolikeCollection = CONNECTION.collection('autolike');
		let data = [];

		find.forEach(function (perMinute, i, array) {
			autolikeCollection.findOneAndUpdate(
				{ perMinute: perMinute },
				{
					$setOnInsert: { perMinute: perMinute, status: false, count: 0 },
				},
				{
					returnOriginal: false,
					upsert: true,
				},
				function (err, val) {
					if (err) {
						console.log(err);
						cb(err, undefined);
					} else data.push(val.value);
					if (i === array.length - 1) cb(undefined, data);
				}
			);

			// console.log(val)
			// data.push(val.value)
		});
		console.log(data);
	});
}

function handleSwitches(perMinute, status, inMaintanance = false) {
	console.log({ perMinute, status, inMaintanance })
	// console.log(arguments);
	switch (perMinute) {
		case 10:
		case '10':
			if (status && inMaintanance == false) {
				if (!tenLikesPerMin.running) {
					tenLikesPerMin.start();
				}
			} else {
				if (tenLikesPerMin.running) {
					tenLikesPerMin.stop();
				}
			}
			break;
		case 20:
		case '20':
			if (status && inMaintanance == false) {
				if (!twentyLikesPerMin.running) {
					twentyLikesPerMin.start();
				}
			} else {
				if (twentyLikesPerMin.running) {
					twentyLikesPerMin.stop();
				}
			}
			break;
		case 30:
		case '30':
			if (status && inMaintanance == false) {
				if (!therteeLikesPerMin.running) {
					therteeLikesPerMin.start();
				}
			} else {
				if (therteeLikesPerMin.running) {
					therteeLikesPerMin.stop();
				}
			}
			break;
		case 60:
		case '60':
			if (status && inMaintanance == false) {
				if (!sixtyLikesPerMin.running) {
					sixtyLikesPerMin.start();
				}
			} else {
				if (sixtyLikesPerMin.running) {
					sixtyLikesPerMin.stop();
				}
			}
			break;

		case 120:
		case '120':
			if (status && inMaintanance == false) {
				if (!hundredTwentyLikesPerMin.running) {
					hundredTwentyLikesPerMin.start();
				}
			} else {
				if (hundredTwentyLikesPerMin.running) {
					hundredTwentyLikesPerMin.stop();
				}
			}
			break;
		default:
			break;
	}
}
// router.get("/like", async function (req, res, next) {
//   try {
//     getSwitches(req, res, (err, data) => {
//       res.send(data);
//     });
//   } catch (error) {
//     console.log(error);
//     res.send(false);
//   }
// });
module.exports = { router, handleSwitches, getSwitches, getRandomLike };
