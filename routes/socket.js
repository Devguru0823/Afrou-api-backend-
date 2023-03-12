'use strict';
// const express = require('express');
// const router = express.Router();
const io = require('socket.io')();
var utility = require('../utilities');
const uuid = require('uuid');
const qs = require('qs');
var testModel = require('../models/test');
var messageModel = require('../models/message');
const postModel = require('../models/v2/post');
const likesModel = require('../models/likes');
const privateroom = require('../models/privateroom.json');
const MESSAGE_MODEL = require('../models/message.json');
const socketModel = require('../models/socket.json');
const userModel = require('../models/user.json');
const notificationModel = require('../models/notification');
const commentModel = require('../models/v2/post_comment');
const logger = require('../_helpers/logger');
var callModel = require('../models/call');

const http2 = require('http2');
const fs = require('fs');
console.log('IO: ' + io);

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
			/**
			 * Update Socket for current user.
			 */

			// let from_status = await updateSocket(data.from_id, socket.id);
			// const receipientUser = await socketCollectionName.findOne({
			//   user_id: data.to_id,
			//   status: "active",
			// });
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

				// console.log("====================================");
				// console.log("SENT DATA FOR MESSAGE: ", data);
				// console.log("====================================");

				// console.log("====================================");
				// console.log("ROOM DATA: ", room);
				// console.log("====================================");

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
						// return;
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
						// return;
					}
				}
				// delete data.message;
				// console.log(data);
				// let keys = Object.keys(data).forEach(async (k) => {
				//   console.log("sending list to ", data[k]);
				//   await getmsgList(data[k]);
				//   console.log("lsit sent to", data[k]);
				// });
				await getmsgList(data.from_id);
				await getmsgList(data.to_id);
			});
			await getmsgList(data.from_id);
			await getmsgList(data.to_id);
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
						/**
						 * Update Socket for current user.
						 */
						let from_status = await updateSocket(data.from_id, socket.id);
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

						console.log('====================================');
						console.log('SENT DATA FOR EDIT: ', data);
						console.log('====================================');

						console.log('====================================');
						console.log('ROOM DATA: ', room);
						console.log('====================================');
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
						/**
						 * Update Socket for current user.
						 */
						let from_status = await updateSocket(data.from_id, socket.id);
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

						console.log('====================================');
						console.log('SENT DATA FOR LIKE: ', data);
						console.log('====================================');

						console.log('====================================');
						console.log('ROOM DATA: ', room);
						console.log('====================================');

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
						/**
						 * Update Socket for current user.
						 */
						let from_status = await updateSocket(data.from_id, socket.id);
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

						console.log('====================================');
						console.log('SENT DATA FOR DELETE: ', data);
						console.log('====================================');

						console.log('====================================');
						console.log('ROOM DATA: ', room);
						console.log('====================================');

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
	 * Delete all messages
	 * data: { "from_id": <number>, "to_id": <number>, "delete_for": <1=Only for me, 2=For all> }
	 */
	socket.on('deleteAllMessages', function (data, cb) {
		const MessageData = {
			from_id: Number(data.from_id),
			to_id: Number(data.to_id),
			delete_for: 1,
			page: 1,
		};
		if (data.delete_for) {
			if (Number(data.delete_for) > 0) {
				MessageData.delete_for = Number(data.delete_for);
			}
		}
		var req = {
			params: {},
			authorization: { user_id: MessageData.from_id },
			body: { to_id: MessageData.to_id, delete_for: MessageData.delete_for },
		};
		var res = null;
		utility.mongoConnect(req, res, async function (client) {
			messageModel.deleteAllMessages(
				client,
				req,
				res,
				async function (err, response) {
					if (response) {
						/** GET message */
						const req = {};
						req.body = MessageData;
						utility.mongoConnect(req, null, function (client) {
							testModel.getMessages(
								client,
								req,
								null,
								async function (err, response) {
									if (response) {
										let CONNECTION = client.db(utility.dbName);
										let socketCollectionName = CONNECTION.collection(
											socketModel.collection_name
										);
										/**
										 * Update Socket for current user.
										 */
										let from_status = await updateSocket(
											data.from_id,
											socket.id
										);
										const receipientUser = await socketCollectionName.findOne({
											user_id: MessageData.to_id,
											status: 'active',
										});
										client.close();
										cb(null, response);
										if (receipientUser) {
											socket.broadcast
												.to(receipientUser.socket)
												.emit('getmessages', response);
											return;
										}
									} else {
										client.close();
										cb(null, { getmessages: {} });
									}
									// socket.emit('getmessages', response);
								}
							);
						});
					}
				}
			);
		});
	});

	/**
	 * Delete Selected Messages
	 * data: { "from_id": <number>, "to_id": <number>, "message_ids": <id array>, "delete_for": <1=Only for me, 2=For all> }
	 */
	socket.on('deleteSelectedMessages', function (data, cb) {
		const MessageData = {
			from_id: Number(data.from_id),
			to_id: Number(data.to_id),
			message_ids: data.message_ids,
			delete_for: 1,
			page: 1,
		};
		if (data.delete_for) {
			if (Number(data.delete_for) > 0) {
				MessageData.delete_for = Number(data.delete_for);
			}
		}
		var req = {
			params: {},
			authorization: { user_id: MessageData.from_id },
			body: {
				to_id: MessageData.to_id,
				delete_for: MessageData.delete_for,
				message_ids: MessageData.message_ids,
			},
		};
		var res = null;
		utility.mongoConnect(req, res, async function (client) {
			messageModel.deleteSelectedMessages(
				client,
				req,
				res,
				async function (err, response) {
					if (response) {
						/** GET message */
						const req = {};
						req.body = MessageData;
						utility.mongoConnect(req, null, function (client) {
							testModel.getMessages(
								client,
								req,
								null,
								async function (err, response) {
									if (response) {
										let CONNECTION = client.db(utility.dbName);
										let socketCollectionName = CONNECTION.collection(
											socketModel.collection_name
										);
										/**
										 * Update Socket for current user.
										 */
										let from_status = await updateSocket(
											data.from_id,
											socket.id
										);
										const receipientUser = await socketCollectionName.findOne({
											user_id: MessageData.to_id,
											status: 'active',
										});
										client.close();
										cb(null, response);
										if (receipientUser && MessageData.delete_for == 2) {
											socket.broadcast
												.to(receipientUser.socket)
												.emit('getmessages', response);
											return;
										}
									} else {
										client.close();
										cb(null, { getmessages: {} });
									}
									// socket.emit('getmessages', response);
								}
							);
						});
					}
				}
			);
		});
	});

	/**
	 * Archive messages
	 * data: { "from_id": <number>, "to_id": <array of id> }
	 */
	socket.on('archiveMessages', function (data, cb) {
		const MessageData = {
			from_id: Number(data.from_id),
			to_id: data.to_id,
			page: 1,
		};

		var req = {
			params: {},
			authorization: { user_id: MessageData.from_id },
			body: { to_id: MessageData.to_id, type: 'listAll' },
		};
		var res = null;
		utility.mongoConnect(req, res, async function (client) {
			/* */
			let CONNECTION = client.db(utility.dbName);
			let socketCollectionName = CONNECTION.collection(
				socketModel.collection_name
			);
			/**
			 * Update Socket for current user.
			 */
			let from_status = await updateSocket(data.from_id, socket.id);
			const currentUser = await socketCollectionName.findOne({
				user_id: MessageData.from_id,
				status: 'active',
			});
			/* */
			messageModel.archiveMessages(
				client,
				req,
				res,
				async function (err, response) {
					if (response) {
						messageModel.getMessagesListSocket(
							client,
							req,
							null,
							async function (err, response) {
								if (response) {
									cb(null, response);
								}
							}
						);
						// socket.emit('archiveMessages', response);
					}
				}
			);
		});
	});

	/**
	 * Remove from archive messages
	 * data: { "from_id": <number>, "to_id": <array of id> }
	 */
	socket.on('removeArchiveMessages', function (data, cb) {
		const MessageData = {
			from_id: Number(data.from_id),
			to_id: data.to_id,
			page: 1,
		};

		var req = {
			params: {},
			authorization: { user_id: MessageData.from_id },
			body: { to_id: MessageData.to_id, type: 'listAll' },
		};
		var res = null;
		utility.mongoConnect(req, res, async function (client) {
			/* */
			let CONNECTION = client.db(utility.dbName);
			let socketCollectionName = CONNECTION.collection(
				socketModel.collection_name
			);
			/**
			 * Update Socket for current user.
			 */
			let from_status = await updateSocket(data.from_id, socket.id);
			const currentUser = await socketCollectionName.findOne({
				user_id: MessageData.from_id,
				status: 'active',
			});
			/* */
			messageModel.removeArchiveMessages(
				client,
				req,
				res,
				async function (err, response) {
					if (response) {
						messageModel.getMessagesListSocket(
							client,
							req,
							null,
							async function (err, response) {
								if (response) {
									cb(null, response);
								}
							}
						);
						// socket.emit('archiveMessages', response);
					}
				}
			);
		});
	});

	/**
	 * Get archived messages
	 * data: { "from_id": <number> }
	 */
	socket.on('getArchiveUsers', function (data, cb) {
		const MessageData = {
			from_id: Number(data.from_id),
			page: 1,
		};

		var req = {
			params: {},
			authorization: { user_id: MessageData.from_id },
			body: { type: 'archivedAll', all: true },
		};
		var res = null;
		utility.mongoConnect(req, res, async function (client) {
			/* */
			let CONNECTION = client.db(utility.dbName);
			let socketCollectionName = CONNECTION.collection(
				socketModel.collection_name
			);
			/**
			 * Update Socket for current user.
			 */
			let from_status = await updateSocket(data.from_id, socket.id);
			const currentUser = await socketCollectionName.findOne({
				user_id: MessageData.from_id,
				status: 'active',
			});
			/* */
			messageModel.getMessagesListSocket(
				client,
				req,
				null,
				async function (err, response) {
					if (response) {
						cb(null, response);
						if (currentUser) {
							socket.broadcast
								.to(currentUser.socket)
								.emit('getArchiveUsers', response);
							return;
						}
					}
				}
			);
			// socket.emit('archiveMessages', response);
		});
	});

	/**
	 * Archive users
	 * data: { "from_id": <number>, "to_id": <array of id> }
	 */
	socket.on('archiveUsers', function (data, cb) {
		const MessageData = {
			from_id: Number(data.from_id),
			to_id: data.to_id,
			page: 1,
		};

		var req = {
			params: {},
			authorization: { user_id: MessageData.from_id },
			body: { to_id: MessageData.to_id, type: 'listAll' },
		};
		var res = null;
		utility.mongoConnect(req, res, async function (client) {
			/* */
			let CONNECTION = client.db(utility.dbName);
			let socketCollectionName = CONNECTION.collection(
				socketModel.collection_name
			);
			/**
			 * Update Socket for current user.
			 */
			let from_status = await updateSocket(data.from_id, socket.id);
			const currentUser = await socketCollectionName.findOne({
				user_id: MessageData.from_id,
				status: 'active',
			});
			/* */
			messageModel.archiveUsers(
				client,
				req,
				res,
				async function (err, response) {
					if (response) {
						messageModel.getMessagesListSocket(
							client,
							req,
							null,
							async function (err, response) {
								if (response) {
									cb(null, response);
									if (currentUser) {
										socket.broadcast
											.to(currentUser.socket)
											.emit('archiveUsers', response);
										return;
									}
								}
							}
						);
						// socket.emit('archiveMessages', response);
					}
				}
			);
		});
	});

	/**
	 * Remove archive users
	 * data: { "from_id": <number>, "to_id": <array of id> }
	 */
	socket.on('removeArchiveUsers', function (data, cb) {
		const MessageData = {
			from_id: Number(data.from_id),
			to_id: data.to_id,
			page: 1,
		};

		var req = {
			params: {},
			authorization: { user_id: MessageData.from_id },
			body: { to_id: MessageData.to_id, type: 'listAll' },
		};
		var res = null;
		utility.mongoConnect(req, res, async function (client) {
			/* */
			let CONNECTION = client.db(utility.dbName);
			let socketCollectionName = CONNECTION.collection(
				socketModel.collection_name
			);
			/**
			 * Update Socket for current user.
			 */
			let from_status = await updateSocket(data.from_id, socket.id);
			const currentUser = await socketCollectionName.findOne({
				user_id: MessageData.from_id,
				status: 'active',
			});
			/* */
			messageModel.removeArchiveUsers(
				client,
				req,
				res,
				async function (err, response) {
					if (response) {
						messageModel.getMessagesListSocket(
							client,
							req,
							null,
							async function (err, response) {
								if (response) {
									cb(null, response);
									if (currentUser) {
										socket.broadcast
											.to(currentUser.socket)
											.emit('removeArchiveUsers', response);
										return;
									}
								}
							}
						);
						// socket.emit('archiveMessages', response);
					}
				}
			);
		});
	});

	/**
	 * Delete user from message list
	 * data: { "from_id": <number>, "to_id": <array of id> }
	 */
	socket.on('deleteUserfromMessageList', function (data, cb) {
		const MessageData = {
			from_id: Number(data.from_id),
			to_id: data.to_id,
			page: 1,
		};

		var req = {
			params: {},
			authorization: { user_id: MessageData.from_id },
			body: { to_id: MessageData.to_id, type: 'listAll' },
		};
		var res = null;
		utility.mongoConnect(req, res, async function (client) {
			/* */
			let CONNECTION = client.db(utility.dbName);
			let socketCollectionName = CONNECTION.collection(
				socketModel.collection_name
			);
			/**
			 * Update Socket for current user.
			 */
			let from_status = await updateSocket(data.from_id, socket.id);
			const currentUser = await socketCollectionName.findOne({
				user_id: MessageData.from_id,
				status: 'active',
			});
			/* */
			messageModel.deleteUserfromMessageList(
				client,
				req,
				res,
				async function (err, response) {
					if (response) {
						messageModel.deleteAllMessages(
							client,
							req,
							res,
							async function (err, response) {
								messageModel.getMessagesListSocket(
									client,
									req,
									null,
									async function (err, response) {
										if (response) {
											cb(null, response);
											if (currentUser) {
												socket.broadcast
													.to(currentUser.socket)
													.emit('deleteUserfromMessageList', response);
												return;
											}
										}
									}
								);
							}
						);
						// socket.emit('archiveMessages', response);
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
						/**
						 * Update Socket for current user.
						 */
						let from_status = await updateSocket(data.from_id, socket.id);
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

						console.log('====================================');
						console.log('SENT DATA FOR REPLY: ', data);
						console.log('====================================');

						console.log('====================================');
						console.log('ROOM DATA: ', room);
						console.log('====================================');

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
				let CONNECTION = client.db(utility.dbName);
				let socketCollectionName = CONNECTION.collection(
					socketModel.collection_name
				);
				/**
				 * Update Socket for current user.
				 */
				let from_status = await updateSocket(data.from_id, socket.id);

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
				const receipientUser = await socketCollectionName.findOne({
					user_id: MessageData.from_id,
					status: 'active',
				});
				client.close();
				socket.emit('getmessages', response);
				if (room && room.room_id) {
					socket.broadcast.to(room.room_id).emit('messageRead');
				}
				if (receipientUser) {
					socket.broadcast
						.to(receipientUser.socket)
						.emit('getmessages', response);
					return;
				}
				cb(null, response);
			});
		});
	});

	socket.on('messageRead', (data) => {
		data.to_id = Number.parseInt(data.to_id);
		data.from_id = Number.parseInt(data.from_id);
		const req = { data };
		utility.mongoConnect(req, null, function (client) {
			testModel.readMessages(client, req, null, async (err, response) => {
				if (err) {
					return;
				}
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
				socket.broadcast.to(room.room_id).emit('messageRead');
			});
		});
	});

	/**
	 * Create group
	 * data: { "title": "<title string>", "created_by": <number>, "is_public": <boolean true/false> }
	 */
	socket.on('createMessageGroup', async function (data) {
		var groupInfo = {
			title: data.title,
			created_by: data.created_by,
			is_public: true,
		};
		const req = {};
		req.body = groupInfo;
		/**
		 * Update Socket for current user.
		 */
		let from_status = await updateSocket(data.created_by, socket.id);
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
			console.log('===============================');
			console.log('ROOM DATA:', chatExists);
			console.log('===============================');
			/**
			 * Update Socket for current user.
			 */
			let from_status = await updateSocket(data.created_by, socket.id);
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
			/**
			 * Update Socket for current user.
			 */
			let from_status = await updateSocket(data.user_id, socket.id);
			const socketUser = await socketCollectionName.updateOne(
				query,
				update,
				options
			);
			// find all user's private room
			try {
				const rooms = await privateRoomCollection
					.find({
						$or: [{ to_id: data.user_id }, { from_id: data.user_id }],
					})
					.toArray();
				// console.log("=======================");
				// console.log(rooms);
				// console.log("=======================");
				for (let room of rooms) {
					// add user socket to room
					socket.join(room.room_id);
				}
			} catch (e) {
				console.log('GETSOCKETID ERR: ', e);
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

	//   socket.on("getCallId",async function(data,cb){
	//     try {
	//       console.log("#########", data);
	//       let from_status = await updateSocket(data.from_id, socket.id);
	//       var req = {
	//         query: { page: 1 },
	//         authorization: { user_id: data.from_id },
	//       };
	//       var res = null;
	//       utility.mongoConnect(req, res, async function (client) {
	//         let CONNECTION = client.db(utility.dbName);
	//         let socketCollectionName = CONNECTION.collection(
	//           socketModel.collection_name
	//         );
	//         // from.socket
	//         let from = await socketCollectionName.findOne({
	//           // user_id: { $in: [data.from_id, data.to_id] },
	//           user_id: data.from_id,
	//         });
	//         let to = await socketCollectionName.findOne({
	//           // user_id: { $in: [data.from_id, data.to_id] },
	//           user_id: data.to_id,
	//         });
	//         console.log({ from, to });
	// cb()
	//         // socket.to(from.socket).emit("getCallId", data);
	//         // socket.to(to.socket).emit("getCallId", data);
	//       });
	//     } catch (error) {
	//       console.log(error);
	//     }
	//   }

	// socket.on("getCallId",async function(data,cb){

	// })
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
			/**
			 * Update Socket for current user.
			 */
			let from_status = await updateSocket(data.user_id, socket.id);
			const currentUser = await socketCollectionName.findOne({
				user_id: data.user_id,
				status: 'active',
			});
			console.log('+++++++++++++++++++++++++++++++++++++++++');
			console.log(currentUser);
			console.log('+++++++++++++++++++++++++++++++++++++++++');
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
			/**
			 * Update Socket for current user.
			 */
			let from_status = await updateSocket(data.user_id, socket.id);
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
			/**
			 * Update Socket for current user.
			 */
			let from_status = await updateSocket(data.user_id, socket.id);
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
		console.log('getmessagelist');
		console.log(data);
		let res = await getmsgList(data.user_id, data.page, data?.all);
		cb(null, res);
		console.log(' sent getmessagelist');
	});
	function getmsgList(user_id, page = 1, all = false) {
		return new Promise((resolve, reject) => {
			var req = {
				authorization: { user_id: Number.parseInt(user_id) },
			};
			var res = null;
			if (all) {
				req['query'] = {
					skip: undefined,
					limit: undefined,
				};
			} else {
				req['query'] = {
					skip: page * 10,
					limit: 10,
					page: Number(page) || 1
				};
			}
			// if (page) {
			//   //  let data ={}
			//   //  data.page = data.page;
			//   req.body = { page };
			// }
			// req.body.all = all;

			console.log(req.query)
			// process.exit(1)
			utility.mongoConnect(req, res, async function (client) {
				/* */
				let CONNECTION = client.db(utility.dbName);
				let socketCollectionName = CONNECTION.collection(
					socketModel.collection_name
				);
				/**
				 * Update Socket for current user.
				 */
				// let from_status = await updateSocket(data.user_id, socket.id);
				const currentUser = await socketCollectionName.findOne({
					user_id: Number.parseInt(user_id),
					// status: "active",
				});
				/* */
				try {
					messageModel.getMessagesListSocket(
						client,
						req,
						res,
						function (err, response) {
							// client.close();
							// console.log(err);
							// console.log(response);

							if (currentUser) {
								console.log(
									'emit personal to ',
									user_id,
									'socket:',
									currentUser.socket
								);
								io.to(currentUser.socket).emit('getmessagelist', response);
								// return;
							}
							// console.log("getmessagelist resolve")
							return resolve(response);
						}
					);
				} catch (error) {
					reject(error);
				}
			});
		});
	}
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

	/* 
  ========================================
  TIMELINE SOCKETS
  ========================================
  */

	// get timeline posts
	socket.on('gettimeline', async (data, cb) => {
		const req = {
			query: { page: data.pageNumber },
			authorization: { user_id: Number.parseInt(data.user_id) },
		},
			res = {};
		utility.mongoConnect(req, res, function (client) {
			postModel.getAfroswaggerPosts(
				client,
				req,
				res,
				'afroswagger',
				function (err, response) {
					client.close();
					if (err) {
						cb(err);
					} else {
						cb(null, response);
					}
				}
			);
		});
	});

	// create comment
	socket.on('postcomment', (data, cb) => {
		const req = {
			body: data.comment,
			authorization: { user_id: data.user_id },
		},
			res = {};
		utility.mongoConnect(req, res, function (client) {
			commentModel.addPostComment(client, req, res, function (err, response) {
				client.close();
				if (err) {
					cb(err);
				} else {
					cb(null, response);
				}
			});
		});
	});
	socket.on('sendCallId', async (data, cb) => {
		console.log('!!!!!!!!!!!!!!!!!!!!!!', data);
		cb({ msg: '123' });
	});
	/**
	 * Send call notification
	 * data: { "from_id": <number>, "to_id": "<number>", calltype: "<string (audio / video)>" }
	 */
	//   socket.on("callNotification", async (data, cb) => {
	//     var callInfo = {
	//       from_id: Number(data.from_id),
	//       to_id: Number(data.to_id),
	//       call_type: data.calltype,
	//     };

	//     /**
	//      * Update Socket for current user.
	//      */
	//     let from_status = await updateSocket(data.from_id, socket.id);

	//     var req = {
	//       authorization: { user_id: callInfo.from_id },
	//       body: { to_id: callInfo.to_id, calltype: callInfo.call_type },
	//     };
	//     var res = null;

	//     utility.mongoConnect(req, res, function (client) {
	//       callModel.callNotification(client, req, null, function (err, response) {
	//         client.close();
	//         // socket.emit("sendCallId", { ...response, ...callInfo });
	//         // getCallId({ ...response, ...callInfo });
	//         // socket.emit("callNotification", response);

	//         console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@", response);
	//         try {
	//           utility.mongoConnect(req, res, async function (client) {
	//             let CONNECTION = client.db(utility.dbName);
	//             let socketCollectionName = CONNECTION.collection(
	//               userModel.collection_name
	//             );
	//             // from.socket
	//             let from = await socketCollectionName.findOne({
	//               // user_id: { $in: [data.from_id, data.to_id] },
	//               user_id: data.from_id,
	//             });
	//             let to = await socketCollectionName.findOne({
	//               // user_id: { $in: [data.from_id, data.to_id] },
	//               user_id: data.to_id,
	//             });
	//             // console.log({ from, to });
	//             sendVoip();
	//             function sendVoip(request, res, voipId) {
	//               try {
	//                 // file: ./index.js

	//                 // The `http2.connect` method creates a new session with example.com
	//                 const session = http2.connect("https://api.development.push.apple.com", {
	//                   cert: fs.readFileSync(
	//                     "./cert/voip.pem",
	//                     "utf-8"
	//                   ),
	//                   key: fs.readFileSync(
	//                     "./cert/key.pem",
	//                     "utf-8"
	//                   ),
	//                   passphrase: "keshav777",
	//                   port: 443,
	//                 });

	//                 // If there is any error in connecting, log it to the console
	//                 session.on("error", (err) => console.error(err));
	//                 // file: ./index.js

	//                 // Here, req is a new request stream
	//                 // const req = session.request({ ':path': '/' })
	//                 // console.log(request.body);
	//                 const req = session.request({
	//                   ":path": `/3/device/${to.voip_id}`,
	//                   ":method": "POST",
	//                   "apns-push-type": "voip",
	//                   "apns-expiration": "0",
	//                   "apns-topic": "com.app.Afrocamgist.voip",
	//                 });
	//                 const sampleData = qs.stringify({
	//                   aps: { caller: "Caller Name" },
	//                 });
	//                 // we can convert this into a string and call
	//                 // the req.write method
	//                 // the second argument specifies the encoding, which is utf8 for now
	//                 req.write(sampleData, "utf8");
	//                 // since we don't have any more data to send as
	//                 // part of the request, we can end it
	//                 req.end();

	//                 // This callback is fired once we receive a response
	//                 // from the server
	//                 req.on("response", (headers) => {
	//                   // we can log each response header here
	//                   for (const name in headers) {
	//                     console.log(`${name}: ${headers[name]}`);
	//                   }
	//                 });

	//                 // To fetch the response body, we set the encoding
	//                 // we want and initialize an empty data string
	//                 req.setEncoding("utf8");
	//                 let data = "";

	//                 // append response data to the data string every time
	//                 // we receive new data chunks in the response
	//                 req.on("data", (chunk) => {
	//                   data += chunk;
	//                 });

	//                 // Once the response is finished, log the entire data
	//                 // that we received
	//                 req.on("end", () => {
	//                   console.log("daata recieved");
	//                   console.log(`\n${data}`);
	//                   // res.send({ msg: data });
	//                   // In this case, we don't want to make any more
	//                   // requests, so we can close the session
	//                   cb(null, {
	//                     action: "callNotification",
	//                     data: { to, from, response, pushError: data },
	//                     message: "success",
	//                     to_id: to.voip_id,
	//                     path: `/3/device/${to.voip_id}`,
	//                   });

	//                   session.close();
	//                 });
	//               } catch (error) {
	//                 console.log(error);
	//                 // res.send(error);
	//                 cb({
	//                   action: "callNotification",
	//                   data: { to, from, response, pushError: error },
	//                   message: "falsesud",
	//                 });
	//               }
	//             }
	//             // cb(null, {response,from,to});
	//             // cb({action:"callNotification",data:{to,from,response},message:"success"})

	//             // cb()
	//             // socket.to(from.socket).emit("getCallId", data);
	//             // socket.to(to.socket).emit("getCallId", data);
	//           });
	//         } catch (error) {
	//           console.log(error);
	//           cb({ action: "callNotification", data: error, message: "false" });
	//         }
	//       });
	//     });
	//   });

	socket.on('callNotification', async (data, cb) => {
		var callInfo = {
			from_id: Number(data.from_id),
			to_id: Number(data.to_id),
			call_type: data.calltype,
		};

		/**
		 * Update Socket for current user.
		 */
		let from_status = await updateSocket(data.from_id, socket.id);

		var req = {
			authorization: { user_id: callInfo.from_id },
			body: { to_id: callInfo.to_id, calltype: callInfo.call_type },
		};
		var res = null;

		utility.mongoConnect(req, res, function (client) {
			callModel.callNotification(
				client,
				req,
				null,
				async function (err, response) {
					try {
						const db = client.db(utility.dbName);
						const socketCollections = db.collection(
							socketModel.collection_name
						);
						console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@', response);
						let toSocketUser = await socketCollections.findOne({
							user_id: data.to_id,
						});
						socket.to(toSocketUser.socket).emit('getCallId', response);
						let fromSocketUser = await socketCollections.findOne({
							user_id: data.from_id,
						});
						console.log(fromSocketUser);
						socket.to(fromSocketUser.socket).emit('getCallId', response);
						cb(null, response);
						client.close();
					} catch (error) {
						console.log(error);
					}
					// try {
					//   utility.mongoConnect(req, res, async function (client) {
					//     let CONNECTION = client.db(utility.dbName);
					//     let socketCollectionName = CONNECTION.collection(
					//       userModel.collection_name
					//     );
					//     // from.socket
					//     let from = await socketCollectionName.findOne({
					//       // user_id: { $in: [data.from_id, data.to_id] },
					//       user_id: data.from_id,
					//     });
					//     let to = await socketCollectionName.findOne({
					//       // user_id: { $in: [data.from_id, data.to_id] },
					//       user_id: data.to_id,
					//     });
					//     // console.log({ from, to });

					//     // sendVoip();
					//     function sendVoip(request, res, voipId) {
					//       try {
					//         // file: ./index.js

					//         // The `http2.connect` method creates a new session with example.com
					//         const session = http2.connect(
					//           "https://api.sandbox.push.apple.com",
					//           {
					//             cert: fs.readFileSync(
					//               "/home/omlinux/Documents/afrou-api/cert/voip.pem",
					//               "utf-8"
					//             ),
					//             key: fs.readFileSync(
					//               "/home/omlinux/Documents/afrou-api/cert/key.pem",
					//               "utf-8"
					//             ),
					//             passphrase: "keshav777",
					//             port: 443,
					//           }
					//         );
					//         let jsonData = JSON.stringify({
					//           aps: { caller: "Caller Name" },
					//         });
					//         const buffer = Buffer.from(jsonData);
					//         // If there is any error in connecting, log it to the console
					//         session.on("error", (err) => console.error(err));
					//         // file: ./index.js

					//         // Here, req is a new request stream
					//         // const req = session.request({ ':path': '/' })
					//         // console.log(request.body);
					//         // 2698ff3b1a25b30e8864ba6f5dbcee1a2c5000da7d06ec4e5e18bc917e4a478b
					//         const req = session.request({
					//           // ":path": `/3/device/${to.voip_id}`,
					//           ":path": `/3/device/2698ff3b1a25b30e8864ba6f5dbcee1a2c5000da7d06ec4e5e18bc917e4a478b`,
					//           ":method": "POST",
					//           // "apns-push-type": "voip",
					//           // "apns-expiration": "0",
					//           "apns-topic": "com.app.Afrocamgist.voip",
					//           "Content-Type": "application/json",
					//           "Content-Length": jsonData.length,
					//         });
					//         const sampleData = qs.stringify({
					//           aps: { caller: "Caller Name" },
					//         });

					//         // we can convert this into a string and call
					//         // the req.write method
					//         // the second argument specifies the encoding, which is utf8 for now
					//         req.write(jsonData,"utf-8");
					//         // since we don't have any more data to send as
					//         // part of the request, we can end it
					//         req.end();

					//         // This callback is fired once we receive a response
					//         // from the server
					//         req.on("response", (headers) => {
					//           // we can log each response header here
					//           for (const name in headers) {
					//             console.log(`${name}: ${headers[name]}`);
					//           }
					//         });

					//         // To fetch the response body, we set the encoding
					//         // we want and initialize an empty data string
					//         req.setEncoding("utf8");
					//         let data = "";

					//         // append response data to the data string every time
					//         // we receive new data chunks in the response
					//         req.on("data", (chunk) => {
					//           data += chunk;
					//         });

					//         // Once the response is finished, log the entire data
					//         // that we received
					//         req.on("end", () => {
					//           console.log("daata recieved");
					//           console.log(`\n${data}`);
					//           // res.send({ msg: data });
					//           // In this case, we don't want to make any more
					//           // requests, so we can close the session
					//           cb(null, {
					//             action: "callNotification",
					//             data: { to, from, response, pushError: data },
					//             message: "success",
					//             to_id: to.voip_id,
					//             path: `/3/device/${to.voip_id}`,
					//           });

					//           session.close();
					//         });
					//         req.on('error', console.log);
					//       } catch (error) {
					//         console.log(error);
					//         // res.send(error);
					//         cb({
					//           action: "callNotification",
					//           data: { to, from, response, pushError: error },
					//           message: "false",
					//         });
					//       }
					//     }
					//     // cb(null, {response,from,to});
					//     // cb({action:"callNotification",data:{to,from,response},message:"success"})

					//     // cb()
					//     // socket.to(from.socket).emit("getCallId", data);
					//     // socket.to(to.socket).emit("getCallId", data);
					//   });

					// } catch (error) {
					//   console.log(error);
					//   cb({ action: "callNotification", data: error, message: "false" });
					// }
				}
			);
		});
	});
	/**
	 * Accept call
	 * data: { "from_id": <number>, "call_id": "<number>" }
	 */
	socket.on('acceptCall', async (data, cb) => {
		var callInfo = {
			from_id: Number(data.from_id),
			call_id: Number(data.call_id),
		};

		/**
		 * Update Socket for current user.
		 */
		let from_status = await updateSocket(data.from_id, socket.id);

		var req = {
			authorization: { user_id: callInfo.from_id },
			body: { call_id: callInfo.call_id },
		};
		var res = null;

		utility.mongoConnect(req, res, function (client) {
			callModel.callAccept(client, req, null, function (err, response) {
				client.close();
				socket.emit('acceptCall', response);
				cb(null, response);
			});
		});
	});

	/**
	 * End call
	 * data: { "from_id": <number>, "call_id": "<number>", "call_duration": "<string> (00:00:00)" }
	 */
	socket.on('endCall', async (data, cb) => {
		var callInfo = {
			from_id: Number(data.from_id),
			call_id: Number(data.call_id),
			call_duration: data.call_duration,
		};

		/**
		 * Update Socket for current user.
		 */
		let from_status = await updateSocket(data.from_id, socket.id);

		var req = {
			authorization: { user_id: callInfo.from_id },
			body: {
				call_id: callInfo.call_id,
				call_duration: callInfo.call_duration,
			},
		};
		var res = null;

		utility.mongoConnect(req, res, function (client) {
			callModel.callEnd(client, req, null, function (err, response) {
				client.close();
				socket.emit('endCall', response);
				cb(null, response);
			});
		});
	});

	/**
	 * Reject call
	 * data: { "from_id": <number>, "call_id": "<number>" }
	 */
	socket.on('rejectCall', async (data, cb) => {
		var callInfo = {
			from_id: Number(data.from_id),
			call_id: Number(data.call_id),
		};

		/**
		 * Update Socket for current user.
		 */
		let from_status = await updateSocket(data.from_id, socket.id);

		var req = {
			authorization: { user_id: callInfo.from_id },
			body: { call_id: callInfo.call_id },
		};
		var res = null;

		utility.mongoConnect(req, res, function (client) {
			callModel.callReject(client, req, null, function (err, response) {
				client.close();
				socket.emit('rejectCall', response);
				cb(null, response);
			});
		});
	});

	/**
	 * Call log
	 * data: { "from_id": <number> }
	 */
	socket.on('callLog', async (data, cb) => {
		var callInfo = {
			from_id: Number(data.from_id),
		};

		/**
		 * Update Socket for current user.
		 */
		let from_status = await updateSocket(data.from_id, socket.id);

		var req = { authorization: { user_id: callInfo.from_id }, body: {} };
		var res = null;

		utility.mongoConnect(req, res, function (client) {
			callModel.getCallLog(client, req, null, function (err, response) {
				client.close();
				socket.emit('callLog', response);
				cb(null, response);
			});
		});
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

const updateSocket = function (user_id, socket_id) {
	let data = { user_id: Number(user_id), socket_id: socket_id };
	console.log('updateSocket: ', data);
	utility.mongoConnect(data, null, async function (CLIENT) {
		let CONNECTION = CLIENT.db(utility.dbName);
		let socketCollectionName = CONNECTION.collection(
			socketModel.collection_name
		);

		if (data.user_id > 0) {
			const query = { user_id: data.user_id };
			const update = {
				$set: {
					user_id: data.user_id,
					socket: data.socket_id,
					status: 'active',
				},
			};
			const options = { upsert: true };
			const socketUser = await socketCollectionName.updateOne(
				query,
				update,
				options
			);
		}
	});
	return user_id;
};

module.exports = { io };
