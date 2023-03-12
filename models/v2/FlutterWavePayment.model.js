const mongoose = require('mongoose');
const { Types, Schema, model } = mongoose;

const paymentSchema = new Schema(
	{
		id: String,
		tx_ref: String,
		flw_ref: String,
		amount: String,
		charged_amount: String,
		app_fee: String,
		processor_response: String,
		auth_model: String,
		currency: String,
		ip: String,
		app_fee: String,
		narration: String,
		status: String,
		auth_url: String,
		payment_type: String,
		plan: String,
		fraud_status: String,
		charge_type: String,
		created_at: String,
		customer: Object,
		user_id: Number,
		ehealth: {
			type: Types.ObjectId,
			ref: 'Ehealth'
		}
	},
	{ strict: false }
);

const FlutterWavePayment = model('FlutterwavePayment', paymentSchema);

module.exports = FlutterWavePayment;
