const mongoose = require('mongoose');

const { Schema, Types, model } = mongoose;

const advertSchema = new Schema(
	{
		status: {
			type: String,
			enum: ['active', 'rejected', 'review', 'expired'],
			required: true,
		},
		advert_id: {
			type: String,
			required: true,
			max: 40,
		},
		rejectReason: String,
		goal: {
			type: Types.ObjectId,
			required: true,
			ref: 'Goal',
		},
		audience: {
			type: Types.ObjectId,
			required: true,
			ref: 'Audience',
		},
		budget: {
			type: Types.ObjectId,
			required: true,
			ref: 'Budget',
		},
		post: {
			type: Number,
			required: true,
		},
		transaction: {
			type: Types.ObjectId,
			required: true,
			ref: 'PaypalPayments',
		},
		user_id: {
			type: Number,
			required: true,
		},
		start_date: {
			type: Date,
		},
		end_date: {
			type: Date,
		},
		timestamp: {
			type: Number,
			default: Date.now,
		},
		end_timestamp: {
			type: Number,
		},
		expired: {
			type: Boolean,
			default: false,
		},
	},
	{ timestamps: true }
);

const Advert = model('Advert', advertSchema);

module.exports = Advert;
