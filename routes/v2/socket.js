'use strict';
// const express = require('express');
// const router = express.Router();
const io = require('socket.io')();
var utility = require('../../utilities');
const uuid = require('uuid');
var testModel = require('../../models/v2/test');
var messageModel = require('../../models/v2/message');
const likesModel = require('../../models/v2/likes');
const privateroom = require('../../models/v2/privateroom.json');
const MESSAGE_MODEL = require('../../models/v2/message.json');
const socketModel = require('../../models/v2/socket.json');
const userModel = require('../../models/v2/user.json');
const notificationModel = require('../../models/v2/notification.js');
const logger = require('../../_helpers/logger');

// console.log("IO: " + io);
io.on('connection', function (socket) {
	console.log('socketId: ', socket.id);
	/**
	 * send message
	 * data: { "from_id": <number>, "to_id": <number>, "message": "<message string>" }
	 */
	socket.on('message', function (data, cb) {
		data.to_id = Number.parseInt(data.to_id);
		data.from_id = Number.parseInt(data.from_id);
		var req = {
			params: { to_id: data.to_id },
			authorization: { user_id: data.from_id },
			body: {
				message_text: data.message,
				message_image: data.message_image ? data.message_image : '',
			},
		};
		var res = null;
		utility.mongoConnect(req, res, async function (CLIENT) {
			let CONNECTION = CLIENT.db(utility.dbName);
			let socketCollectionName = CONNECTION.collection(
				socketModel.collection_name
			);
			const receipientUser = await socketCollectionName.findOne({
				user_id: data.to_id,
				status: 'active',
			});
			messageModel.addMessage(CLIENT, req, res, async function (err, response) {
				const db = CLIENT.db(utility.dbName);
				const privateRoomCollection = db.collection(
					privateroom.collection_name
				);
				const room = await privateRoomCollection.findOne({
					$or: [
						{ to_id: data.to_id, from_id: data.from_id },
						{ to_id: data.from_id, from_id: data.to_id },
					],
				});
				if (!room) {
					cb(new Error('no such room'), false);
					return;
				}
				CLIENT.close();
				if (response && response.data && response.status) {
					try {
						cb(null, { message: response.data });
					} catch (error) {
						console.log('an error occured:', error);
						logger.error(error);
					}
					if (room) {
						socket.broadcast.to(room.room_id).emit('message', response.data);
						return;
					}
				} else {
					try {
						cb(null, { message: {} });
					} catch (error) {
						console.log('an error occured:', error);
						logger.error(error);
					}
					if (room) {
						socket.broadcast.to(room.room_id).emit('message', {});
						return;
					}
				}
			});
		});
	});

	/**
	 * Update/Edit message
	 * data: { "from_id": <number>, "message_id": <number>, "message": "<messge string>" }
	 */
	socket.on('updateMessage', function (data, cb) {
		data.to_id = Number.parseInt(data.to_id);
		data.from_id = Number.parseInt(data.from_id);
		const MessageData = {
			from_id: data.from_id,
			message_id: data.message_id,
			message_text: data.message,
		};
		var req = {
			params: { message_id: MessageData.message_id },
			authorization: { user_id: MessageData.from_id },
			body: { message_text: MessageData.message_text },
		};
		var res = null;
		utility.mongoConnect(req, res, async function (client) {
			messageModel.updateMessage(
				client,
				req,
				res,
				async function (err, response) {
					if (err) {
						console.log('=======================');
						console.log('update error: ', err);
						console.log('=======================');
					}
					if (response) {
						let CONNECTION = client.db(utility.dbName);
						let socketCollectionName = CONNECTION.collection(
							socketModel.collection_name
						);
						var toUser_id = response.data.to_id;
						if (response.data.to_id == MessageData.from_id) {
							toUser_id = response.data.from_id;
						}
						const receipientUser = await socketCollectionName.findOne({
							user_id: toUser_id,
							status: 'active',
						});
						const privateRoomCollection = CONNECTION.collection(
							privateroom.collection_name
						);
						const room = await privateRoomCollection.findOne({
							$or: [
								{ to_id: data.to_id, from_id: data.from_id },
								{ to_id: data.from_id, from_id: data.to_id },
							],
						});
						client.close();
						// socket.emit('updateMessage', response);
						try {
							cb(null, response);
						} catch (error) {
							console.log('an error occured:', error);
							logger.error(error);
						}
						if (room) {
							socket.broadcast.to(room.room_id).emit('updateMessage', response);
							return;
						}
					} else {
						client.close();
						try {
							cb(null, { updateMessage: {} });
						} catch (error) {
							console.log('an error occured:', error);
							logger.error(error);
						}
					}
				}
			);
		});
	});

	/**
	 * Like message
	 * data: { "from_id": <number>, "message_id": <number>, "like_type": "message" }
	 */
	socket.on('likeMessage', function (data, cb) {
		data.to_id = Number.parseInt(data.to_id);
		data.from_id = Number.parseInt(data.from_id);
		const MessageData = {
			from_id: data.from_id,
			message_id: data.message_id,
			like_type: data.like_type,
		};
		var req = {
			params: {},
			authorization: { user_id: MessageData.from_id },
			body: {
				message_id: MessageData.message_id,
				like_type: MessageData.like_type,
			},
		};
		var res = null;
		utility.mongoConnect(req, res, async function (client) {
			likesModel.addMessageLike(
				client,
				req,
				res,
				async function (err, response) {
					if (response) {
						let CONNECTION = client.db(utility.dbName);
						let socketCollectionName = CONNECTION.collection(
							socketModel.collection_name
						);
						var toUser_id = response.data.to_id;
						if (response.data.to_id == MessageData.from_id) {
							toUser_id = response.data.from_id;
						}
						const receipientUser = await socketCollectionName.findOne({
							user_id: toUser_id,
							status: 'active',
						});
						const privateRoomCollection = CONNECTION.collection(
							privateroom.collection_name
						);
						const room = await privateRoomCollection.findOne({
							$or: [
								{ to_id: data.to_id, from_id: data.from_id },
								{ to_id: data.from_id, from_id: data.to_id },
							],
						});
						client.close();
						// socket.emit('likeMessage', response);
						try {
							cb(null, response);
						} catch (error) {
							console.log('an error occured:', error);
							logger.error(error);
						}
						if (room) {
							socket.broadcast.to(room.room_id).emit('likeMessage', response);
							return;
						}
					} else {
						client.close();
						try {
							cb(null, { likeMessage: {} });
						} catch (error) {
							console.log('an error occured:', error);
							logger.error(error);
						}
					}
				}
			);
		});
	});

	/**
	 * Delete message
	 * data: { "from_id": <number>, "message_id": <number> }
	 */
	socket.on('deleteMessage', function (data, cb) {
		data.from_id = Number(data.from_id);
		data.to_id = Number(data.to_id);
		const MessageData = {
			from_id: data.from_id,
			message_id: data.message_id,
		};
		var req = {
			params: { message_id: MessageData.message_id },
			authorization: { user_id: MessageData.from_id },
			body: {},
		};
		var res = null;
		utility.mongoConnect(req, res, async function (client) {
			messageModel.deleteMessage(
				client,
				req,
				res,
				async function (err, response) {
					if (response) {
						let CONNECTION = client.db(utility.dbName);
						let socketCollectionName = CONNECTION.collection(
							socketModel.collection_name
						);
						var toUser_id = response.data.to_id;
						if (response.data.to_id == MessageData.from_id) {
							toUser_id = response.data.from_id;
						}
						const receipientUser = await socketCollectionName.findOne({
							user_id: toUser_id,
							status: 'active',
						});
						const privateRoomCollection = CONNECTION.collection(
							privateroom.collection_name
						);
						const room = await privateRoomCollection.findOne({
							$or: [
								{ to_id: data.to_id, from_id: data.from_id },
								{ to_id: data.from_id, from_id: data.to_id },
							],
						});
						client.close();
						// socket.emit('deleteMessage', response);
						try {
							cb(null, response);
						} catch (error) {
							console.log('an error occured:', error);
							logger.error(error);
						}
						if (room) {
							socket.broadcast.to(room.room_id).emit('deleteMessage', response);
							return;
						}
					} else {
						client.close();
						try {
							cb(null, { deleteMessage: {} });
						} catch (error) {
							console.log('an error occured:', error);
							logger.error(error);
						}
					}
				}
			);
		});
	});

	/**
	 * Reply message
	 * data: { "from_id": <number>, "to_id": <number>, "message_id": <number>, "message_text": "<message string>" }
	 */
	socket.on('replyMessage', function (data, cb) {
		const MessageData = {
			from_id: Number(data.from_id),
			to_id: Number(data.to_id),
			message_id: Number(data.message_id),
			message_text: data.message_text,
		};
		var req = {
			params: { to_id: MessageData.to_id, message_id: MessageData.message_id },
			authorization: { user_id: MessageData.from_id },
			body: { message_text: MessageData.message_text },
		};
		var res = null;
		utility.mongoConnect(req, res, async function (client) {
			messageModel.replyMessage(
				client,
				req,
				res,
				async function (err, response) {
					if (response) {
						let CONNECTION = client.db(utility.dbName);
						let socketCollectionName = CONNECTION.collection(
							socketModel.collection_name
						);
						var toUser_id = response.data.to_id;
						if (response.data.to_id == MessageData.from_id) {
							toUser_id = response.data.from_id;
						}
						const receipientUser = await socketCollectionName.findOne({
							user_id: toUser_id,
							status: 'active',
						});
						const privateRoomCollection = CONNECTION.collection(
							privateroom.collection_name
						);
						const room = await privateRoomCollection.findOne({
							$or: [
								{ to_id: MessageData.to_id, from_id: MessageData.from_id },
								{ to_id: MessageData.from_id, from_id: MessageData.to_id },
							],
						});
						client.close();
						// socket.emit('replyMessage', response);
						try {
							cb(null, response);
						} catch (error) {
							console.log('an error occured:', error);
							logger.error(error);
						}
						if (room) {
							socket.broadcast.to(room.room_id).emit('replyMessage', response);
							return;
						}
					} else {
						client.close();
						try {
							cb(null, { replyMessage: {} });
						} catch (error) {
							console.log('an error occured:', error);
							logger.error(error);
						}
					}
				}
			);
		});
	});

	/**
	 * read message
	 * data { message_id: <number> }
	 */

	socket.on('readMessage', ({ message_id }, cb) => {
		message_id = Number.parseInt(message_id);
		const req = {};
		const res = {};
		utility.mongoConnect(req, res, async (client) => {
			const db = client.db(utility.dbName);
			const messageCollection = db.collection(MESSAGE_MODEL.collection_name);
			const message = await messageCollection.findOneAndUpdate(
				{ message_id },
				{ $set: { message_status: 'read' } }
			);
			if (!message) {
				try {
					cb(new Error('No message found'), false);
					return;
				} catch (error) {
					console.log(error);
					return;
				}
			}
			try {
				cb(false, { status: true });
				return;
			} catch (error) {
				console.log(error);
				return;
			}
		});
	});

	/**
	 * get message
	 * data: { "from_id": <number>, "to_id": <number>, "page": <number> }
	 */
	socket.on('getmessages', function (data, cb) {
		data.from_id = Number.parseInt(data.from_id);
		data.to_id = Number.parseInt(data.to_id);
		const MessageData = {
			from_id: data.from_id,
			to_id: data.to_id,
			page: 1,
		};
		if (data.page) {
			MessageData.page = data.page;
		}
		const req = {};
		req.body = MessageData;
		utility.mongoConnect(req, null, function (client) {
			testModel.getMessages(client, req, null, async function (err, response) {
				const db = client.db(utility.dbName);
				const privateRoomCollection = db.collection(
					privateroom.collection_name
				);
				const room = await privateRoomCollection.findOne({
					$or: [
						{ to_id: data.to_id, from_id: data.from_id },
						{ to_id: data.from_id, from_id: data.to_id },
					],
				});
				client.close();
				socket.emit('getmessages', response);
				socket.broadcast.to(room.room_id).emit('messageRead');
				// cb(null, response);
			});
		});
	});

	/**
	 * Create group
	 * data: { "title": "<title string>", "created_by": <number>, "is_public": <boolean true/false> }
	 */
	socket.on('createMessageGroup', function (data) {
		var groupInfo = {
			title: data.title,
			created_by: data.created_by,
			is_public: true,
		};
		const req = {};
		req.body = groupInfo;
		utility.mongoConnect(req, null, function (client) {
			testModel.createMessageGroup(client, req, null, function (err, response) {
				client.close();
				socket.emit('createMessageGroup', response);
			});
		});
	});

	/**
	 * Get room if not available then create and return
	 * data: { "from_id": <number>, "to_id": <number> }
	 */
	socket.on('getroom', async function (data, cb) {
		console.log(data);
		utility.mongoConnect(data, null, async function (CLIENT) {
			let CONNECTION = CLIENT.db(utility.dbName);
			let proomCollection = CONNECTION.collection(privateroom.collection_name);
			let socketCollectionName = CONNECTION.collection(
				socketModel.collection_name
			);

			data.from_id = Number(data.from_id);
			data.to_id = Number(data.to_id);
			const chatExists = await proomCollection.findOne({
				$or: [
					{ to_id: data.to_id, from_id: data.from_id },
					{ to_id: data.from_id, from_id: data.to_id },
				],
			});
			const receipientUser = await socketCollectionName.findOne({
				user_id: data.to_id,
				status: 'active',
			});
			if (!chatExists) {
				// chat does not exist
				const privateRoomData = {
					// new chat data
					room_id: uuid.v4(),
					from_id: data.from_id,
					to_id: data.to_id,
				};
				const new_chat = await proomCollection.insertOne(privateRoomData); // create chat
				socket.join(new_chat.room_id); // join chat
				if (receipientUser) {
					io.to(receipientUser.socket).emit('invite', {
						roomId: privateRoomData.room_id,
					}); // emit invite to receipient to join chat
				}
				try {
					cb(null, new_chat.room_id);
				} catch (error) {
					console.log('an error occured:', error);
					logger.error(error);
				}
			} else {
				// const privateRoomData = { // chat data
				//   room_id: chatExists.room_id,
				//   from_id: data.from_id,
				//   to_id: data.to_id
				// };
				socket.join(chatExists.room_id);
				if (receipientUser) {
					io.to(receipientUser.socket).emit('invite', {
						roomId: chatExists.room_id,
					}); // emit invite to receipient to join chat
				}
				try {
					cb(null, chatExists.room_id);
				} catch (error) {
					console.log('an error occured:', error);
					logger.error(error);
				}
				return;
			}
		});
		// data.room = uuid.v4(); // replace room id with unique id
	});

	socket.on('joinRoom', (data) => {
		socket.join(data.roomId);
	});

	/**
	 * Get socket id
	 * data: { "user_id": <number> }
	 */
	socket.on('getsocketid', async function (data, cb) {
		console.log(data);
		utility.mongoConnect(data, null, async function (CLIENT) {
			let CONNECTION = CLIENT.db(utility.dbName);
			let socketCollectionName = CONNECTION.collection(
				socketModel.collection_name
			);
			const privateRoomCollection = CONNECTION.collection(
				privateroom.collection_name
			);

			data.user_id = Number(data.user_id);
			const query = { user_id: data.user_id };
			const update = {
				$set: { user_id: data.user_id, socket: socket.id, status: 'active' },
			};
			const options = { upsert: true };
			const socketUser = await socketCollectionName.updateOne(
				query,
				update,
				options
			);
			// find all user's private room
			const rooms = await privateRoomCollection
				.find({
					$or: [{ to_id: data.user_id }, { from_id: data.user_id }],
				})
				.toArray();
			console.log('=======================');
			console.log(rooms);
			console.log('=======================');
			for (let room of rooms) {
				// add user socket to room
				socket.join(room.room_id);
			}
			try {
				cb(null, socket.id);
			} catch (error) {
				console.log('an error occured:', error);
				logger.error(error);
			}
			return;
		});
	});

	socket.on('joinroom', (data) => {
		socket.join(data.roomId);
	});

	/**
	 * Get Notifications
	 * data: { "user_id": <number>, "page": <number> }
	 */
	socket.on('getnotifications', async function (data, cb) {
		var req = { query: { page: 1 }, authorization: { user_id: 1 } };
		var res = null;
		utility.mongoConnect(req, res, async function (client) {
			/* */
			let CONNECTION = client.db(utility.dbName);
			let socketCollectionName = CONNECTION.collection(
				socketModel.collection_name
			);
			const currentUser = await socketCollectionName.findOne({
				user_id: data.user_id,
				status: 'active',
			});
			/* */
			notificationModel.getNotificationsV2(
				client,
				req,
				res,
				function (err, response) {
					client.close();
					// console.log(err);
					// console.log(response);
					try {
						cb(null, response);
					} catch (error) {
						console.log('an error occured:', error);
						logger.error(error);
					}
					if (currentUser) {
						socket.broadcast
							.to(currentUser.socket)
							.emit('getnotifications', response);
						return;
					}
				}
			);
		});
	});

	/**
	 * Notification
	 * data: { from_user_id, to_user_id, type: "new message" }
	 */
	socket.on('notification', async (data, cb) => {
		data.from_user_name = '';
		data.to_user_name = '';
		data.from_user_id = Number(data.from_user_id);
		data.to_user_id = Number(data.to_user_id);
		var req = null;
		var res = null;
		utility.mongoConnect(req, res, async function (client) {
			/* */
			let CONNECTION = client.db(utility.dbName);

			let userCollection = CONNECTION.collection(userModel.collection_name);
			const fromUserDetail = await userCollection.findOne({
				user_id: data.from_user_id,
			});
			const toUserDetail = await userCollection.findOne({
				user_id: data.to_user_id,
			});

			if (fromUserDetail) {
				if (fromUserDetail.user_name && fromUserDetail.user_name != '') {
					data.from_user_name = fromUserDetail.user_name;
				} else {
					data.from_user_name =
						fromUserDetail.first_name + ' ' + fromUserDetail.last_name;
				}
			}

			if (toUserDetail) {
				if (toUserDetail.user_name && toUserDetail.user_name != '') {
					data.to_user_name = toUserDetail.user_name;
				} else {
					data.to_user_name =
						toUserDetail.first_name + ' ' + toUserDetail.last_name;
				}
			}

			let socketCollectionName = CONNECTION.collection(
				socketModel.collection_name
			);
			const currentUser = await socketCollectionName.findOne({
				user_id: data.to_user_id,
				status: 'active',
			});
			if (data.type == 'new message') {
				data.message =
					data.to_user_name +
					', you have new messagee from ' +
					data.from_user_name;
				try {
					cb(null, data);
				} catch (error) {
					console.log('an error occured:', error);
					logger.error(error);
				}
			}
			if (currentUser) {
				socket.broadcast.to(currentUser.socket).emit('notification', response);
				return;
			}
			/* */
		});
	});

	/**
	 * Get Notification Counter
	 * data: { "user_id": <number> }
	 */
	socket.on('getnotificationcounter', async (data, cb) => {
		var req = { authorization: { user_id: Number.parseInt(data.user_id) } };
		var res = null;
		utility.mongoConnect(req, res, async function (client) {
			/* */
			let CONNECTION = client.db(utility.dbName);
			let socketCollectionName = CONNECTION.collection(
				socketModel.collection_name
			);
			const currentUser = await socketCollectionName.findOne({
				user_id: data.user_id,
				status: 'active',
			});
			/* */
			notificationModel.getCounters(client, req, res, function (err, response) {
				client.close();
				if (err) {
					console.log(
						'AN ERRIR OCCURED WHILE FETCHING COUNTERS ==> FROM SOCKET:',
						err
					);
					return;
				}
				if (currentUser) {
					io.to(socket.id).emit('getnotificationcounter', response);
					return;
				}
				console.log('USER DOES NOT EXIST');
			});
		});
	});

	/**
	 * Get Message List
	 * data: { "user_id": <number> }
	 */
	socket.on('getmessagelist', async (data, cb) => {
		// parse user id to number in request object
		var req = { authorization: { user_id: Number.parseInt(data.user_id) } };
		var res = null;
		utility.mongoConnect(req, res, async function (client) {
			/* */
			let CONNECTION = client.db(utility.dbName);
			let socketCollectionName = CONNECTION.collection(
				socketModel.collection_name
			);
			const currentUser = await socketCollectionName.findOne({
				user_id: data.user_id,
				status: 'active',
			});
			/* */
			messageModel.getMessagesList(client, req, res, function (err, response) {
				client.close();
				console.log(err);
				console.log(response);
				try {
					cb(null, response);
				} catch (error) {
					console.log('an error occured:', error);
					logger.error(error);
				}
				if (currentUser) {
					socket.broadcast
						.to(currentUser.socket)
						.emit('getmessagelist', response);
					return;
				}
			});
		});
	});

	/**
	 * Socket Function for video and audio calls
	 * id: Peer id
	 * from_id: number
	 * to_id: number
	 */
	socket.on('call', (data, cb) => {
		let { id, from_id, to_id } = data;
		// validate data exists
		if (!id || !from_id || !to_id) {
			try {
				cb({ error: 'missing id or from_id or to_id' }, false);
			} catch (error) {
				console.log('an error occured:', error);
				logger.error(error);
			}
			return;
		}
		// convert ids to numbers
		from_id = Number.parseInt(from_id);
		to_id = Number.parseInt(to_id);
		// validate data type
		if (!Number.isInteger(from_id) || !Number.isInteger(to_id)) {
			try {
				cb({ error: 'invalid from_id or to_id' }, false);
			} catch (error) {
				console.log('an error occured:', error);
				logger.error(error);
			}
			return;
		}
		const req = { authorization: { user_id: from_id } };
		const res = null;
		// connect to mongodb
		utility.mongoConnect(req, res, async (CLIENT) => {
			const db = CLIENT.db(utility.dbName);
			const PrivateRoom = db.collection(privateroom.collection_name);
			// find users private room
			const room = await PrivateRoom.findOne({
				from_id: {
					$and: [
						{
							$or: [{ from_id }, { from_id: to_id }],
						},
						{
							$or: [{ to_id: from_id }, { to_id }],
						},
					],
				},
			});
			if (room) {
				// broadcast call event to the other room member
				socket.broadcast.to(room.room_id).emit('call', { id });
				return;
			}
			try {
				cb({ error: 'room does not exist' }, false);
			} catch (error) {
				console.log('an error occured:', error);
				logger.error(error);
			}
			return;
		});
	});

	/**
	 * Socket function to get enc keys
	 */

	socket.on('getEncKeys', (data, cb) => {
		try {
			cb(null, { k: process.env.CRYPTO_SECRET });
		} catch (error) {
			console.log('an error occured:', error);
			logger.error(error);
		}
	});

	socket.on('disconnect', async () => {
		// console.log(users[socket.id] + ' Disconnected');
		utility.mongoConnect(null, null, async function (CLIENT) {
			let CONNECTION = CLIENT.db(utility.dbName);
			let socketCollectionName = CONNECTION.collection(
				socketModel.collection_name
			);
			const currentUser = await socketCollectionName.findOne({
				socket: socket.id,
			});
			if (currentUser) {
				const query = { socket: socket.id };
				const update = { $set: { socket: '', status: 'inactive' } };
				const socketUser = await socketCollectionName.updateOne(query, update);
			}
		});
	});
});

module.exports = { io };
