// const bytnode = require("bytenode");
const utility = require('../utilities');
const userModel = require('./user.json');
const callModels = require('./calls.json');
const http2 = require('http2');
const fs = require('fs');
const qs = require('qs');
const nodePath = require('path');
// const {sendPush} = require("../_helpers/push-notification");
const FCM = require('fcm-push');
const serverKey =
	'AAAAzT4glkc:APA91bEXyhxjfKQVQK2LZZqvbzZAzBObWK9z8pwxPgvuQyFEi7lCuDiIqWVUJ26cKL2Kv0pCl5vW8PKRRHtfLdQCoLY_jpk9hvaDgsWLi33TM2M3e_Ei_ey7TxHGTTnc_uMYTVXkZjFU';
const fcm = new FCM(serverKey);
module.exports.callNotification = async function (CLIENT, req, res, cb) {
	console.log('inside callllllllllllll');
	try {
		let CONNECTION = CLIENT.db(utility.dbName);
		let userCollection = CONNECTION.collection(userModel.collection_name);
		let callCollection = CONNECTION.collection(callModels.collection_name);
		// console.log(userCollection, callCollection);
		let validationError = {};
		// if (!req.body.voip_token && req.body.voip_token=="") {
		//     validationError['voip_token'] = "is required";
		// }
		if (!req.body.to_id && req.body.to_id == '') {
			validationError['to_id'] = 'is required';
		}
		if (Object.keys(validationError).length > 0) {
			let vErr = new Error();
			vErr.name = 'VALIDATION_ERROR';
			vErr.message = validationError;
			cb(vErr);
		} else {
			let from_id = Number(req.authorization.user_id);
			// let from_id = 2149
			let to_id = Number(req.body.to_id);
			let callType = req.body.calltype;
			// let voip_token = req.body.voip_token.trim();

			// userCollection.findOneAndUpdate({ user_id: from_id }, { $set: { "voip_token": voip_token } }, { returnOriginal: false }, async function (err, response) {
			var callData = {};
			callData.caller = from_id;
			callData.receiver = to_id;
			callData.call_type = callType;
			callData.call_status = 'ongoing';
			callData.call_duration = '00:00:00';

			utility.validatePostData(
				CONNECTION,
				callData,
				callModels,
				'insert',
				0,
				async function (err, validatedData) {
					let callDetail = await callCollection.insertOne(validatedData);
					var call_id = validatedData.call_id;
					userCollection
						.findOne({ user_id: from_id })
						.then(async (response) => {
							// if (err) {
							//     cb(err);
							// } else {
							if (response) {
								console.log(response);
								var senderUser = response.first_name;
								if (response.user_name && response.user_name != '') {
									senderUser = response.user_name;
								}
								await userCollection
									.findOne({ user_id: to_id })
									.then(async (toUser) => {
										if (toUser) {
											console.log(toUser);
											let pushData = {
												status: 'Call from ' + senderUser,
												title: 'Call from ' + senderUser,
												body: `You are getting call from ${senderUser}`,
												sound: 'default',
												mutable_content: true,
												content_available: true,
												data: {
													status: 'Call from ' + senderUser,
													message: `You are getting call from ${senderUser}`,
													notification_type: 'call',
													call_type: callType,
													call_id: call_id,
													user_info: {
														first_name: response.first_name,
														last_name: response.last_name,
														user_id: response.user_id,
														blocked_by_me: toUser.blocked_by_me,
														profile_image_url: `https://cdn.afrocamgist.com/${response.profile_image_url}`,
														call_type: callType,
														call_id: call_id,
													},
												},
											};
											function sendVoip(request, res, voipId) {
												try {
													// file: ./index.js
													let cert = nodePath.resolve(
														nodePath.join(__dirname, '../cert/voip.pem')
													);
													let key = nodePath.resolve(
														nodePath.join(__dirname, '../cert/key.pem')
													);

													// The `http2.connect` method creates a new session with example.com
													const session = http2.connect(
														'https://api.sandbox.push.apple.com',
														{
															cert: fs.readFileSync(cert, 'utf-8'),
															key: fs.readFileSync(key, 'utf-8'),
															passphrase: 'keshav777',
															port: 443,
														}
													);
													let jsonData = JSON.stringify({
														aps: { caller: 'Caller Name' },
													});
													// const buffer = Buffer.from(jsonData);
													session.on('error', (err) => console.error(err));

													// 2698ff3b1a25b30e8864ba6f5dbcee1a2c5000da7d06ec4e5e18bc917e4a478b
													const req = session.request({
														':path': `/3/device/${toUser.voip_id}`,
														// ":path": `/3/device/2698ff3b1a25b30e8864ba6f5dbcee1a2c5000da7d06ec4e5e18bc917e4a478b`,
														':method': 'POST',
														// "apns-push-type": "voip",
														// "apns-expiration": "0",
														'apns-topic': 'com.app.Afrocamgist.voip',
														'Content-Type': 'application/json',
														'Content-Length': jsonData.length,
													});
													const sampleData = qs.stringify({
														aps: { caller: 'Caller Name' },
													});

													req.write(jsonData, 'utf-8');
													req.end();
													req.on('response', (headers) => {
														for (const name in headers) {
															console.log(`${name}: ${headers[name]}`);
														}
													});
													req.setEncoding('utf8');
													let data = '';
													req.on('data', (chunk) => {
														data += chunk;
													});
													req.on('end', () => {
														console.log('daata recieved');
														console.log(`\n${data}`);
														session.close();
													});
													req.on('error', console.log);
												} catch (error) {
													console.log(error);
												}
											}
											//                       function sendVoip() {
											//                         try {
											//                           // file: ./index.js
											//                           console.log("__________________________________");
											//                           console.log(toUser.voip_id);
											//                           console.log("__________________________________");

											//                           const session = http2.connect(
											//                             "https://api.push.apple.com",
											//                             {
											//                               cert: fs.readFileSync(
											//                                 "/home/omlinux/Documents/afrou-api/cert/voip.pem",
											//                                 "utf-8"
											//                               ),
											//                               key: fs.readFileSync(
											//                                 "/home/omlinux/Documents/afrou-api/cert/key.pem",
											//                                 "utf-8"
											//                               ),
											//                               passphrase: "keshav777",
											//                               port: 443,
											//                             }
											//                           );
											// // 2698ff3b1a25b30e8864ba6f5dbcee1a2c5000da7d06ec4e5e18bc917e4a478b
											//                           session.on("error", (err) => console.error(err));
											//                           const req = session.request({
											//                             ":path": `/3/device/2698ff3b1a25b30e8864ba6f5dbcee1a2c5000da7d06ec4e5e18bc917e4a478b`,
											//                             // ":path": `/3/device/${toUser.voip_id}`,
											//                             ":method": "POST",
											//                             // "apns-push-type": "voip",
											//                             // "apns-expiration": "0",
											//                             "apns-topic": "com.app.Afrocamgist.voip",
											//                             "Content-Type":"application/json"
											//                           });
											//                           const sampleData = JSON.stringify({
											//                             aps: { caller: "Caller Name" },
											//                           });
											//                           req.write(sampleData, "utf8");
											//                           req.end();

											//                           req.on("response", (headers) => {
											//                             for (const name in headers) {
											//                               console.log(`${name}: ${headers[name]}`);
											//                             }
											//                           });
											//                           req.setEncoding("utf8");
											//                           let data = "";

											//                           req.on("data", (chunk) => {
											//                             data += chunk;
											//                           });
											//                           req.on("end", () => {
											//                             console.log("daata recieved");
											//                             console.log(`\n${data}`);
											//                             session.close();
											//                           });
											//                         } catch (error) {
											//                           console.log(error);
											//                         }
											//                       }
											if (toUser.voip_id) {
												console.log(' voip sent');
												sendVoip();
											} else if (toUser.firebase_token) {
												try {
													sendPush(
														toUser.firebase_token,
														'call',
														pushData,
														true
													);
													console.log(' push sent');
												} catch (err) {
													console.log('Push notification ERROR: ', err);
												}
											} else {
												console.log('no call notifications token found ');
											}

											let finalResponse = {};
											finalResponse.status = true;
											finalResponse.call_id = call_id;
											(finalResponse.action = 'callNotification'),
												(finalResponse.data = { to: toUser, from: response });
											// finalResponse.receiver = toUser;
											cb(null, finalResponse);
										} else {
											validationError['receiver'] = 'user is invalid';
											let vErr = new Error();
											vErr.name = 'VALIDATION_ERROR';
											vErr.message = validationError;
											cb(vErr);
										}
									});
							} else {
								validationError['sender'] = 'user is invalid';
								let vErr = new Error();
								vErr.name = 'VALIDATION_ERROR';
								vErr.message = validationError;
								cb(vErr);
							}
							// }
						});
				}
			);
		}
	} catch (err) {
		console.log(err);
		cb(err);
	}
};

module.exports.getCallLog = async function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let callCollection = CONNECTION.collection(callModels.collection_name);

	let validationError = {};
	if (Object.keys(validationError).length > 0) {
		let vErr = new Error();
		vErr.name = 'VALIDATION_ERROR';
		vErr.message = validationError;
		cb(vErr);
	} else {
		let from_id = Number(req.authorization.user_id);
		callCollection
			.aggregate([
				{
					$match: {
						$or: [{ caller: from_id }, { receiver: from_id }],
					},
				},
				{
					$lookup: {
						from: userModel.collection_name,
						localField: 'caller',
						foreignField: 'user_id',
						as: 'callerUserDetail',
					},
				},
				{
					$lookup: {
						from: userModel.collection_name,
						localField: 'receiver',
						foreignField: 'user_id',
						as: 'receiverUserDetail',
					},
				},
				{
					$project: {
						caller: 1,
						receiver: 1,
						call_type: 1,
						call_status: 1,
						call_duration: 1,
						call_time: 1,
						call_id: 1,
						call_type: {
							$cond: {
								if: { $eq: ['$caller', from_id] },
								then: 'outgoing',
								else: 'incomming',
							},
						},
						call: '$call_type',
						'callerUser.first_name': {
							$arrayElemAt: ['$callerUserDetail.first_name', 0],
						},
						'callerUser.last_name': {
							$arrayElemAt: ['$callerUserDetail.last_name', 0],
						},
						'callerUser.user_name': {
							$ifNull: [
								{ $arrayElemAt: ['$callerUserDetail.user_name', 0] },
								'',
							],
						},
						'callerUser.profile_image_url': {
							$arrayElemAt: ['$callerUserDetail.profile_image_url', 0],
						},
						'receiverUser.first_name': {
							$arrayElemAt: ['$receiverUserDetail.first_name', 0],
						},
						'receiverUser.last_name': {
							$arrayElemAt: ['$receiverUserDetail.last_name', 0],
						},
						'receiverUser.user_name': {
							$ifNull: [
								{ $arrayElemAt: ['$receiverUserDetail.user_name', 0] },
								'',
							],
						},
						'receiverUser.profile_image_url': {
							$arrayElemAt: ['$receiverUserDetail.profile_image_url', 0],
						},
					},
				},
			])
			.toArray((err, callList) => {
				if (err) {
					cb(err);
				} else {
					callList.forEach((call) => {
						if (
							(call.call_duration == '' || call.call_duration == '00:00:00') &&
							from_id != call.caller &&
							call.call_status == 'accepted'
						) {
							call.call_status = 'missed';
						}
					});
					let finalResponse = {};
					finalResponse.status = true;
					finalResponse.data = callList.reverse();
					cb(null, finalResponse);
				}
			});
	}
};

module.exports.callAccept = async function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let callCollection = CONNECTION.collection(callModels.collection_name);

	let validationError = {};
	if (!req.body.call_id || req.body.call_id == '') {
		validationError['call_id'] = 'is required';
	}
	if (Object.keys(validationError).length > 0) {
		let vErr = new Error();
		vErr.name = 'VALIDATION_ERROR';
		vErr.message = validationError;
		cb(vErr);
	} else {
		let from_id = Number(req.authorization.user_id);
		let call_id = Number(req.body.call_id);
		var validatedData = {};
		validatedData.call_status = 'ongoing';
		validatedData.call_start_time = new Date();

		callCollection.findOneAndUpdate(
			{ call_id: call_id },
			{ $set: validatedData },
			async function (err, response) {
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
};

module.exports.callReject = async function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let callCollection = CONNECTION.collection(callModels.collection_name);

	let validationError = {};
	if (!req.body.call_id || req.body.call_id == '') {
		validationError['call_id'] = 'is required';
	}
	if (Object.keys(validationError).length > 0) {
		let vErr = new Error();
		vErr.name = 'VALIDATION_ERROR';
		vErr.message = validationError;
		cb(vErr);
	} else {
		let from_id = Number(req.authorization.user_id);
		let call_id = Number(req.body.call_id);
		var validatedData = {};
		validatedData.call_status = 'rejected';
		callCollection.findOneAndUpdate(
			{ call_id: call_id },
			{ $set: validatedData },
			async function (err, response) {
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
};

module.exports.callEnd = async function (CLIENT, req, res, cb) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let callCollection = CONNECTION.collection(callModels.collection_name);

	let validationError = {};
	if (!req.body.call_id || req.body.call_id == '') {
		validationError['call_id'] = 'is required';
	}
	if (!req.body.call_duration || req.body.call_duration == '') {
		validationError['call_duration'] = 'is required';
	}
	if (Object.keys(validationError).length > 0) {
		let vErr = new Error();
		vErr.name = 'VALIDATION_ERROR';
		vErr.message = validationError;
		cb(vErr);
	} else {
		let from_id = Number(req.authorization.user_id);
		let call_id = Number(req.body.call_id);
		var validatedData = {};
		validatedData.call_status = 'accepted';
		validatedData.call_duration = req.body.call_duration;
		validatedData.call_end_time = new Date();
		callCollection.findOneAndUpdate(
			{ call_id: call_id },
			{ $set: validatedData },
			async function (err, response) {
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
};
const sendPush = async function (
	to,
	collapse_key,
	data,
	sendNotification = true
) {
	try {
		let payload = {
			to,
			collapse_key,
			priority: 'high',
			delay_while_idle: true,
			dry_run: false,
			badge: '1',
			mutable_content: data.mutable_content || false,
			content_available: data.content_available || false,
			show_in_foreground: true,
			notification: {
				title: data.title || 'Afrocamgist',
				body: data.body,
				sound: data.sound || 'default',
				click_action: data.click_action,
				icon: 'https://www.afrocamgist.com/images/sharelogo.png',
			},
			data,
		};
		if (sendNotification) {
			payload.notification = {
				title: data.title || 'Afrocamgist',
				body: data.body,
				sound: data.sound || 'default',
				click_action: data.click_action,
				icon: 'https://www.afrocamgist.com/images/sharelogo.png',
			};
		}
		fcm
			.send(payload)
			.then((response) => {
				console.log(`Sent Successfully: ${response}`);
			})
			.catch((err) => {
				console.log('For message limit Check===>', data.status);
				console.log(`Error While Sending Push ${err}`);
			});
	} catch (err) {
		console.log('Push notification ERROR: ', err);
	}
};
