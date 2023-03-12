'use strict';
const shortUrl = require('node-url-shortener');
//const API2FACTOR = 'd72f279b-593a-11e9-a6e1-0200cd936042';
module.exports.sendRegistrationSMS = function (userData) {
	shortUrl.short(
		'https://m.afrocamgist.com/verify-email/' + userData.verification_token,
		function (err, url) {
			if (err) {
				url =
					'https://m.afrocamgist.com/verify-email/' +
					userData.verification_token;
			}
			let message =
				'Hi ' +
				userData.first_name +
				', Thank you for Registering with us. open link to verify your registration ' +
				url;
			if (userData.contact_number) {
				// sendSMS(userData.contact_number, message);
				sendRegistrationSMS(
					'+' + userData.contact_number,
					userData.first_name,
					url,
					userData.verification_otp
				);
			}
		}
	);
};

module.exports.sendPasswordResetSMS = function (userData) {
	let message =
		'Hi ' +
		userData.first_name +
		', You have requested for Password Reset.\n' +
		'Your passcode is ' +
		userData.password_reset_otp +
		' which is valid for next one hour.';
	if (userData.contact_number) {
		// sendSMS(userData.contact_number, message);
		sendOTPSMS(
			'+' + userData.contact_number,
			userData.first_name,
			userData.password_reset_otp
		);
	}
};

module.exports.send2FaLinkSMS = function (userData, token, cb) {
	if (userData.contact_number) {
		const messagingApi = require('@cmdotcom/text-sdk');
		const yourProductToken = 'BB4818B4-BC3C-4FA5-B056-93CBAED020F7';
		const myMessageApi = new messagingApi.MessageApiClient(yourProductToken);

		const result = myMessageApi.sendTextMessage(
			['+' + userData.contact_number],
			'afrocamgist',
			'Hi ' +
				userData.first_name +
				', \n' +
				token +
				' is your verification code.'
		);
		result
			.then((result) => {
				console.log(result);
				cb(null, result);
			})
			.catch((error) => {
				// console.log(error);
				cb(error);
			});
	} else {
		cb({ status: false, message: 'not phone number for user' }, false);
	}
};

// const sendSMS = function (toNumber, message) {
//     const request = require('request');
//     const url = 'http://api.smsala.com/api/SendSMS?api_id=API206887342364&api_password=JiNDKYS51H&sms_type=T&encoding=T&sender_id=TSTALA&phonenumber=' + toNumber + '&textmessage=' + message;
//     request(url, function (error, response, body) {
//         console.log('error:', error); // Print the error if one occurred
//         console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
//         console.log('body:', body); // Print the HTML for the Google homepage.
//     });
// };

const sendOTPSMS = function (toNumber, name, OTP) {
	/**
	 * 2factor SMS Gateway
	 * @@@@@@@@@@@@@@@@@@ THIS IS NOT IN USED BUT BECAUSE OF NEW GATEWAY GET HACKED IT IS STARTED AGAIN. @@@@@@@@@@@@@@@
	 */
	// const request = require('request');
	// const url = 'http://2factor.in/API/V1/' + API2FACTOR + '/SMS/' + toNumber + '/' + OTP + '/PROTP';

	// request.get(url, function (error, response, body) {
	//     console.log('error:', error); // Print the error if one occurred
	//     console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
	//     console.log('body:', body); // Print the HTML for the Google homepage.
	// });

	/**
	 * New SMS gateway
	 * @@@@@@@@@@@@@@@@@@ IT LOOKS HACKED SO TILL FIXED IT WE ARE GOING TOCOMMENT IT. @@@@@@@@@@@@@@@
	 */
	const messagingApi = require('@cmdotcom/text-sdk');
	const yourProductToken = 'BB4818B4-BC3C-4FA5-B056-93CBAED020F7';
	const myMessageApi = new messagingApi.MessageApiClient(yourProductToken);
	// let number = toNumber.charAt(0) === "+" ? toNumber : "+"+toNumber
	let number = '';
	if (toNumber.charAt(0) == '+') {
		number = toNumber;
	} else {
		number = '+' + toNumber;
	}
	console.log(
		number,
		'Hi ' +
			name +
			', \n' +
			OTP +
			' is your passcode, to verify your account on Afrocamgist.'
	);
	const result = myMessageApi.sendTextMessage(
		[number],
		'afrocamgist',
		'\n' + OTP + ' is your OTP for phone verification'
	);
	result
		.then((result) => {
			console.log(result.body.messages);
			// cb(null, result);
		})
		.catch((error) => {
			console.error(error);
			// cb(error);
		});
	/**
	 * New SMS gateway
	 * @@@@@@@@@@@@@@@@@@ IT LOOKS HACKED SO TILL FIXED IT WE ARE GOING TOCOMMENT IT. @@@@@@@@@@@@@@@
	 */
	// const messagingApi = require("@cmdotcom/text-sdk");
	// const yourProductToken = "BB4818B4-BC3C-4FA5-B056-93CBAED020F7";
	// const myMessageApi = new messagingApi.MessageApiClient(yourProductToken);

	// const result = myMessageApi.sendTextMessage([toNumber], "afrocamgist", "Hi "+name+", \nYou have requested for Password Reset. \n"+OTP+" is your passcode, which is valid for next one hour.");
	// result.then((result) => {
	//     console.log(result);
	//     // cb(null, result);
	// }).catch((error) => {
	//     console.log(error);
	//     // cb(error);
	// });
};

// const sendRegistrationSMS = function (toNumber, name, link, OTP) {
//     /**
//      * 2factor SMS Gateway
//      * @@@@@@@@@@@@@@@@@@ THIS IS NOT IN USED BUT BECAUSE OF NEW GATEWAY GET HACKED IT IS STARTED AGAIN. @@@@@@@@@@@@@@@
//      */
//     // console.log(toNumber)
//     // const request = require('request');
//     // const url = 'http://2factor.in/API/V1/' + API2FACTOR + '/SMS/' + toNumber + '/' + OTP + '/AFROREG';
//     // request.get(url, function (error, response, body) {
//     //     console.log('error:', error); // Print the error if one occurred
//     //     console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
//     //     console.log('body:', body); // Print the HTML for the Google homepage.
//     // });

//     /**
//      * New SMS gateway
//      * @@@@@@@@@@@@@@@@@@ IT LOOKS HACKED SO TILL FIXED IT WE ARE GOING TOCOMMENT IT. @@@@@@@@@@@@@@@
//      */
//     const messagingApi = require("@cmdotcom/text-sdk");
//     const yourProductToken = "BB4818B4-BC3C-4FA5-B056-93CBAED020F7";
//     const myMessageApi = new messagingApi.MessageApiClient(yourProductToken);

//     const result = myMessageApi.sendTextMessage(["+"+toNumber], "afrocamgist", "Hi "+name+", \n"+OTP+" is your passcode, to verify your account on Afrocamgist.");
//     result.then((result) => {
//         console.log(result);
//         // cb(null, result);
//     }).catch((error) => {
//         console.log(error);
//         // cb(error);
//     });
// };
const sendRegistrationSMS = function (toNumber, name, link, OTP) {
	/**
	 * 2factor SMS Gateway
	 * @@@@@@@@@@@@@@@@@@ THIS IS NOT IN USED BUT BECAUSE OF NEW GATEWAY GET HACKED IT IS STARTED AGAIN. @@@@@@@@@@@@@@@
	 */
	// console.log(toNumber)
	// const request = require('request');
	// const url = 'http://2factor.in/API/V1/' + API2FACTOR + '/SMS/' + toNumber + '/' + OTP + '/AFROREG';
	// request.get(url, function (error, response, body) {
	//     console.log('error:', error); // Print the error if one occurred
	//     console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
	//     console.log('body:', body); // Print the HTML for the Google homepage.
	// });

	/**
	 * New SMS gateway
	 * @@@@@@@@@@@@@@@@@@ IT LOOKS HACKED SO TILL FIXED IT WE ARE GOING TOCOMMENT IT. @@@@@@@@@@@@@@@
	 */
	const messagingApi = require('@cmdotcom/text-sdk');
	const yourProductToken = 'BB4818B4-BC3C-4FA5-B056-93CBAED020F7';
	const myMessageApi = new messagingApi.MessageApiClient(yourProductToken);
	// let number = toNumber.charAt(0) === "+" ? toNumber : "+"+toNumber
	let number = '';
	if (toNumber.charAt(0) == '+') {
		number = toNumber;
	} else {
		number = '+' + toNumber;
	}
	console.log(
		number,
		'Hi ' +
			name +
			', \n' +
			OTP +
			' is your passcode, to verify your account on Afrocamgist.'
	);
	const result = myMessageApi.sendTextMessage(
		[number],
		'afrocamgist',
		'Hi ' +
			name +
			', \n' +
			OTP +
			' is your passcode, to verify your account on Afrocamgist.'
	);
	result
		.then((result) => {
			console.log(result.body.messages);
			// cb(null, result);
		})
		.catch((error) => {
			console.error(error);
			// cb(error);
		});
};
