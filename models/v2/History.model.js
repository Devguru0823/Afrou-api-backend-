const mongoose = require('mongoose');
const { Schema, Types, model } = mongoose;

const historySchema = new Schema({
	type: {
		type: String,
		required: [1, 'history type is required'],
		enum: ['search', 'purchase'],
	},
	transaction: {
		type: Types.ObjectId,
		refPath: 'model_type',
	},
	queryString: String,
	ip: String,
	user: Number,
	plan: {
		type: Schema.Types.ObjectId,
		ref: 'Ehealth',
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
	model_type: {
		type: String,
		enum: ['FlutterwavePayment', 'PaypalPayments'],
	},
});

module.exports = model('History', historySchema);
