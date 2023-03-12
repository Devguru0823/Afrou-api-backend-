const mongoose = require('mongoose');
const { Types, Schema, model } = mongoose;

const schema = new Schema({
	token: {
		type: String,
		required: true
	},
	first_6digits: {
		type: String,
		required: true
	},
	last_4digits: {
		type: String,
		required: true
	},
	issuer: {
		type: String,
		required: true
	},
	country: {
		type: String,
		required: true
	},
	type: {
		type: String,
		required: true
	},
	expiry: {
		type: String,
		required: true
	},
	user: {
		type: Types.ObjectId,
		required: true
	},
	ip: {
		type: String
	},
	createdAt: {
		type: Date,
		default: Date.now
	}
});

const Card = model('Card', schema);

module.exports = Card;
