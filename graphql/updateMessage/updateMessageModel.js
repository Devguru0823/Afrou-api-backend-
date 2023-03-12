'use strict';
const Model = require('../../models/message.json');
const userModel = require('../../models/user.json');
let utility = require('../../utilities');
const { likesLookup, likedByMeLookup } = require('../../models/message');

module.exports.updateMessage = function (args, context, req, res) {
	return new Promise((resolve, reject) => {
		utility.mongoConnect(req, res, function (CLIENT) {
			// Model.updateMessage(CLIENT, req, res, function (err, response) {
			let CONNECTION = CLIENT.db(utility.dbName);
			let messageCollection = CONNECTION.collection(Model.collection_name);

			let newMessageData = utility.filterBody(args.message);
			if (newMessageData === {}) {
				return reject({ error: 'invalid data' });
			}

			var user_id = context.user.user_id;

			let message_id = Number(args.message.message_id);

			utility.validatePostData(
				CONNECTION,
				newMessageData,
				Model,
				'update',
				message_id,
				function (err, validatedData) {
					if (err) {
						reject(err);
					} else {
						messageCollection.findOneAndUpdate(
							{ message_id: message_id },
							{ $set: validatedData },
							async function (err, response) {
								if (err) {
									reject(err);
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
													if (
														Details_to.blocked_ids &&
														Details_to.blocked_ids.indexOf(Details.user_id) !==
															-1
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
																		$arrayElemAt: [
																			'$fromUserDetails.last_name',
																			0,
																		],
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
																					{
																						$arrayElemAt: ['$liked.count', 0],
																					},
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
															console.log({ messageList });
															if (
																messageList &&
																Array.isArray(messageList) &&
																messageList.length
															) {
																messageList[0].blocked_by_me =
																	Details_to.blocked_by_me;
																messageList[0].message_text =
																	validatedData.message_text;
																messageList[0].updated_date =
																	validatedData.updated_date;
																resolve(messageList[0]);
															} else {
																resolve([]);
															}
														});
												});
										});
								}
							}
						);
					}
				}
			);
		});
	});
	// });
};
