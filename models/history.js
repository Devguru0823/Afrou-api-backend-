// jshint esversion:9
const History = require('./v2/History.model.js');
const asyncHandler = require('../middlewares/v2/async');
const ErrorResponse = require('../_helpers/v2/errorResponse');
const ip = require('ip');

module.exports.createHistory = async (data) => {
	// check if search exists for user
	let historyExists;
	if (data.queryString) {
		historyExists = await History.findOne({
			queryString: data.queryString,
			ip: ip.address(),
		});
	}
	if (historyExists) {
		console.log('History Exists: ', historyExists);
		return { status: true, historyExists };
	}
	const history = await History.create(data);
	console.log('created history', history);
	return { status: true, history };
};

module.exports.getUserHistory = asyncHandler(async (req, res, next) => {
	const { type, user } = req.query;

	let query = {};

	if (!type) {
		const error = new ErrorResponse('Please specify a type', 400);
		return next(error);
	}

	if (type === 'search') {
		query = {
			type,
			ip: ip.address(),
		};
	}

	if (type === 'purchase' && !user) {
		const error = new ErrorResponse('missing user id', 400);
		return next(error);
	}

	if (type === 'purchase' && user) {
		query = {
			type,
			$or: [{ user }, { ip: ip.address() }],
		};
	}

	const histories = await History.find();

	return res.status(200).json({
		status: true,
		count: histories.length,
		data: histories,
	});
});

module.exports.getSingleHistory = asyncHandler(async (req, res, next) => {
	const { id } = req.params;

	if (!id) {
		const error = new ErrorResponse('missing history id', 400);
		return next(error);
	}

	const history = await History.findById(id).populate('transaction');

	if (!history) {
		const error = new ErrorResponse('invalid history id', 400);
		return next(error);
	}

	return res.status(200).json({
		status: true,
		data: history,
	});
});

module.exports.clearAllSearchHistoy = asyncHandler(async (req, res, next) => {
	const deletedHistory = await History.deleteMany({
		type: 'search',
		ip: ip.address(),
	});

	return res.status(204).json({
		status: true,
		data: {},
	});
});

module.exports.clearSingleSearchHistoy = asyncHandler(
	async (req, res, next) => {
		const { id } = req.params;

		if (!id) {
			const error = new ErrorResponse('missing history id', 400);
			return next(error);
		}

		const deletedHistory = await History.findOneAndDelete({
			type: 'search',
			_id: id,
		});

		return res.status(204).json({
			status: true,
			data: {},
		});
	}
);
