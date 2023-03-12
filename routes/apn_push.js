// register apn : https://developer.apple.com/documentation/usernotifications/registering_your_app_with_apns
// get .p8 , team id , key id : https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server/establishing_a_token-based_connection_to_apns
// get certificate : https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server/establishing_a_certificate-based_connection_to_apns
// send push using certificate:  https://alexanderpaterson.com/posts/send-ios-push-notifications-with-a-node-backend
//guide to send notification to user : https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server/sending_notification_requests_to_apns/
// third party push api : https://stackoverflow.com/questions/58152554/how-to-send-voip-push-notification-from-node-js-i-can-send-voip-push-from-curl
// *****
// another guide to send push notifications
// https://solarianprogrammer.com/2017/02/14/ios-remote-push-notifications-nodejs-backend/
// ****
// #####
// configure and send push using twillio
// https://www.twilio.com/docs/chat/push-notification-configuration
// ###
// --------
// configure push notifications using VOIP
// https://medium.com/mindful-engineering/voice-over-internet-protocol-voip-801ee15c3722
// --------
const router = require("express").Router();
let apn = require("apn");
var utility = require("../utilities");
const userschema = require("../models/user.json");
// const config = {
//   cert: __dirname+"/cert.pem",
//   key: __dirname+"/voip.pem",
//   production: false,
// };

const config = {
  cert: __dirname + "/../cert/cert.pem",
  key: __dirname + "/../cert/key.pem",
  production: false,
};

console.log("############################33", __dirname, config.key);

router.post("/sendPush", (req, res) => {
  try {
    let token = req.body.device_id;
    let apnConnection = new apn.Connection(config);
    let myDevice = new apn.Device(token);
    let note = new apn.Notification();
    note.expiry = Math.floor(Date.now() / 1000) + 3600;
    note.badge = 3;
    note.sound = "ping.aiff";
    note.alert = "\uD83D\uDCE7 \u2709 You have a new message";
    note.payload = { messageFrom: "test" };
    note.topic = "com.app.Afrocamgist.voip";
    apnConnection.pushNotification(note, myDevice);

    return res.json({ success: "true" });
  } catch (error) {
    console.log(error);
    return res.send({ success: false, error });
  }
});
router.post("/sendPush2", (req, res) => {
  try {
    console.log("121212");
    var apnProvider = new apn.Provider(config);
    let deviceToken = req.body.device_id;
    var note = new apn.Notification();

    note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
    note.badge = 3;
    note.sound = "ping.aiff";
    note.alert = "\uD83D\uDCE7 \u2709 You have a new message";
    note.payload = { messageFrom: "John Appleseed" };
    note.topic = "com.app.Afrocamgist.voip";
    apnProvider
      .send(note, deviceToken)
      .then((result) => {
        console.log(result);
        res.send(result);
        // see documentation for an explanation of result
      })
      .catch((error) => {
        console.log(error);
        res.send({ success: false });
      });
  } catch (error) {
    console.log(error);
    res.send({ sucess: false });
  }
});
// console.log(Math.floor(Date.now() / 1000) + 3600)

// // router.post("/sendPush3", (req, res) => {
//   try {
//     var https = require("https"), // Module for https
//       fs = require("fs"); // Required to read certs and keys
//     let cert = fs.readFileSync(
//       "/home/omlinux/Documents/afrou-api/cert/cert.pem"
//     ); // Public client key
//     console.log(cert.toString())
//     console.log(33333333333333333333333333333);
//     var options = {
//       key: "keshav777",
//       cert: cert.toString(),
//       // rejectUnauthorized: false,              // Used for self signed server
//       host: "https://api.push.apple.com/3/device/453dc32b2f93f29d0745044ef95be2320b8a875d54f02926989585ae6d9ddb35", // Server hostname
//       method: "post", // Server port
//     };

//     callback = function (response) {
//       var str = "";
//       response.on("data", function (chunk) {
//         str += chunk;
//         console.log(chunk);
//       });

//        response.on("end", function () {
//         console.log(str);
//       });
//     };

//     let post_req = https.request(options, callback);
//     let qs = require("qs");
//     let post_data = { aps: { caller: "Caller Name" } };

//     post_req.write(qs.stringify(post_data));
//     post_req.end();
//   } catch (error) {
//     console.log(error);
//   }
// // });

// try {
//   var querystring = require('qs');
// var http = require('http');
// var fs = require('fs');

// function PostCode(cert) {
//   // Build the post string from an object
//   // var post_data = querystring.stringify({
//   //     'compilation_level' : 'ADVANCED_OPTIMIZATIONS',
//   //     'output_format': 'json',
//   //     'output_info': 'compiled_code',
//   //       'warning_level' : 'QUIET',
//   //       'js_code' : codestring
//   // });
// let post_data  = querystring.stringify({ aps: { caller: "Caller Name" } })
//   // An object of options to indicate where to post to
//   // var post_options = {
//   //     host: 'closure-compiler.appspot.com',
//   //     port: '80',
//   //     path: '/compile',
//   //     method: 'POST',
//   //     headers: {
//   //         'Content-Type': 'application/x-www-form-urlencoded',
//   //         'Content-Length': Buffer.byteLength(post_data)
//   //     }
//   // };
//   console.log(cert)
//   var post_options = {
//           key: "keshav777",
//           cert: cert,port:443,
//     //       // rejectUnauthorized: false,              // Used for self signed server
//           host: "api.push.apple.com", // Server hostname
//           path:"/3/device/453dc32b2f93f29d0745044ef95be2320b8a875d54f02926989585ae6d9ddb35",
//           method: "POST", // Server port
//         };
//   // Set up the request
//   var post_req = http.request(post_options, function(res) {
//       res.setEncoding('utf8');
//       res.on('data', function (chunk) {
//           console.log('Response: ' + chunk);
//       });
//       res.on("error",function(err){console.log(error)})
//   });

//   // post the data
//   post_req.write(post_data);
//   post_req.end();

// }

// // This is an async file read
// fs.readFile("/home/omlinux/Documents/afrou-api/cert/voip.pem", 'utf-8', function (err, data) {
//   if (err) {
//     // If this were just a small part of the application, you would
//     // want to handle this differently, maybe throwing an exception
//     // for the caller to handle. Since the file is absolutely essential
//     // to the program's functionality, we're going to exit with a fatal
//     // error instead.
//     console.log("FATAL An error occurred trying to read in the file: " + err);
//     process.exit(-2);
//   }
//   // Make sure there's data before we post it
//   if(data) {
//     PostCode(data);
//   }
//   else {
//     console.log("No data to post");
//     process.exit(-1);
//   }
// });
// } catch (error) {

// }
// const fs = require("fs");
// fs.readFile("/home/omlinux/Documents/afrou-api/cert/cert.pem", 'utf-8', function (err, cert) {
//   console.log(cert)
// const https = require("https")
// const axios  =require("axios")
// const agent = new https.Agent({
//   key: fs.readFileSync("/home/omlinux/Documents/afrou-api/cert/key.pem", 'utf-8',),//"keshav777",
//   cert: cert,
//   // rejectUnauthorized: false,
//   keepAlive: true,
// });
// // querystring.stringify({ aps: { caller: "Caller Name" } })
// const data = JSON.stringify({
//   aps: { caller: "Caller Name" },
// });

// const axiosConfig = {
//   httpsAgent: agent,
//   headers: {
//     "Content-Type": "application/json",
//     "Content-Length": data.length,
//   },
// };

// axios
//   .post("https://api.push.apple.com/3/device/453dc32b2f93f29d0745044ef95be2320b8a875d54f02926989585ae6d9ddb35", data, axiosConfig)
//   .then((r) => {
//     console.log("r", r);
//   }).catch((e)=>{console.log(e)})
// })
// try {
//   const http2 = require("http2");
//   var port = 443;
//   const client = http2.connect(
//     "https://api.push.apple.com/3/device/453dc32b2f93f29d0745044ef95be2320b8a875d54f02926989585ae6d9ddb35"
//   );

//   // Must not specify the ':path' and ':scheme' headers
//   // for CONNECT requests or an error will be thrown.
//   var body = "Hello, I am babatman";
//   const req = client.request({
//     ":method": "POST",
//     body: body,
//     key: "keshav777",
//     cert: fs.readFile(
//       "/home/omlinux/Documents/afrou-api/cert/cert.pem",
//       "utf-8"
//     ),
//   });
//   req.on("response", (headers) => {
//     console.log(headers[http2.constants.HTTP2_HEADER_STATUS]);
//   });
//   let data = "";
//   req.setEncoding("utf8");
//   req.on("data", (chunk) => (data += chunk));
//   req.on("end", () => {
//     console.log(`The server says: ${data}`);
//     client.close();
//   });
// } catch (error) {
//   console.log(error);
// }
// const http2 = require("http2");

// const fs = require("fs");
// fs.readFile(
//   "/home/omlinux/Documents/afrou-api/cert/cert.pem",
//   "utf-8",
//   function (err, cert) {
//     if (err) {
//       console.log(err);
//     }

//     var request = {
//       ":method": "POST",
//       ":scheme": "https",
//       host: "api.push.apple.com", // Server hostname
//       path: "/3/device/453dc32b2f93f29d0745044ef95be2320b8a875d54f02926989585ae6d9ddb35",
//       key: "keshav777",
//       cert: cert,
//     };
//     const client = require('alexaClient');
//     var req = client.request(request);

//     req.on("response", (headers, flags) => {
//      console.log('wwwwwwwwwwwwwwwww')
//     });

//     req.on("error", function (err) {
//      console.log(err)
//     });

//     req.setEncoding("utf8");
//     let outdata = "";
//     req.on("data", (chunk) => {
//       outdata += chunk;
//     });
//     req.on("end", () => {
//     console.log(outdata)
//     });
// let payload =  qs.stringify({ aps: { caller: "Caller Name" } })
//     req.write(payload);

//     req.end();
//   }
// );

router.post("/sendaPush", (req, res) => {
  utility.mongoConnect(req, res, async function (CLIENT) {
    let CONNECTION = CLIENT.db(utility.dbName);
console.log(req.body)
    let userModel = CONNECTION.collection(userschema.collection_name);
    userModel.findOne({ user_id: req.body.user_id }, (err, doc) => {
      console.log(err, doc);
      if (doc.voip_id) {
        sendVoip(req,res,doc.voip_id);
      } else {
        sendPush(doc.firebase_token);
      }
    });
  });
});

function sendVoip(request,res,voipId) {
  try {
    // file: ./index.js

    const http2 = require("http2");
    const fs = require("fs");
    // The `http2.connect` method creates a new session with example.com
    const session = http2.connect("https://api.push.apple.com", {
      cert: fs.readFileSync(
        "/home/omlinux/Documents/afrou-api/cert/voip.pem",
        "utf-8"
      ),
      key: fs.readFileSync(
        "/home/omlinux/Documents/afrou-api/cert/key.pem",
        "utf-8"
      ),
      passphrase: "keshav777",
      port: 443,
    });

    // If there is any error in connecting, log it to the console
    session.on("error", (err) => console.error(err));
    // file: ./index.js

    // Here, req is a new request stream
    // const req = session.request({ ':path': '/' })
    console.log(request.body);
    const req = session.request({
      ":path": `/3/device/${voipId}`,
      ":method": "POST",
      "apns-push-type": "voip",
      "apns-expiration": "0",
      "apns-topic": "com.app.Afrocamgist.voip",
    });
    const qs = require("qs");
    const sampleData = qs.stringify({ aps: { caller: "Caller Name" } });
    // we can convert this into a string and call
    // the req.write method
    // the second argument specifies the encoding, which is utf8 for now
    req.write(sampleData, "utf8");
    // since we don't have any more data to send as
    // part of the request, we can end it
    req.end();

    // This callback is fired once we receive a response
    // from the server
    req.on("response", (headers) => {
      // we can log each response header here
      for (const name in headers) {
        console.log(`${name}: ${headers[name]}`);
      }
    });

    // To fetch the response body, we set the encoding
    // we want and initialize an empty data string
    req.setEncoding("utf8");
    let data = "";

    // append response data to the data string every time
    // we receive new data chunks in the response
    req.on("data", (chunk) => {
      data += chunk;
    });

    // Once the response is finished, log the entire data
    // that we received
    req.on("end", () => {
      console.log("daata recieved");
      console.log(`\n${data}`);
      res.send({ msg:data });
      // In this case, we don't want to make any more
      // requests, so we can close the session
      session.close();
    });
  } catch (error) {
    console.log(error);
    res.send(error);
  }
}
function sendPush(deviceId) {
  const { sendPush } = require('../_helpers/push-notification');
  console.log({deviceId})
  let pushData = {
    status: "test",
    title: `test `,
    body: `hello .`,
    sound: "default",
    mutable_content: true,
    content_available: true,
    data: {
        status: "We Care ❤️",
        message: `, Afrocamgist misses you, trust you're okay. Why not check out the latest post.`,
        notification_type: "Promo"
    }
};
sendPush(
  deviceId,
    "Promo",
    pushData,
    true,
);


}

router.post("/send", (request, res) => {
  try {
    // file: ./index.js

    const http2 = require("http2");
    const fs = require("fs");
    // The `http2.connect` method creates a new session with example.com
    // const session = http2.connect("https://api.push.apple.com", {
    const session = http2.connect("https://api.development.push.apple.com", {
      cert: fs.readFileSync(
        "/home/omlinux/Documents/afrou-api/cert/voip.pem",
        "utf-8"
      ),
      key: fs.readFileSync(
        "/home/omlinux/Documents/afrou-api/cert/key.pem",
        "utf-8"
      ),
      passphrase: "keshav777",
      port: 443,
    });

    // If there is any error in connecting, log it to the console
    session.on("error", (err) => console.error(err));
    // file: ./index.js

    // Here, req is a new request stream
    // const req = session.request({ ':path': '/' })
    console.log(request.body);
    const req = session.request({
      ":path": `/3/device/${request.body.device_id}`,
      ":method": "POST",
      "apns-push-type": "voip",
      "apns-expiration": "0",
      "apns-topic": "com.app.Afrocamgist.voip",
    });
    const qs = require("qs");
    const sampleData = qs.stringify({ aps: { caller: "Caller Name" } });
    // we can convert this into a string and call
    // the req.write method
    // the second argument specifies the encoding, which is utf8 for now
    req.write(sampleData, "utf8");
    // since we don't have any more data to send as
    // part of the request, we can end it
    req.end();

    // This callback is fired once we receive a response
    // from the server
    req.on("response", (headers) => {
      // we can log each response header here
      for (const name in headers) {
        console.log(`${name}: ${headers[name]}`);
      }
    });

    // To fetch the response body, we set the encoding
    // we want and initialize an empty data string
    req.setEncoding("utf8");
    let data = "";

    // append response data to the data string every time
    // we receive new data chunks in the response
    req.on("data", (chunk) => {
      data += chunk;
    });

    // Once the response is finished, log the entire data
    // that we received
    req.on("end", () => {
      console.log("daata recieved");
      console.log(`\n${data}`);
      res.send({ msg: "sent" });
      // In this case, we don't want to make any more
      // requests, so we can close the session
      session.close();
    });
  } catch (error) {
    console.log(error);
    res.send(error);
  }
});

module.exports = router;
