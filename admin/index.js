'use strict';
const express = require('express');
const router = express.Router();
const AUTH = require('./authentication');
const USER_MODEL = require('./user');
const POST_MODEL = require('./post');
const ADVERT_MODEL = require('./adverts');
const DASHBOARD = require('./dashboard');
const REPORT_MODEL = require('./report');
const HASHTAG_MODEL = require('./hashtags');
const EMONEY_MODEL = require('./emoney');
const SETTINGS_MODEL = require('./settings.js');
const EHEALTH_MODEL = require('./ehealth');

router.get('/', function (req, res, next) {
	res.json({ server_status: 'Admin API running' });
});

router.post('/login', AUTH.login);
router.get('/logout', AUTH.authenticate, AUTH.logout);

router.use('/users/', AUTH.authenticate, USER_MODEL);
router.use('/posts/', AUTH.authenticate, POST_MODEL);
router.use('/adverts/', AUTH.authenticate, ADVERT_MODEL);
router.use('/dashboard', AUTH.authenticate, DASHBOARD);
router.use('/reports', AUTH.authenticate, REPORT_MODEL);
router.use('/hashtags', AUTH.authenticate, HASHTAG_MODEL);
router.use('/emoney', AUTH.authenticate, EMONEY_MODEL);
router.use('/settings', AUTH.authenticate, SETTINGS_MODEL);
router.use('/autolike', require('./autolike').router);
router.use('/mail', AUTH.authenticate, require('./sendMail.js'));
router.use('/ehealth', AUTH.authenticate, EHEALTH_MODEL);

module.exports = router;
