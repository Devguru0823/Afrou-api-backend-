"use strict";
const utility = require("../utilities");
let USER = require("../models/user");
const Model = require("../models/user.json");

module.exports.authenticate = function (req, res, next) {
  if (req.headers.authorization) {
    let currentToken = req.headers.authorization.split(" ")[1];
    console.log(currentToken);
    if (currentToken) {
      utility.mongoConnect(req, res, function (client) {
        USER.authentication(client, req, res, function (err, response) {
          client.close();
          if (err) {
            next(err);
          } else {
            next();
          }
        });
      });
    } else {
      let error = new Error();
      error.name = "UNAUTHORISED_ERROR";
      next(error);
    }
  } else {
    let error = new Error();
    error.name = "UNAUTHORISED_ERROR";
    next(error);
  }
};

module.exports.login = function (req, res, next) {
  utility.mongoConnect(req, res, function (client) {
    USER.login(client, req, res, function (err, response) {
      if (err) {
        // client.close();

        next(err);
      } else {
      
        let voip_id = req.body.voip_id;
		let device_id = req.body.device_id;
        let query = {};
        if (voip_id) query["voip_id"] = voip_id;
		if(device_id)query['device_id']=device_id
		if(device_id||voip_id){
			let CONNECTION = client.db(utility.dbName);
			let userCollection = CONNECTION.collection(Model.collection_name);
			userCollection.findOneAndUpdate({user_id:response.user_id},{$set:{...query}},{returnOriginal:false},(err,doc)=>{
				console.log(err,doc)
			})
		}
        res.json(response);
		// console.log(query)
        // client.close();
      }
    });
  });
};

module.exports.register = function (req, res, next) {
  console.log("@@@@@@@@@@@@1212111212@@");
  utility.mongoConnect(req, res, function (client) {
    USER.addUser(client, req, res, function (err, response) {
      client.close();
      if (err) {
        next(err);
      } else {
        res.json(response);
      }
    });
  });
};

module.exports.registerApp = function (req, res, next) {
  utility.mongoConnect(req, res, function (client) {
    USER.addUserApp(client, req, res, function (err, response) {
      client.close();
      if (err) {
        next(err);
      } else {
        res.json(response);
      }
    });
  });
};

module.exports.checkUsername = function (req, res, next) {
  utility.mongoConnect(req, res, function (client) {
    USER.checkUsername(client, req, res, function (err, response) {
      client.close();
      if (err) {
        next(err);
      } else {
        res.json(response);
      }
    });
  });
};

module.exports.verifyEmail = function (req, res, next) {
  utility.mongoConnect(req, res, function (client) {
    USER.verifyEmail(client, req, res, function (err, response) {
      client.close();
      if (err) {
        next(err);
      } else {
        res.json(response);
      }
    });
  });
};

module.exports.verifyEmailOTP = function (req, res, next) {
  utility.mongoConnect(req, res, function (client) {
    USER.verifyEmailOTP(client, req, res, function (err, response) {
      client.close();
      if (err) {
        next(err);
      } else {
        res.json(response);
      }
    });
  });
};

module.exports.verifyPhone = function (req, res, next) {
  utility.mongoConnect(req, res, function (client) {
    USER.verifyPhone(client, req, res, function (err, response) {
      client.close();
      if (err) {
        next(err);
      } else {
        res.json(response);
      }
    });
  });
};

module.exports.logout = function (req, res, next) {
  utility.mongoConnect(req, res, function (client) {
    USER.logout(client, req, res, function (err, response) {
      client.close();
      if (err) {
        next(err);
      } else {
        res.json(response);
      }
    });
  });
};
