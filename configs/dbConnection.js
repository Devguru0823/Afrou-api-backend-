'use strict';
const CONFIG = require('./dbConfig.json');
const MongoClient = require('mongodb').MongoClient;
const mongooseClient = require('mongoose');

const url ="mongodb://localhost:27017/test";
	// process.env.NODE_ENV === 'production'
	// 	? `${CONFIG.protocol || `mongodb://`}${CONFIG.username}:${CONFIG.password
	// 	}@${CONFIG.host}/${CONFIG.database}`
	// 	: `mongodb://${CONFIG.username}:${CONFIG.password}@${CONFIG.host}:${CONFIG.port}/${CONFIG.database}`;
module.exports.connect = function (cb) {
	// Connection URL
	// const url ="mongodb+srv://afrouDbUser:2wDJm4Rx9qBdMJ6a@serverlessinstance1.cyqka.mongodb.net/?"
	// `${CONFIG.protocol}${CONFIG.username}:${CONFIG.password}@${CONFIG.host}/${CONFIG.database}`

	// Database Name
	Connection.open()
		.then((client) => {
			cb(null, client);
		})
		.catch((err) => {
			console.log(err);
			cb(err, null);
		});
	// MongoClient.connect(
	// 	url,
	// 	{ useUnifiedTopology: true, useNewUrlParser: true },
	// 	function (err, client) {
	// 		if (err) {
	// 			console.log('error connecting to db: ');
	// 			cb(err, null);
	// 			return;
	// 		}
	// 		client.on('close', () => {});
	// 		cb(err, client);
	// 	}
	// );
};

// connect mongoose to db
module.exports.connectMongoose = () => {
	// const url =		'mongodb://' + CONFIG.host + ':' + CONFIG.port + '/' + CONFIG.database;
	// const url = `mongodb://${CONFIG.username}:${CONFIG.password}@${CONFIG.host}:${CONFIG.port}/${CONFIG.database}`;
	console.log({ url });
	mongooseClient
		.connect(url, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
			// useFindAndModify: true
		})
		.then((client) => {
			console.log('Mongoose connected');
		})
		.catch((err) => {
			console.log('Err connecting mongoose to db ');
			console.log(err.message);
		});
};

class Connection {
	// static async open() {
	//   if (this.db) return this.db;
	//   let server = await MongoClient.connect(this.url, this.options) .catch(err => { console.log(err); });
	//   this.db = server.db

	//   return this.db

	// }

	static async open() {
		console.log('connecting to db');
		if (this.db) {
			console.log('already connected');
			this.db.close = () => {
				console.log('db.close() is disabled function ');
			};
			return this.db;
		}
		this.db = await MongoClient.connect(this.url, this.options).catch((err) => {
			console.log(err);
		});
		this.db.close = () => {
			console.log('Attempting to close the connection with server');
		};
		return this.db;
	}
	static getCollection(name) {
		if (!this.db) {
			throw new Error('connect db to get collection');
		}
		return this.db.db(CONFIG.database).collection(name);
	}
}
Connection.db = null;
Connection.url = url;
Connection.options = {
	useNewUrlParser: true,
	useUnifiedTopology: true,
};
