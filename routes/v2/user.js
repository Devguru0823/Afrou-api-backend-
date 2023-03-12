const express = require('express');
const router = express.Router();
const utility = require('../../utilities');
const Model = require('../../models/v2/user');
const AUTH = require('../../_helpers/v2/authentication');
const responseHelper =require('../../_helpers/response')
const Mux = require('@mux/mux-node')
// console.log(process.env.MUX_TOKEN_ID)
const { Video } = new Mux("af2df26a-c9c3-4c03-ab4b-4fe5484a6be5","7OL8UGRyHO0688VfSYRVpybDuBiPV4TZjXNXbPGdeh3zYypgQuTAy9vhpahM9c/On1E0yR+/Mia")


/* GET users listing. */
router.get('/', AUTH.authenticate, function(req, res, next) {
  utility.mongoConnect(req, res, function (client) {
      Model.getUsers(client, req, res, function (err, response) {
          client.close();
          if(err){
              next(err);
          }else{
              response.access_token = req.authorization.access_token ? req.authorization.access_token: undefined;
              res.json(response);
          }
      })
  });
});


router.post('/login', AUTH.loginV2);
router.post('/2fa/:mode', AUTH.set2FAAuthMode);
router.post('/2fa/:mode/verify', AUTH.twoFactorAuth);
router.post('/refresh', AUTH.refreshToken)
router.post('/block', AUTH.blockAccount);

router.get('/logout', AUTH.authenticate, AUTH.logout);

router.post('/register', AUTH.register);
router.post('/register-app', AUTH.registerApp);
router.post('/check-username', AUTH.checkUsername);
router.post('/verify-email', AUTH.verifyEmail);
router.post('/verify-email-otp', AUTH.verifyEmailOTP);
router.post('/verify-phone', AUTH.verifyPhone);


// Password Reset
router.post('/request-password-reset', function(req, res, next) {
  utility.mongoConnect(req, res, function (client) {
      Model.resetPasswordRequest(client, req, res, function (err, response) {
          client.close();
          if(err){
              next(err);
          }else{
              res.json(response);
          }
      })
  });
});


router.post('/verify-password-reset', function(req, res, next) {
  utility.mongoConnect(req, res, function (client) {
      Model.verifyPasswordRequest(client, req, res, function (err, response) {
          client.close();
          if(err){
              next(err);
          }else{
              res.json(response);
          }
      })
  });
});

/* Report User */
router.post('/:user_id/report', AUTH.authenticate, function(req, res, next) {
  utility.mongoConnect(req, res, function (client) {
      Model.reportUserByUserId(client, req, res, function (err, response) {
          client.close();
          if(err){
              next(err);
          }else{
              res.json(response);
          }
      })
  });
});

/* In active my account */
router.put('/inactivemyaccount', AUTH.authenticate, function(req, res, next) {
  utility.mongoConnect(req, res, function (client) {
      Model.inActiveMyAccount(client, req, res, function (err, response) {
          client.close();
          if(err){
              next(err);
          }else{
              res.json(response);
          }
      })
  });
});

router.get('/stream',async (req, res, next) => {
  try {
    if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
      console.error(
        "It looks like you haven't set up your Mux token in the .env file yet."
      )
      return
    }
    const response = await Video.LiveStreams.create({
      playback_policy: 'public',
      reconnect_window: 10,
      new_asset_settings: { playback_policy: 'public' },
    })
    responseHelper.data(
      res,
      {
        stream_id: response.stream_key,
        playback_id: response.playback_ids[0].id,
      },
      200
    )
  } catch (e) {
    next(e)
  }
});

router.post('/resendOTP', function(req, res, next) {
  utility.mongoConnect(req, res, function (client) {
      Model.resendOTP(client, req, res, function (err, response) {
          client.close();
          if(err) {
              next(err);
          } else {
              res.json(response);
          }
      });
  });
});

/**
* Get user_id from user_name
*/
router.get('/userbyusername', function(req, res, next) {
  utility.mongoConnect(req, res, function (client) {
      Model.getUserByUserName(client, req, res, function (err, response) {
          client.close();
          if(err){
              next(err);
          }else{
              res.json(response);
          }
      })
  });
});

// Unsubscribe
router.post('/unsubscribe', function(req, res, next) {
  utility.mongoConnect(req, res, function (client) {
      Model.unsubscribe(client, req, res, function (err, response) {
          client.close();
          if(err){
              next(err);
          }else{
              res.json(response);
          }
      })
  });
});

module.exports = router;