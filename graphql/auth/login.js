"use strict";
const utility = require("../../utilities");

const Model = require("../../models/user.json");
const bcrypt = require("bcryptjs");
const SITE_CONFIG = require("../../configs/siteConfig.json");
const cryptoRandomString = require("crypto-random-string");
const ip = require("ip");
const getUserProfile = require("./getUserProfile");
module.exports.loginModel = function (args, context, req, res, next) {
  return new Promise((resolve, reject) => {
    utility.mongoConnect(req, res, function (client) {
      login(args, context, client, req, res)
        .then((response) => {
          let voip_id = args.voip_id;
          let device_id = args.device_id;
          let query = {};
          if (voip_id) query["voip_id"] = voip_id;
          if (device_id) query["device_id"] = device_id;
          if (device_id || voip_id) {
            let CONNECTION = client.db(utility.dbName);
            let userCollection = CONNECTION.collection(Model.collection_name);
            userCollection.findOneAndUpdate(
              { user_id: response.user_id },
              { $set: { ...query } },
              { returnOriginal: false },
              (err, doc) => {
                console.log(err, doc);
              }
            );
          }
          resolve(response);
        })
        .catch((err) => {
          console.log(err);
          reject(err);
        });
    });
  });
};

const login = function (args, context, CLIENT, req, res) {
  return new Promise((resolve, reject) => {
    let CONNECTION = CLIENT.db(utility.dbName);
    let userCollection = CONNECTION.collection(Model.collection_name);
    let accessTokenCollection = CONNECTION.collection(
      SITE_CONFIG.accessTokenCollection
    );
    let { username, password, firebase_token, email, facebook_id, google_id } =
      {
        ...args,
      };
    let validationError = {};
    if (args.type !== "facebook" && args.type !== "google") {
      if (!username) {
        validationError["username"] = "is required";
      }
      username = username.toLowerCase();
      if (!password) {
        validationError["password"] = "is required";
      }
    } else {
      username = "";
    }

    if (args.type === "google" && !email) {
      validationError["email"] = "is required";
    }

    if (Object.keys(validationError).length > 0) {
      let vErr = new Error();
      vErr.name = "VALIDATION_ERROR";
      vErr.message = validationError;
      reject(vErr);
    } else {
      let query;
      if (args.type === "facebook") {
        query = {
          $or: [{ facebook_id: facebook_id }],
          status: "active",
        };
      } else if (args.type === "google") {
        query = {
          $or: [{ google_id: google_id, email }],
          status: "active",
        };
      } else {
        query = {
          $or: [{ email: username }, { contact_number: username }],
        };
      }

      userCollection.findOne(query, function (err, userData) {
        if (err) {
          reject(err);
        } else {
          if (userData) {
            if (args.type === "facebook" || args.type === "google") {
              let accessTokenData = {
                token: cryptoRandomString(64),
                user_id: userData.user_id,
                login_time: new Date(),
                login_ip: ip.address(),
              };
              accessTokenCollection.insertOne(
                accessTokenData,
                function (err, response) {
                  if (err) {
                    let error = new Error("Some error occurred while login");
                    reject(error);
                  } else {
                    const updateData = { last_login_ip: ip.address() };
                    if (firebase_token) {
                      updateData.firebase_token = firebase_token;
                    }
                    if (args.login_device_detail) {
                      updateData.login_device_detail = args.login_device_detail;
                    }
                    userCollection.findOneAndUpdate(
                      { user_id: userData.user_id },
                      { $set: updateData },
                      function (err, resp) {
                        args.authorization = accessTokenData;
                        getUserProfile
                          .getUserProfile(
                            args,
                            context,
                            CLIENT,
                            req,
                            res,
                            userData.user_id
                          )
                          .then((profileData) => {
                            console.log("here");
                            delete accessTokenData._id;
                            delete userData.password;
                            accessTokenData.user = profileData.data;
                            resolve(accessTokenData);
                          })
                          .catch((err) => {
                            reject(err);
                          });
                      }
                    );
                  }
                }
              );
            } else {
              let passwordFromDb = userData.password;
              if (bcrypt.compareSync(password, passwordFromDb)) {
                let accessTokenData = {
                  token: cryptoRandomString(64),
                  user_id: userData.user_id,
                  login_time: new Date(),
                  login_ip: ip.address(),
                  login_type: "local",
                };
                accessTokenCollection.insertOne(
                  accessTokenData,
                  function (err, response) {
                    if (err) {
                      let error = new Error("Some error occurred while login");
                      reject(error);
                    } else {
                      const updateData = { last_login_ip: ip.address() };
                      if (firebase_token) {
                        updateData.firebase_token = firebase_token;
                      }
                      if (args.login_device_detail) {
                        updateData.login_device_detail =
                          args.login_device_detail;
                      }
                      userCollection.findOneAndUpdate(
                        { user_id: userData.user_id },
                        { $set: updateData },
                        function (err, resp) {
                          args.authorization = accessTokenData;
                          getUserProfile.getUserProfile(
                            args,
                            context,
                            CLIENT,
                            req,
                            res,
                            userData.user_id,
                           
                          ).then((profileData)=>{
                            // function (err, profileData) {
                              delete accessTokenData._id;
                              delete userData.password;
                              accessTokenData.user = profileData.data;
                              resolve(accessTokenData);
                            
                          }).catch((e)=>{
                            reject(e)
                          })
                        }
                      );
                    }
                  }
                );
              } else {
                let vErr = new Error();
                vErr.name = "VALIDATION_ERROR";
                vErr.message = { password: "Invalid Password" };
                reject(vErr);
              }
            }
          } else {
            if (args.type === "facebook" || args.type === "google") {
              let newUserData = {};
              newUserData.email = args.email;

              if (args.type === "facebook") {
                newUserData.facebook_id = facebook_id;
              } else {
                newUserData.google_id = google_id;
              }
              newUserData.first_name = args.first_name;
              newUserData.last_name = args.last_name;
              utility.validatePostData(
                CONNECTION,
                newUserData,
                Model,
                "insert",
                0,
                function (err, validatedData) {
                  if (err) {
                    reject(err);
                  } else {
                    validatedData.email = args.email;

                    if (args.type === "facebook") {
                      validatedData.facebook_id = facebook_id;
                    } else {
                      validatedData.google_id = google_id;
                    }
                    if (args.login_device_detail) {
                      validatedData.login_device_detail =
                        args.login_device_detail;
                    }
                    validatedData.first_name = args.first_name;
                    validatedData.last_name = args.last_name;
                    validatedData.email_verified = false;
                    validatedData.verification_token = cryptoRandomString(64);
                    validatedData.phone_verified = false;
                    validatedData.introduced = false;
                    validatedData.registered_with = args.type;
                    validatedData.status = "active";
                    if (firebase_token) {
                      validatedData.firebase_token = firebase_token;
                    }
                    userCollection.insertOne(
                      validatedData,
                      function (err, userData) {
                        if (err) {
                          let error = new Error(
                            "Some error occurred while login"
                          );
                          reject(error);
                        } else {
                          let accessTokenData = {
                            token: cryptoRandomString(64),
                            user_id: validatedData?.user_id,
                            login_time: new Date(),
                            login_ip: ip.address(),
                          };
                          accessTokenCollection.insertOne(
                            accessTokenData,
                            function (err, response) {
                              if (err) {
                                let error = new Error(
                                  "Some error occurred while login"
                                );
                                reject(error);
                              } else {
                                delete accessTokenData._id;
                                accessTokenData.status = true;
                                accessTokenData.user = validatedData;
                                resolve(accessTokenData);
                              }
                            }
                          );
                        }
                      }
                    );
                  }
                }
              );
            } else {
              let vErr = new Error();
              vErr.name = "VALIDATION_ERROR";
              vErr.message = { username: "Invalid Username" };
              reject(vErr);
            }
          }
        }
      });
    }
  });
};
