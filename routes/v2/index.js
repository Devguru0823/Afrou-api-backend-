var express = require('express');
var router = express.Router();
const USERS = require('./user');
const SANITIZER = require('../../_helpers/sanitizer');
const AUTH = require('../../_helpers/v2/authentication');
const POSTS = require('./posts');
const PROFILE = require('./profile');
const GROUP = require('./groups');
const LIKE = require('./like');
const NOTIFICATION = require('./notification');
const POSTCOMMENT = require('./post_comment');
const USERPHOTO = require('./user_photo');
const AD_REQUEST = require('./ad_request');
const ADVERT = require('./advert');
const MARKET = require('./market');
const MESSAGES = require('./messages');
const HASHTAGS = require('./hashtags');
const USER_TAGGED = require('./user_tagged_details');
const IMAGE_DEMO = require('../../models/v2/image_demo');
const STORYLINE = require('./storyline');
const ANNOUNCEMENT = require('./announcement');
const VIDEOPROCESS = require('./videoprocess');
const TEST = require('./test');
const AUTOBOT = require('./autobot');
const OPEN = require('./open');
const APIs = require('./apis');
const ADVERTAPI = require('./advert.route');
const WEBHOOK = require('./webhook')();
const EHEALTH = require('./ehealth');
const PAYMENT = require('./payments');

/* GET home page. */
router.get('/', function (req, res, next) {
	res.json({ server_status: 'Running' });
});

router.use('/users/', SANITIZER, USERS);
router.use('/posts/', AUTH.authenticate, SANITIZER, POSTS);
router.use('/profile/', AUTH.authenticate, SANITIZER, PROFILE);
router.use('/groups/', AUTH.authenticate, SANITIZER, GROUP);
router.use('/likes/', AUTH.authenticate, SANITIZER, LIKE);
router.use('/notifications/', AUTH.authenticate, SANITIZER, NOTIFICATION);
router.use('/comments/', AUTH.authenticate, SANITIZER, POSTCOMMENT);
router.use('/ad-request/', AUTH.authenticate, SANITIZER, AD_REQUEST);
router.use('/adverts/', AUTH.authenticate, SANITIZER, ADVERT);
router.use('/market/', AUTH.authenticate, SANITIZER, MARKET);
router.use('/messages/', AUTH.authenticate, SANITIZER, MESSAGES);
router.use('/hashtags/', AUTH.authenticate, SANITIZER, HASHTAGS);
router.use('/user-photos/', AUTH.authenticate, SANITIZER, USERPHOTO);
router.use('/user-tagged/', AUTH.authenticate, SANITIZER, USER_TAGGED);
router.use('/storyline/', AUTH.authenticate, SANITIZER, STORYLINE);
router.use('/announcement/', AUTH.authenticate, SANITIZER, ANNOUNCEMENT);
router.use('/videoprocess/', AUTH.authenticate, SANITIZER, VIDEOPROCESS);
router.use('/test2/', TEST);
router.use('/autobot/', AUTOBOT);
router.use('/open/', OPEN);
router.use('/newapi/', AUTH.authenticate, SANITIZER, APIs);
router.use('/advert/', SANITIZER, ADVERTAPI.routes());
router.use('/webhook', SANITIZER, WEBHOOK);
router.use('/ehealth', EHEALTH);
router.use('/payment', PAYMENT);

router.use('/image-demo', SANITIZER, IMAGE_DEMO);

module.exports = router;
