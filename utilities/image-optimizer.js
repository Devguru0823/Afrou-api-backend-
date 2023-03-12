'use strict';
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

module.exports = function (req, res, next) {
    const imagePath = '../../cdn' + req.url.split("?")[0];
    let height = Number(req.query.height) || null;
    let width = Number(req.query.width) || null;
    // console.log(height, width);
    let fullPath = path.join(path.resolve('./' + imagePath));
    const format = 'jpg'; // fullPath.split('.').pop();
    if (fs.existsSync(fullPath)) {
        // console.log('FIle Exists');
        res.setHeader('Cache-Control','public, max-age=3600');
        resizable(fullPath, function (err, metaData) {
            // console.log(err, metaData);
            if (err || (!height && !width)) {
                // console.log('Original File Requested');
                res.sendFile(fullPath);
            } else {
                // Resize the Image and save into cache
                if (metaData.width < width || (height && metaData.height < height)) {
                    width = metaData.width;
                    height = metaData.height;
                }
                // console.log('HEIGHT, WIDTH=> ', height, width);
                let fileStamp = width ? width.toString() : '-';
                if (height) {
                    fileStamp += height.toString();
                } else {
                    fileStamp += '-'
                }
                fileStamp += imagePath;
                // console.log('FILESTAMP', fileStamp);
                const fileCheckSum = crypto.createHash('md5').update(fileStamp).digest('hex') + '.' + format;
                // console.log('File CheckSum: ', fileCheckSum);
                // Now Check if the cropped File Exists in the the cache
                let cachedFile = path.join(path.resolve('./cache/' + fileCheckSum));
                // console.log('CACHED FILE: ', cachedFile);
                if (fs.existsSync(cachedFile)) {
                    // console.log('Serving from Cache => ', fileCheckSum);
                    const src = fs.createReadStream(cachedFile);
                    src.pipe(res);
                } else {
                    // Create the File and store into the cache
                    // console.log('Generating Cache for => ', fileCheckSum);
                    res.type(`image/${format || 'png'}`);

                    const writerStream = fs.createWriteStream(cachedFile);
                    resize(fullPath, format, width, height).pipe(writerStream);
                    resize(fullPath, format, width, height).pipe(res);
                }
            }
        });
    } else {
        res.end('Invalid File');
    }
};


const resizable = function (path, cb) {
    const image = sharp(path);
    image
        .metadata(function (err, metadata) {
            cb(err, metadata);
        })
};


const resize = function (path, format, width, height) {
    const readStream = fs.createReadStream(path);
    let transform = sharp();
    if (format) {
        transform = transform.toFormat(format);
    }
    if (width || height) {
        transform = transform.resize(width, height);
    }
    return readStream.pipe(transform);
};

