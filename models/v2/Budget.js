const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const budgetSchema = new Schema({
	budget_id: {
		type: String,
		required: true,
		max: 40,
	},
	budget: {
		type: Number,
		required: true,
	},
	duration: {
		type: Number,
		required: true,
	},
	currency: {
		type: String,
		default: 'USD',
	},
	amount: {
		type: Number,
		required: true,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

const Budget = model('Budget', budgetSchema);

module.exports = Budget;
