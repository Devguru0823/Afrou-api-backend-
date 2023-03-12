const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const testimonialSchema = new Schema({
	status: {
		type: String,
		enum: ['active', 'deleted'],
		required: true,
	},
	testimonial_id: {
		type: String,
		required: true,
	},
	testimonial_video: { type: String, required: true },
	mimetype: String,
	filename: String,
	thumbnails: Array,
	converted: Boolean,
	uploaded_by: {
		type: Number,
		required: true,
	},
	upload_date: {
		type: Date,
		default: Date.now(),
	},
});

const Testimonial = model('Testimonial', testimonialSchema);

module.exports = { Testimonial };
