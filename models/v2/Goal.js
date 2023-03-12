const mongoose = require('mongoose');

const { Schema, model, Types } = mongoose;

const goalSchema = new Schema({
	goal_id: {
		type: String,
		required: true,
		max: 40,
	},
	goal_type: {
		type: String,
		required: true,
		max: 50,
		enum: ['profile_visit', 'website_visit'],
	},
	url: {
		type: String,
		required: true,
		max: 500,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

const Goal = model('Goal', goalSchema);

module.exports = Goal;
