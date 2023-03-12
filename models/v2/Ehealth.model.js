const mongoose = require('mongoose');
const { default: slugify } = require('slugify');
const { Schema, model } = mongoose;

const planSubSchema = new Schema({
	name: {
		type: String,
		required: [1, 'Plan name is required'],
		max: [50, 'Maximum length for name exceeded'],
	},
	description: {
		type: String,
		max: [500, 'Maximum length for sub plan description exceeded'],
	},
	price: {
		type: String,
		required: [1, 'Price for sub plan is required'],
	},
	benefits: {
		type: [String],
	},
});

const ehealthSchema = new Schema({
	status: {
		type: String,
		default: 'active',
	},
	name: {
		type: String,
		required: [1, 'Plan name is required'],
		max: [50, 'Maximum length for name exceeded'],
	},
	description: {
		type: String,
		max: [500, 'Maximum length for plan description exceeded'],
	},
	price: {
		type: String,
		// required: [1, 'Price for plan is required'],
	},
	currency: {
		type: String,
		max: [3, 'Please enter country currency code, eg USD'],
	},
	benefits: {
		type: [String],
	},
	subPlans: [
		{
			name: {
				type: String,
				required: [1, 'Plan name is required'],
				max: [50, 'Maximum length for name exceeded'],
			},
			description: {
				type: String,
				max: [500, 'Maximum length for sub plan description exceeded'],
			},
			price: {
				type: String,
				required: [1, 'Price for sub plan is required'],
			},
			frequency: String,
			currency: {
				type: String,
				max: [3, 'Please enter country currency code, eg USD'],
				required: true,
			},
			country: String,
			benefits: {
				type: [String],
			},
		},
	],
	// plan_id: {
	// 	type: String,
	// 	required: true,
	// },
	slug: String,
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

ehealthSchema.pre('save', function (next) {
	// this.price = new Intl.NumberFormat('en-US', {
	// 	currency: 'USD',
	// 	style: 'currency'
	// }).format(this.price);

	if (this.price) {
		this.country = this.currency.subString(0, 2);
	}

	for (let i = 0; i < this.subPlans.length; i++) {
		console.log(this.subPlans[i].currency);
		this.subPlans[i].country = this.subPlans[i].currency.substring(0, 2);
	}

	this.slug = slugify(this.name, { lower: true });
	next();
});

module.exports = model('Ehealth', ehealthSchema);
