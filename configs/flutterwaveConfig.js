const Flutterwave = require('flutterwave-node-v3');

const flwClient = new Flutterwave(
	process.env.FLUTTERWAVE_PUBLIC_KEY,
	process.env.FLUTTERWAVE_SECRET_KEY
);

module.exports = { flwClient };
