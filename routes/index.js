var express = require('express');
var router = express.Router();
let USERS = require('./users');
let POSTS = require('./posts');
let PROFILE = require('./profile');
let GROUP = require('./groups');
let LIKE = require('./like');
let NOTIFICATION = require('./notification');
let POSTCOMMENT = require('./post_comment');
let USERPHOTO = require('./user_photo');
let AD_REQUEST = require('./ad_request');
let ADVERT = require('./advert');
let MARKET = require('./market');
let MESSAGES = require('./messages');
let HASHTAGS = require('./hashtags');
let USER_TAGGED = require('./user_tagged_details');
var AUTH = require('../_helpers/authentication');
const SANITIZER = require('../_helpers/sanitizer');
let IMAGE_DEMO = require('../models/image_demo');
let STORYLINE = require('./storyline');
let ANNOUNCEMENT = require('./announcement');
let VIDEOPROCESS = require('./videoprocess');
let CALL = require('./call');
let TEST = require('./test');
let AUTOBOT = require('./autobot');
let OPEN = require('./open');
const EHEALTH = require('./ehealth');
const ADVERTAPI = require('./advert.route');
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
router.use('/call/', AUTH.authenticate, CALL);
router.use('/test/', AUTH.authenticate, TEST);
router.use('/test2/', TEST);
router.use('/autobot/', AUTOBOT);
router.use('/open/', OPEN);
router.use('/advert/', SANITIZER, ADVERTAPI.routes());
router.use('/image-demo', SANITIZER, IMAGE_DEMO);
let EMONEY = require('./emoney');
router.use('/emoney/', EMONEY);
router.use('/ehealth', EHEALTH);
router.use('/advertTransaction', require('./advert_transaction'));
module.exports = router;
