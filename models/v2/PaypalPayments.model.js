const mongoose = require('mongoose');

const { Schema, model, Types } = mongoose;

const paypalPaymentSchema = new Schema({
	transaction_id: {
		type: String,
		required: true,
	},
	order: {
		type: Object,
		required: true,
	},
	captureID: {
		type: String,
	},
	user_id: {
		type: Number,
		required: true,
	},
	plan: {
		type: Types.ObjectId,
		ref: 'Ehealth',
	},
});

const PaypalPayments = model('PaypalPayments', paypalPaymentSchema);

module.exports = { PaypalPayments };
