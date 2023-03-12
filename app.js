const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const path = require('path');
const csurf = require('csurf');
const apiRouterV1 = require('./routes');
const apiRouterV2 = require('./routes/v2');
const ADMIN_ROUTES = require('./admin');
const errorHandler = require('./_helpers/error-handler');
const webhook = require('./routes/v2/webhook');

const { connectMongoose } = require('./configs/dbConnection');

const app = express();

require('./graphql');

connectMongoose();

const whitelist = [
	'http://localhost',
	'http://localhost:3000',
	'http://localhost:3001',
	'http://localhost:8001',
	'http://localhost:4200',
	'https://afrocamgist.com',
	'https://m.afrocamgist.com',
	'https://staging.afrocamgist.com',
	'https://m.staging.afrocamgist.com',
	'http://209.97.176.134:4001',
	'http://209.97.176.134',
	'https://api.afroswagger.com',
];

let corsOptionsDelegate;

if (process.env.NODE_ENV === 'production') {
	corsOptionsDelegate = function (req, callback) {
		let corsOptions;
		if (
			whitelist.indexOf(req.header('Origin')) !== -1 ||
			!req.header('Origin')
		) {
			corsOptions = { origin: req.headers.origin, credentials: true };
			callback(null, corsOptions);
		} else {
			callback(
				new Error(`Access to API from origin ${req.header('Origin')} denied`)
			);
		}
	};
} else {
	corsOptionsDelegate = function (req, callback) {
		let corsOptions;
		if (
			whitelist.indexOf(req.header('Origin')) !== -1 ||
			!req.header('Origin')
		) {
			corsOptions = { origin: req.headers.origin, credentials: true };
		} else {
			corsOptions = { origin: true, credentials: false };
		}
		callback(null, corsOptions);
	};
}

// app.use(cors(corsOptionsDelegate));
app.use(cors(corsOptionsDelegate));

app.use(logger('dev'));
app.use(express.json({ limit: '550mb' }));
app.use(express.urlencoded({ limit: '550mb', extended: true }));

app.post('/test', (req, res)=>{
	res.send('test is called.');
})



let utility = require('./utilities');
var job = require('./cronjobwork');
let { checkRegistrationIP, AutoFollowCelebJob, AutoFollowJob, deactivatePosts, AutoLikeJob, job: cronJob } = job
let { getSwitches, handleSwitches } = require('./admin/autolike');
let keys = Object.keys(job)
function manageJobs(status) {
	console.log({ manageJobStatus: status })
	let jobArr = [checkRegistrationIP, AutoFollowCelebJob, AutoFollowJob, deactivatePosts, AutoLikeJob, cronJob]
	// if (process.env.NODE_ENV === 'production') {
	getSwitches({}, {}, async (err, data) => {
		// let maintance = await checkMaintanceMode()
		// let status = !maintance.status
		if (err) {
			console.log(err);
		} else {

			console.log({ status })
			if (Array.isArray(data)) {
				data.forEach((ele, index, arr) => {
					handleSwitches(ele.perMinute, ele.status, status);
				});
			}
		}
	});
	// }

	jobArr.forEach((func, i) => {
		console.log("job status of " + keys[i] + " is running " + func.running)
		if (status) {
			if (func.running) {
				console.log("stopped job " + keys[i])
				func.stop()
			}
		} else {
			if (!func.running) {
				console.log("started job " + keys[i])
				func.start()
			}
		}

	})
	// if (status) {
	// 	jobArr.forEach((func, i) => {
	// 		console.log("job status of " + i + " " + func.running)
	// 		if (func.running) {
	// 			console.log("stopped job "+ i)
	// 			func.start()
	// 		}
	// 	})
	// } else {
	// 	jobArr.forEach((func, i) => {
	// 		console.log("job status of " + i + " is running" + func.running)
	// 		if (func.running) {
	// 			console.log("stopped")
	// 			func.stop()
	// 		}

	// 	})
	// }
}
app.post("/maintenance", (req, res) => {

	utility.mongoConnect(req, res, function (client) {
		if (!('status' in req.body)) {
			return res.send({ staus: false, message: "status is required " })
		}
		let CONNECTION = client.db(utility.dbName);
		let maintenanceCollection = CONNECTION.collection('maintenance');
		// maintenanceCollection.findOne({ id: 1 }, (err, currentDoc) => {

		maintenanceCollection.findOneAndUpdate({ id: 1 }, { $set: { status: req.body.status } },
			{ upsert: true },
			function (err, doc) {
				if (err) {
					console.log(err)

					return res.send({ status: false, message: err.message })
				} else {
					manageJobs(req.body.status)
					return res.send({ status: true })
				}
			})
		// })
	})
})
app.get("/maintenance", (req, res) => {
	res.header("Cache-Control", "no-cache, no-store, must-revalidate");
	res.header("Pragma", "no-cache");
	res.header("Expires", 0);
	res.set('etag', false)
	// res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
	res.set('Cache-Control', 'no-store')
	console.log("@@@@@@@ GET MAINTANANCE MODE STATUS API CALLED @@@")
	utility.mongoConnect(req, res, function (client) {
		let CONNECTION = client.db(utility.dbName);
		let maintenanceCollection = CONNECTION.collection('maintenance');
		maintenanceCollection.findOne({ id: 1 }, (err, currentDoc) => {

			console.log({ currentDoc })
			return res.send({ status: currentDoc?.status, message: "maintance mode status" })

		})
	})
})
checkMaintanceMode().then(res => {
	console.log(res)
	manageJobs(res)
})

app.use(async (req, res, next) => {
	console.log(req.originalUrl)
	if (req.originalUrl == '/maintenance') { return next() }
	let maintance = await checkMaintanceMode()
	console.log({ maintance })
	manageJobs(maintance)
	if (maintance) {

		return res.send({ status: false, message: "server is in maintanance" })
	} else {

		return next()
	}

})
function checkMaintanceMode() {
	return new Promise(resolve => {


		utility.mongoConnect({}, {}, function (client) {
			console.log("here")

			let CONNECTION = client.db(utility.dbName);
			let maintenanceCollection = CONNECTION.collection('maintenance');
			maintenanceCollection.findOne({ id: 1 },
				function (err, doc) {
					if (err) {
						console.log(err)
						return resolve(false)
					} else {
						return resolve(doc?.status ?? false)
						// if (doc?.status) {
						// 	return resolve({ status: false, message: "server is in maintance" })
						// } else {
						// 	console.log("not in maintance")
						// 	return resolve({ status: true, message: "" })
						// 	// return next()
						// }
						// console.log("doc", doc)
					}

				})
		})
	})
}















app.use('/api/', apiRouterV1, errorHandler);
app.use('/admin/', ADMIN_ROUTES, errorHandler);
// app.use(function (req, res, next) {
// 	res.header('Access-Control-Allow-Credentials', true);
// 	res.header('Access-Control-Allow-Origin', req.headers.origin);
// 	res.header(
// 		'Access-Control-Allow-Methods',
// 		'GET,PUT,POST,DELETE,UPDATE,OPTIONS'
// 	);
// 	res.header(
// 		'Access-Control-Allow-Headers',
// 		'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept'
// 	);
// 	next();
// });

app.use(cookieParser());

app.use('/api/v2/webhook', webhook());

// app.use(
// 	csurf({
// 		cookie: {
// 			httpOnly: true,
// 			domain:
// 				process.env.NODE_ENV === 'production' ? 'afrocamgist.com' : undefined,
// 		},
// 	})
// );

// app.use((err, req, res, next) => {
// 	if (err.code === 'EBADCSRFTOKEN') {
// 		console.log('CSRF ERROR!!');
// 		console.log(req.headers);
// 		if (req.headers.reqfrom && req.headers.reqfrom === 'app') {
// 			return next();
// 		}

// 		if (req.headers['user-agent'].includes('PostmanRuntime')) return next();

// 		next(err);
// 	}
// });

// app.use((req, res, next) => {
// 	res.cookie('A_SHH', req.csrfToken(), {
// 		httpOnly: false,

// 		domain:
// 			process.env.NODE_ENV === 'production' ? 'afrocamgist.com' : undefined,
// 	});
// 	next();
// });

// app.get('/xsrf', (req, res) => {
// 	return res.status(200).json({
// 		status: true,
// 		_csrf: req.csrfToken(),
// 	});
// });

app.use('/app', express.static(__dirname + '/app'));
app.get('/app/index.html', function (req, res) {
	res.sendFile(path.join(__dirname + '/app/index.html'));
});




const manager = __dirname + '/manager';
app.use(express.static(manager));

app.use('/api/v2/', apiRouterV2, errorHandler);
//turn off the autolike in local development

console.log({ node_env: process.env.NODE_ENV });
process.on('unhandledRejection', (err, p) => {
	console.log('An unhandledRejection occurred');
	console.log(`Rejected Promise: ${p}`);
	console.log(`Rejection: ${err}`);
});

module.exports = app;
