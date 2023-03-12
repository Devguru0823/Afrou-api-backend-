// const { flwClient } = require('../configs/flutterwaveConfig');
const asyncHandler = require('../middlewares/v2/async');
const {
	createEhealthValidator,
	updateEhealthValidator,
} = require('../middlewares/v2/ehealth.js');
const EhealthModel = require('../models/v2/Ehealth.model.js');
const ErrorResponse = require('../_helpers/v2/errorResponse.js');
const { v4: uuidv4 } = require('uuid');
const { Testimonial } = require('../models/v2/Testimonials.model.js');
// const redisConnect = require('../configs/redisConfig');

const {
	addPostVideo,
	afterPostVideoUploadSync,
} = require('../models/v2/media');
// const {
// 	ehealthSinglePlanCache,
// 	ehealthPlansCache,
// } = require('../middlewares/v2/cache');

const router = require('express').Router();

router.route('/video/:id').delete(
	asyncHandler(async (req, res, next) => {
		const { id } = req.params;

		const deletedVideo = await Testimonial.findByIdAndUpdate(id, {
			status: 'deleted',
		});

		if (!deletedVideo) {
			return next(new ErrorResponse('invalid video id', 400));
		}

		return res.status(200).json({
			status: true,
			data: {},
		});
	})
);

router
	.route('/video')
	.post(
		addPostVideo,
		asyncHandler(async (req, res, next) => {
			afterPostVideoUploadSync(req, async (uploadObj) => {
				const testimonial_object = {
					status: 'active',
					...uploadObj,
					testimonial_video: uploadObj.path,
					testimonial_id: uuidv4(),
					uploaded_by: req.authorization.user_id,
				};

				const testimonial = await Testimonial.create(testimonial_object);

				return res.status(201).json({
					status: true,
					data: testimonial,
				});
			});
		})
	)
	.get(
		asyncHandler(async (req, res, next) => {
			const testimonials = await Testimonial.find({ status: 'active' });

			return res.status(200).json({
				status: true,
				count: testimonials.length,
				data: testimonials,
			});
		})
	);

router
	.route('/:id')
	.get(
		asyncHandler(async (req, res, next) => {
			// Get single plan

			const { id } = req.params;

			if (!id) {
				return next(new ErrorResponse('missing plan id', 400));
			}

			const query = {
				status: 'active',
				_id: id,

				// $or: [
				//   {
				//     "subplans._id": id,
				//   },
				// ],
			};

			const plan = await EhealthModel.findOne(query);

			if (!plan) {
				return next(new ErrorResponse('invalid plan id', 400));
			}

			return res.status(200).json({
				status: true,
				data: plan,
			});
		})
	)
	.put(
		updateEhealthValidator,
		asyncHandler(async (req, res, next) => {
			// update plan
			const { id } = req.params;

			if (!id) {
				return next(new ErrorResponse('missing plan id', 400));
			}

			const ehealth_data = { ...req.body };

			for (let plan of ehealth_data.subPlans) {
				const priceSplit = plan.price.split('/');

				if (priceSplit.length !== 2) {
					return next(
						new ErrorResponse(
							'Invalid price format, format is: $price/frequency',
							400
						)
					);
				}

				const priceWithoutSymbol = priceSplit[0].replace('$', '').trim();

				const priceConverted = Number.parseInt(priceWithoutSymbol);

				if (Number.isNaN(priceConverted)) {
					return next(new ErrorResponse('Price value must be a number', 400));
				}

				plan.price = priceConverted;
				plan.frequency = priceSplit[1].trim();
			}

			const plan = await EhealthModel.findByIdAndUpdate(
				id,
				{ ...req.body },
				{ runValidators: true, new: true }
			);

			if (!plan) {
				return next(new ErrorResponse('invalid plan id', 400));
			}

			return res.status(200).json({
				status: true,
				message: 'update successful',
				data: plan,
			});
		})
	)
	.delete(
		asyncHandler(async (req, res, next) => {
			// delete plan
			const { id } = req.params;

			if (!id) {
				return next(new ErrorResponse('missing plan id', 400));
			}

			const plan = await EhealthModel.findByIdAndUpdate(id, {
				status: 'deleted',
			});

			if (!plan) {
				return next(new ErrorResponse('invalid plan id', 400));
			}

			return res.status(200).json({
				status: true,
				data: {},
			});
		})
	);

router
	.route('/')
	.post(
		createEhealthValidator,
		asyncHandler(async (req, res, next) => {
			// create payment plan in flutterwave
			// const paymentPlanPayload = {
			// 	amount: req.body.price,
			// 	name: req.body.name,
			// 	interval: 'yearly',
			// 	duration: 1,
			// };
			// const paymentPlan = await flwClient.PaymentPlan.create(paymentPlanPayload);

			const ehealth_data = { ...req.body };

			for (let plan of ehealth_data.subPlans) {
				const priceSplit = plan.price.split('/');

				if (priceSplit.length !== 2) {
					return next(
						new ErrorResponse(
							'Invalid price format, format is: $price/frequency',
							400
						)
					);
				}

				const priceWithoutSymbol = priceSplit[0].replace('$', '').trim();

				const priceConverted = Number.parseInt(priceWithoutSymbol);

				if (Number.isNaN(priceConverted)) {
					return next(new ErrorResponse('Price value must be a number', 400));
				}

				plan.price = priceConverted;
				plan.frequency = priceSplit[1].trim();
			}

			// Create new Ehealth from request body
			const plan = await EhealthModel.create({
				...ehealth_data,
			});

			return res.status(201).json({
				status: true,
				data: plan,
			});
		})
	)
	.get(
		asyncHandler(async (req, res, next) => {
			// Get all plans
			const plans = await EhealthModel.find({ status: 'active' });

			return res.status(200).json({
				status: true,
				count: plans.length,
				data: plans,
			});
		})
	);

module.exports = router;
