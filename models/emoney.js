'use strict';
let utility = require('../utilities');
// const SITE_CONFIG = require('../configs/siteConfig');
// const path = require('path');
// const multer = require('multer');
// const fs = require('fs');
const uuid = require('uuid');
const paypalSDK = require('@paypal/checkout-server-sdk');
const axios = require('axios').default;
const paypalClient = require('../_helpers/paypalClient');
const BASE_URL = paypalClient.BASE_URL;

const emoneyModel = require('./emoney.json');
const transactionModel = require('./transaction.json');

/**
 * Function to handle creating order in Paypal
 * @param {*} amount
 * @param {*} currency
 * @returns
 */
 const createPaypalOrder = async (amount, currency) => {
	// process paypal order creation
	const request = new paypalSDK.orders.OrdersCreateRequest();
	request.prefer('return=representation');
	request.requestBody({
		intent: 'CAPTURE',
		purchase_units: [
			{
				reference_id: uuid.v4(),
				amount: {
					currency_code: currency ? currency : 'USD',
					value: `${amount}`
				}
			}
		]
	});

	let access_token;
	try {
		access_token = await (
			await paypalClient.getPayPalAccessToken()
		).access_token;
	} catch (error) {
		if (error.response) {
			console.log(error.response.data);
			return res.sendStatus(500);
		}
		console.log(error.message);
		return res.sendStatus(500);
	}

	const config = {
		headers: {
			authorization: `Bearer ${access_token}`
		}
	};

	const order_details = {
		intent: 'CAPTURE',
		purchase_units: [
			{
				reference_id: uuid.v4(),
				amount: {
					currency_code: currency ? currency : 'USD',
					value: `${amount}`
				}
			}
		]
	};

	let order;
	try {
		let endpoint = '/v2/checkout/orders';
		const url = `${BASE_URL}${endpoint}`;
		order = await (await axios.post(url, order_details, config)).data;
	} catch (err) {
		console.error(err);
		return err;
	}

	console.log('created order', order);
	return order;
};

module.exports.sendMoney = async function (CLIENT, req, res, cb) {
    /* Validation */
    let sender = {};
    let receiver = {};
    // validate data exists
    if (!req.body || !req.body.sender || !req.body.receiver || !req.body.amount) {
        try {
            cb('Please enter all required data');
        } catch (error) {
            console.log('an error occured:', error);
            cb(error);
        }
        return;
    }
    if(req.body.sender) {
        try {
            sender.id = (req.body.sender.id) ? Number(req.body.sender.id) : null;
            sender.name = (req.body.sender.name) ? req.body.sender.name : null;
            sender.dob = (req.body.sender.dob) ? req.body.sender.dob : null;
            sender.country = (req.body.sender.country) ? req.body.sender.country : null;
            sender.currency = (req.body.sender.currency) ? req.body.sender.currency : null;
            sender.id_img = (req.body.sender.id_img) ? req.body.sender.id_img : null;
            if(!sender.name || !sender.dob || !sender.country || !sender.currency || !sender.id_img) {
                cb('Please enter all required data for sender');
                return;
            }
        } catch (error) {
            cb(error);
            return;
        }
    }
    if(req.body.receiver) {
        try {
            receiver.id = (req.body.receiver.id) ? Number(req.body.receiver.id) : null;
            receiver.name = (req.body.receiver.name) ? req.body.receiver.name : null;
            receiver.email = (req.body.receiver.email) ? req.body.receiver.email : null;
            receiver.country = (req.body.receiver.country) ? req.body.receiver.country : null;
            receiver.currency = (req.body.receiver.currency) ? req.body.receiver.currency : null;
            receiver.postal_address = (req.body.receiver.postal_address) ? req.body.receiver.postal_address : null;
            receiver.bank_detail = (req.body.receiver.bank_detail) ? req.body.receiver.bank_detail : null;
            if(!receiver.name || !receiver.country || !receiver.currency || !receiver.bank_detail) {
                cb('Please enter all required data for receiver');
                return;
            }
        } catch (error) {
            cb(error);
            return;
        }
    }
    let moneyData = {};
    if(sender.id) {
        moneyData.sender_id = sender.id;
    }
    moneyData.sender_name = sender.name;
    moneyData.sender_dob = sender.dob;
    moneyData.sender_country = sender.country;
    moneyData.sender_currency = sender.currency;
    moneyData.sender_id_img = sender.id_img;
    if(receiver.id && receiver.id!=null) {
        moneyData.receiver_id = receiver.id;
    }
    moneyData.receiver_name = receiver.name;
    moneyData.receiver_email = receiver.email;
    moneyData.receiver_country = receiver.country;
    moneyData.receiver_currency = receiver.currency;
    moneyData.receiver_postal_address = receiver.postal_address;
    moneyData.receiver_bank_detail = receiver.bank_detail;
    moneyData.amount = req.body.amount;

    const order = await createPaypalOrder(moneyData.amount, moneyData.sender_currency);

    let CONNECTION = CLIENT.db(utility.dbName);
    let emoneyCollection = CONNECTION.collection(emoneyModel.collection_name);
    utility.validatePostData(CONNECTION, moneyData, emoneyModel, 'insert', 0, function (err, validatedData) { 
        if(err) {
            console.log("err: ", err);
            cb(err);
        }
        if (order.id) {
            const Transaction = CONNECTION.collection(transactionModel.collection_name);
            let transaction_id = uuid.v4()
            Transaction.insertOne({
                transaction_id: transaction_id,
                order,
                user_id: moneyData.sender_id ? moneyData.sender_id : 0,
                emoney_id: validatedData.emoney_id,
                type: "eMoney"
            }, (err, resp) => { 
                validatedData.transaction_id = transaction_id;
                emoneyCollection.insertOne(validatedData, function(err, callDetail) {
                    let finalResponse = {};
                    finalResponse.status = true;
                    finalResponse.data = validatedData;
                    cb(null, finalResponse);
                });
            });
        }
    });
};