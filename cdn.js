const express = require('express');
const path = require('path');
const IMAGE_OPTIMIZER = require('./utilities/image-optimizer');

const app = express();

var device = require('express-device');
app.use(device.capture());
// Serve the static files from
// app.use(express.static(path.join(__dirname, 'cdn')));
app.use((req, res, next) => {
console.log(new Date(), 'DEVICE_TYPE', req.device.type, 'URL', req.url); 
if(!req.query.width && req.device.type=='tablet') {
  req.query.width=800;
}
next();

});
app.use(IMAGE_OPTIMIZER);


const port = process.env.PORT || 4040;
app.listen(port);

console.log('CDN is listening on port ' + port);
