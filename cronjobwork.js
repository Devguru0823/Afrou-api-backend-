const {
	promoNotification,
	getRandomLike,
	deActivateStoryLine,
	checkRegistrationIPs,
} = require('./_helpers/promoNotifications');
var CronJob = require('cron').CronJob;
const cron = require('node-cron');
// const {getRandomLike}=  require("./admin/autolike")
const { flwClient } = require('./configs/flutterwaveConfig');
const FlutterWavePayment = require('./models/v2/FlutterWavePayment.model');
const Advert = require('./models/v2/Advert.model');
const Post = require('./models/v2/Post.model');

var job = new CronJob(
	'0 3 * * *',
	function () {
		// console.log('started!!!!');
		// promoNotification();
	},
	function () {
		console.log('stop');
	},
	true
);

var AutoLikeJob = new CronJob(
	'*/1 7-23 * * *',
	function () {
		console.log('Auto like START');
		// console.log('Like start 2');
		// getRandomLike(10);
	},
	function () {
		console.log('Auto like STOP');
	},
	true
);


var deactivatePosts = new CronJob(
	'*/1 * * * *',
	function () {
		// console.log('Deactivate 24 hour post');
		// deActivateStoryLine();
	},
	function () {
		console.log('STOP');
	},
	true
);

var AutoFollowJob = new CronJob(
	'*/1 * * * *',
	function () {
		console.log('Auto follow START');
		// getRandomLike();
		// var request = require( 'superagent' );
		// request
		//     .post( "https://manager.staging.afrocamgist.com/api/autobot/followuser" )
		//     .end( function ( err, res ) {
		//         console.log(err);
		//         // console.log(res);
		//     });
	},
	function () {
		console.log('Auto follow STOP');
	},
	true
);

var AutoFollowCelebJob = new CronJob(
	'*/1 * * * *',
	function () {
		// console.log('Auto follow Celeb START');
		// var request = require( 'superagent' );
		// request
		//     .post( "http://localhost:3000/api/autobot/followcelebrityuser" )
		//     .end( function ( err, res ) {
		//         console.log(err);
		//         // console.log(res);
		//     });
	},
	function () {
		console.log('Auto like STOP');
	},
	true
);

var checkRegistrationIP = new CronJob(
	'*/5 * * * *',
	function () {
		console.log('Start checking cron');
		// checkRegistrationIPs();
	},
	function () {
		console.log('Auto STOP');
	},
	true
);

const transactionVerificationPing = (id) => {
	// const task = new CronJob('*/10 * * * *', async () => {
	// 	const transaction = await flwClient.Transaction.verify({ id });

	// 	if (transaction.data.status === 'success') {
	// 		// update transaction in db
	// 		const transactionUpdate = FlutterWavePayment.findOneAndUpdate(
	// 			{ id },
	// 			{
	// 				$set: {
	// 					...transaction,
	// 				},
	// 			}
	// 		);

	// 		if (!transactionUpdate) {
	// 			console.log('***************************************');
	// 			console.log('CRON JOB: Invalid transaction ID');
	// 			console.log('***************************************');
	// 			return;
	// 		}

	// 		task.stop();
	// 	}
	// });
};

const expireAdvertCron = (date) => {
	// const cron = new CronJob(
	// 	date,
	// 	async () => {
	// 		const update = await Advert.updateMany(
	// 			{ end_date: { $lte: new Date() } },
	// 			{ expired: true, status: 'expired' }
	// 		);
	// 		console.log('ADVERT DEACTIVATION RESULT: ', update);

	// 		// get the updated ids
	// 		const ids = await (
	// 			await Advert.find({ expired: true })
	// 		).map((ad) => ad._id);

	// 		const postUpdates = await Post.updateMany(
	// 			{ promoted: true, _id: { $in: ids } },
	// 			{ promoted: false }
	// 		);
	// 		console.log('POST PROMOTIONS DEACTIVATION RESULT: ', postUpdates);
	// 	},
	// 	null,
	// 	true,
	// 	'Africa/Lagos'
	// );
};

// getRandomLike(10)
module.exports = {
	job,
	AutoLikeJob,
	deactivatePosts,
	AutoFollowJob,
	AutoFollowCelebJob,
	checkRegistrationIP,
	transactionVerificationPing,
	expireAdvertCron,
};
