'use strict';
var express = require('express');
var router = express.Router();
var utility = require('../utilities');
const multer = require('multer');
const fs = require('fs');
const SITE_CONFIG = require('../configs/siteConfig');
const path = require('path');
const asyncHandler = require('../middlewares/v2/async.js');
const Advert = require('../models/v2/Advert.model.js');
const { expireAdvertCron } = require('../cronjobwork');
const Post = require('../models/v2/Post.model.js');
const joiMiddleware = require('../middlewares/v2/joiMiddleware');
const { advertUpdateValidator } = require('../validators/v2/advert.validator');
const addDays = require('../_helpers/v2/addDays');
const { sendPush2 } = require('../_helpers/push-notification');
const ErrorResponse = require('../_helpers/v2/errorResponse');

// var express = require('express');
// var router = express.Router();
// var utility = require('../utilities');
// const multer = require('multer');
// const fs = require('fs');
// const SITE_CONFIG = require('../configs/siteConfig');
// const path = require('path');

router.get('/', function (req, res, next) {
	utility.mongoConnect(req, res, function (client) {
		let CONNECTION = client.db(utility.dbName);
		let advertCollection = CONNECTION.collection('advert');
		let status = 'active';
		if (req.query.status && req.query.status === 'inactive') {
			status = 'inactive';
		}
		let skip = 0;
		let limit = 10;
		let page = 1;
		if (req.query.page) {
			page = Number(req.query.page);
			skip = (page - 1) * limit;
		}
		advertCollection
			.find({ status: status })
			.skip(skip)
			.limit(limit)
			.toArray((err, advertsArray) => {
				client.close();
				if (err) {
					next(err);
				} else {
					res.json({ data: advertsArray });
				}
			});
	});
});

router.get('/:advert_id/togglestatus', function (req, res, next) {
	utility.mongoConnect(req, res, function (client) {
		let CONNECTION = client.db(utility.dbName);
		let advertCollection = CONNECTION.collection('advert');
		let advert_id = Number(req.params.advert_id);
		advertCollection.findOne({ advert_id: advert_id }, (err, advertData) => {
			if (err) {
				next(err);
			} else if (!advertData) {
				client.close();
				let error = new Error('No Posts Found');
				error.status = 404;
				next(error);
			} else {
				const advert_status =
					advertData.status === 'active' ? 'inactive' : 'active';
				advertCollection.findOneAndUpdate(
					{ advert_id: advert_id },
					{ $set: { status: advert_status } },
					(err, advertData) => {
						client.close();
						res.json({ status: true });
					}
				);
			}
		});
	});
});

const adMediaStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		const dirBasePath = SITE_CONFIG.mediaBasePath + 'adverts/';

		let dirPath = dirBasePath;
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath);
		}
		cb(null, dirPath);
	},
	filename: (req, file, cb) => {
		let extension = path.extname(file.originalname) || '.jpg';
		cb(null, file.fieldname + '-advert-' + Date.now() + extension);
	},
});

const upload = multer({ storage: adMediaStorage }).single('file');

router.post('/upload', upload, function (req, res, next) {
	req.file.path = req.file.path.replace('cdn/', '');
	req.file.path = req.file.path.replace('/root/afro/', '');
	req.file.destination = req.file.destination.replace('cdn/', '');
	let uploadObj = {
		mimetype: req.file.mimetype,
		filename: req.file.filename,
		path: req.file.path.replace('../../', ''),
	};

	res.json({ status: true, data: uploadObj });
});

router.put(
	'/:id',
	joiMiddleware(advertUpdateValidator),
	asyncHandler(async (req, res, next) => {
		const { id } = req.params;
		const { status, reason } = req.body;

		const advertExists = await Advert.findById(id).populate('budget');

		if (!advertExists) next(new ErrorResponse('Advert not found', 404));

		const start_date = new Date();

		// calculate end date
		const end_date = addDays(
			`${
				new Date().getMonth() + 1
			}/${new Date().getDate()}/${new Date().getFullYear()}`,
			advertExists.budget.duration
		);

		console.log('ADVERT END DATE: ', end_date);

		// find advert
		const advert = await Advert.findByIdAndUpdate(
			id,
			{
				status,
				rejectReason: reason,
				start_date: status === 'active' ? start_date : undefined,
				end_date: status === 'active' ? end_date : undefined,
			},
			{ new: true, timestamps: true }
		).populate('budget');

		console.log('ADVERT: ', advert);

		// update post to promoted
		const postUpdate = await Post.findOneAndUpdate(
			{ post_id: advert.post },
			{ promoted: true }
		);

		if (status === 'active') {
			expireAdvertCron(advert.end_date);
		}

		// Send push notification

		const pushData = {
			status:
				advert.status === 'active' ? 'Advert Approved' : 'Advert Rejected',
			title: advert.status === 'active' ? 'Advert Approved' : 'Advert Rejected',
			body:
				advert.status === 'active'
					? 'You advert request has been approved successfuly'
					: reason,
			// image: postImagePath,
			sound: 'default',
			mutable_content: true,
			content_available: true,
			data: {
				status:
					advert.status === 'active' ? 'Advert Approved' : 'Advert Rejected',
				message:
					advert.status === 'active'
						? 'You advert request has been approved successfuly'
						: reason,
				// image: postImagePath,
				notification_type: 'advert_request',
			},
		};

		sendPush2(advert.user_id, pushData.status, pushData, true);

		return res.status(200).json({
			status: true,
			message:
				advert.status === 'active'
					? 'Advert approved successfully'
					: 'Advert rejected successfully',
			data: advert,
		});
	})
);

router.post('/', function (req, res, next) {
	let body = req.body;
	utility.mongoConnect(req, res, function (client) {
		let CONNECTION = client.db(utility.dbName);
		let advertCollection = CONNECTION.collection('advert');
		body.status = 'active';

		advertCollection
			.find({}, { projection: { advert_id: 1 } })
			.sort({ advert_id: -1 })
			.limit(1)
			.toArray((err, lastAd) => {
				if (lastAd && lastAd.length > 0) {
					body.advert_id = lastAd[0].advert_id + 1;
				} else {
					body.advert_id = 1;
				}
				advertCollection.insertOne(body, (err, insertedData) => {
					client.close();
					if (err) {
						next(err);
					} else {
						res.json({ status: true });
					}
				});
			});
	});
});

router.route('/get-adverts').get(
	asyncHandler(async (req, res, next) => {
		let skip = 0;
		let limit = 10;
		let page = 1;
		if (req.query.page) {
			page = Number(req.query.page);
			skip = (page - 1) * limit;
		}
		console.log(skip, page);

		const adverts = await Advert.aggregate([
			{
				$match: { audience: { $exists: true } },
			},

			{
				$sort: { timestamp: -1 },
			},

			{
				$lookup: {
					from: 'post',
					localField: 'post',
					foreignField: 'post_id',
					as: 'advertized_post',
				},
			},
			{
				$lookup: {
					from: 'user',
					localField: 'user_id',
					foreignField: 'user_id',
					as: 'user',
				},
			},
			{
				$lookup: {
					from: 'audiences',
					localField: 'audience',
					foreignField: '_id',
					as: 'advert_audience',
				},
			},
			{
				$lookup: {
					from: 'budgets',
					localField: 'budget',
					foreignField: '_id',
					as: 'budget',
				},
			},
			{
				$skip: skip,
			},
			{
				$limit: limit,
			},
		]).exec();

		return res.status(200).json({
			status: true,
			count: adverts.length,
			data: adverts,
		});
	})
);

module.exports = router;
