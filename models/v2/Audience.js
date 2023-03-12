const mongoose = require('mongoose');

const { Schema, model, Types } = mongoose;

const audienceSchema = new Schema({
	audience_id: {
		type: String,
		required: true,
	},
	user_id: {
		type: Number,
		required: true,
	},
	age_range: {
		type: String,
		required: true,
		max: 7,
	},
	name: {
		type: String,
		required: true,
		max: 50,
		min: 4,
	},
	country: {
		type: [String],
		required: true,
	},
	interests: {
		type: [String],
		required: true,
	},
	gender: {
		type: String,
		enum: ['male', 'female', 'all'],
		default: 'all',
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

const Audience = model('Audience', audienceSchema);

module.exports = Audience;
