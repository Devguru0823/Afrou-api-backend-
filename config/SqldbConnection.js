'use strict';
const SQLCONFIG = require('./SQLCONFIG.json');
const mysql = require('mysql');
const { Sequelize } = require('sequelize');

module.exports.dbConn = mysql.createConnection(SQLCONFIG);

module.exports.connect = function (cb) {
	// Database Name
	Connection.open()
		.then((client) => {
			cb(null, client);
		})
		.catch((err) => {
			console.log(err);
			cb(err, null);
		});
};

// connect mongoose to db
module.exports.connectMySQL = () => {
  mysql.createConnection(SQLCONFIG)
		.then(() => {
			console.log('Mongoose connected');
		})
		.catch((err) => {
			console.log('Err connecting mongoose to db ');
			console.log(err.message);
		});
};

class Connection {
	static async open() {
		console.log('connecting to db');
		if (this.db) {
			console.log('already connected');
			this.db.close = () => {
				console.log('db.close() is disabled function ');
			};
			return this.db;
		}
		this.db = await mysql.createConnection(SQLCONFIG);
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