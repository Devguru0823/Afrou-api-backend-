// jshint esversion:9
const History = require('./History.model');

module.exports.createHistory = async (data) => {
	let history = {};

	try {
		history = await History.create(data);
	} catch (error) {
		return { status: false, error };
	}
	console.log('created history', history);
	return { status: true, history };
};
