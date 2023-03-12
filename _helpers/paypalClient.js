const paypalSDK = require('@paypal/checkout-server-sdk');
const queryString = require('querystring');
const axios = require('axios').default;

// PAYPAL BASE URL
const BASE_URL = 'https://api.sandbox.paypal.com';

/**
 *
 * Returns PayPal HTTP client instance with environment that has access
 * credentials context. Use this instance to invoke PayPal APIs, provided the
 * credentials have access.
 */

function client() {
	return new paypalSDK.core.PayPalHttpClient(environment());
}


/**

 *

 * Set up and return PayPal JavaScript SDK environment with PayPal access credentials.

 * This sample uses SandboxEnvironment. In production, use LiveEnvironment.

 *

 */

function environment() {
	console.log(process.env.PAYPAL_CLIENT_ID);
	console.log(process.env.PAYPAL_CLIENT_SECRET);
	let clientId = process.env.PAYPAL_CLIENT_ID;
	let clientSecret = process.env.PAYPAL_CLIENT_SECRET;

	return new paypalSDK.core.SandboxEnvironment(
		clientId, clientSecret
	);
}

async function prettyPrint(jsonData, pre = "") {
	let pretty = "";
	function capitalize(string) {
		return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
	}
	for (let key in jsonData) {
		if (jsonData.hasOwnProperty(key)) {
			if (isNaN(key))
				pretty += pre + capitalize(key) + ": ";
			else
				pretty += pre + (parseInt(key) + 1) + ": ";
			if (typeof jsonData[key] === "object") {
				pretty += "\n";
				pretty += await prettyPrint(jsonData[key], pre + "    ");
			}
			else {
				pretty += jsonData[key] + "\n";
			}
		}
	}

	return pretty;
}

/**
 * This function is used to get an Access Token from Paypal
 * @returns 
 */
const getPayPalAccessToken = async () => {
	console.log('CLIENT ID: ', process.env.PAYPAL_CLIENT_ID);
	console.log('CLIENT SECRET: ', process.env.PAYPAL_CLIENT_SECRET);
	const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
	const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
	const endpoint = '/v1/oauth2/token';
	const base64EncAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
	const config = {
		headers: {
			authorization: `basic ${base64EncAuth}`
		}
	};
	const data = queryString.stringify({
		grant_type: 'client_credentials'
	});
	const url = `${BASE_URL}${endpoint}`;
	const result = await (await axios.post(url, data, config)).data;
	return result;
};


const getOrderDetails = async (orderID) => {
	// get order from paypal with ID
	let request = new paypalSDK.orders.OrdersGetRequest(orderID);
	let order;
	try {
		order = await client().execute(request);
	} catch (err) {
		console.log('error', err.message);
		const errorMessage = err.message;
		order = errorMessage;
	}
	return order;
}

module.exports = { client, prettyPrint, getPayPalAccessToken, getOrderDetails, BASE_URL };
