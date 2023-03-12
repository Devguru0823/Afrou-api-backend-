// jshint esversion:9
const router = require('express').Router();
const {
	getUserHistory,
	getSingleHistory,
	clearAllSearchHistoy,
	clearSingleSearchHistoy
} = require('../models/history');

router.route('/').get(getUserHistory).delete(clearAllSearchHistoy);

router.route('/:id').get(getSingleHistory).delete(clearSingleSearchHistoy);

module.exports = router;
