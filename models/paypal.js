// jshint esversion:9
const paypalSDK = require("@paypal/checkout-server-sdk");
const axios = require("axios").default;
const paypalClient = require("../_helpers/paypalClient");
const ErrorResponse = require("../_helpers/v2/errorResponse");
const utility = require("../utilities");
const uuid = require("uuid");
const logger = require("../_helpers/logger");
const transactionModel = require("./transaction.json");
const asyncHandler = require("../middlewares/v2/async");
const { createHistory } = require("./history");

const BASE_URL = paypalClient.BASE_URL;

const createPaypalOrder = async (amount, currency) => {
  // process paypal order creation
  const request = new paypalSDK.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: uuid.v4(),
        amount: {
          currency_code: currency ? currency : "USD",
          value: `${amount}`,
        },
      },
    ],
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
      authorization: `Bearer ${access_token}`,
    },
  };

  const order_details = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: uuid.v4(),
        amount: {
          currency_code: currency ? currency : "USD",
          value: `${amount}`,
        },
      },
    ],
  };

  let order;
  try {
    let endpoint = "/v2/checkout/orders";
    const url = `${BASE_URL}${endpoint}`;
    order = await (await axios.post(url, order_details, config)).data;
  } catch (err) {
    console.error(err);
    return err;
  }

  console.log("created order", order);
  return order;
};

module.exports.handleGetOrderDetails = asyncHandler(async (req, res) => {
  const { orderID, amount } = req.query;
  if (!orderID || !amount) {
    return res.status(400).json({
      status: false,
      error: "BAD REQUEST: missing orderID or amount",
    });
  }
  // get order from paypal with ID
  let request = new paypalSDK.orders.OrdersGetRequest(orderID);
  let order;
  try {
    order = await paypalClient.client().execute(request);
  } catch (err) {
    const errorMessage = JSON.parse(err.message);
    return res.status(err.statusCode).json({
      status: false,
      error: errorMessage.details[0].description || "NOT FOUND",
    });
  }

  // validate the amount is the same
  if (order.result.purchase_units[0].amount.value !== amount) {
    return res.status(400).json({
      status: false,
      error: "BAD REQUEST: Incorrect amount value",
    });
  }
  return res.status(200).json({
    status: true,
    data: order.result,
  });
});

module.exports.handleCreateOrder = asyncHandler(async (req, res, next) => {
  const { amount, currency } = req.body;
  if (!amount) {
    return next(new ErrorResponse("BAD REQUEST: missing amount", 400));
  }

  const order = await createPaypalOrder(amount, currency);
  if (order.id) {
    utility.mongoConnect(req, res, async function (CLIENT) {
      if (!CLIENT) {
        return res.status(500).json({
          status: false,
          error: "an error occured",
        });
      }
      const db = CLIENT.db(utility.dbName);
      const Transaction = db.collection(transactionModel.collection_name);
      let transaction_id = uuid.v4();
      // save transaction to db
      try {
        Transaction.insertOne(
          {
            transaction_id: transaction_id,
            order,
          },
          (err, resp) => {
            if (err) {
              CLIENT.close();
              console.log("transaction insertion error", err);
              return res.status(500).json({
                status: false,
                error: "error creating transaction",
              });
            }

            // send response to user
            return res.status(201).json({
              status: true,
              data: {
                order: order,
                transaction: {
                  transaction_id: transaction_id,
                },
              },
            });
          }
        );
      } catch (error) {
        CLIENT.close();
        console.log("error creating transaction: ", error);
        return res.status(500).json({
          status: false,
          error: error.message,
        });
      }
    });
  }
});

module.exports.handlePaymentCapture = asyncHandler(async (req, res, next) => {
  const { orderID } = req.body;
  if (!orderID) {
    return next(new ErrorResponse("BAD REQUEST: missing order id", 400));
  }

  let access_token;

  try {
    access_token = req.body.access_token
      ? req.body.access_token
      : await (
          await paypalClient.getPayPalAccessToken()
        ).access_token;
  } catch (error) {
    if (error.response) {
      console.log(error.response.data);
      return res.sendStatus(500);
    }
    return res.sendStatus(500);
  }

  const config = {
    headers: {
      authorization: `Bearer ${access_token}`,
      "PayPal-Request-Id": uuid.v4(),
    },
  };

  // create paypal capture request
  let capture;
  try {
    // execute order capture
    const endpoint = `/v2/checkout/orders/${orderID}/capture`;
    const url = `${BASE_URL}${endpoint}`;
    capture = await (await axios.post(url, {}, config)).data;

    if (capture.error) {
      logger.error(capture.error);
      return next(new ErrorResponse("An error occured", 422));
    }
  } catch (error) {
    if (error.response) {
      console.log(error.response.data);
      logger.error(error.response.data);
      return res.status(error.response.status).json({
        status: false,
        details: error.response.data.details,
      });
    }
    console.log(error.message);
    return res.status(500).json({
      status: false,
      error: "INTERNAL SERVER ERROR",
    });
  }

  // Save the capture ID to database.
  const captureID = capture.purchase_units[0].payments.captures[0].id;

  if (req.body.Transaction) {
    // came from webhook
    let transactionUpdate;
    try {
      console.log("capture data: ", capture);
      const update = await req.body.Transaction.findOneAndUpdate(
        { "order.id": orderID, user_id: req.authorization.user_id },
        { $set: { captureID, order: capture } }
      );
      req.body.CLIENT.close();
      console.log("transaction update:", update);
      if (!update) {
        return res.status(422).json({
          status: false,
          error: "could not save capture id",
        });
      }

      if (update.lastErrorObject && !update.lastErrorObject.updatedExisting) {
        return res.status(500).json({
          status: false,
          error: "could not update transaction",
        });
      }
      transactionUpdate = update;
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
    return res.status(200).json({
      status: true,
      capture,
      transactionUpdate,
    });
  }

  utility.mongoConnect(req, res, async (CLIENT) => {
    if (!CLIENT) {
      return res.status(500).json({
        status: false,
        error: "an error occured",
      });
    }
    const db = CLIENT.db(utility.dbName);
    const Transaction = db.collection(transactionModel.collection_name);

    let transactionUpdate;
    try {
      console.log("capture data: ", capture);
      const update = await Transaction.findOneAndUpdate(
        { "order.id": orderID },
        { $set: { captureID, order: capture } }
      );
      CLIENT.close();
      console.log("transaction update:", update);
      if (!update) {
        return res.status(422).json({
          status: false,
          error: "could not save capture id",
        });
      }

      if (update.lastErrorObject && !update.lastErrorObject.updatedExisting) {
        return res.status(500).json({
          status: false,
          error: "could not update transaction",
        });
      }
      transactionUpdate = update.value;
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }

    // create customer if customer
    if (req.body.customer) {
      const newReq = {
        body: { ...req.body.customer, fromReg: "web" },
      };
      return utility.mongoConnect(newReq, {}, function (client) {
        return addUser(client, newReq, {}, async function (err, user) {
          client.close();
          if (err) {
            next(err);
          } else {
            // TODO: Add plan id to the history
            const historyData = {
              type: "purchase",
              ip: ip.address(),
              transaction: transactionUpdate._id,
              user: user._id,
            };
            const transactionHistory = await createHistory(historyData);
            return res.status(200).json({
              status: true,
              message:
                "Payment complete. Check your email or phone to verify your account",
              data: response,
            });
          }
        });
      });
    }
    return res.status(200).json({
      status: true,
      capture,
      transaction_id: transactionUpdate.transaction_id,
    });
  });
});
