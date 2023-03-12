'use strict';
const multer = require('multer');
const fs = require('fs');
const SITE_CONFIG = require('../configs/siteConfig');
const path = require('path');
const utility = require('../utilities');
// const compress_utils = require('../utilities/compress-utils.jsc');
const compress_utils2 = require('../utilities/compress-utils2.js');
const USER_MODEL = require('../models/user.json');
const GROUP_MODEL = require('../models/group.json');
const USER_PHOTO = require('../models/user_photos.js');
const im = require('imagemagick');
const imConvert = require('easyimage');
const ThumbnailGenerator = require('video-thumbnail-generator').default;
const os = require('os-utils');

const POST_MODEL = require('./post.json');

/* Google Cloud code */
const serviceKey = './centered-seat-281509-7847cb60137f.json';
const { Storage } = require('@google-cloud/storage');
const storage = new Storage({
	keyFilename: serviceKey,
	projectId: 'centered-seat-281509',
});
const BucketName = 'cdn.afrocamgist.com';
const bucket = storage.bucket(BucketName);
var gcPath = SITE_CONFIG.gcBasePath + 'posts/';
/* ***** */

const dirBasePath = SITE_CONFIG.mediaBasePath + 'posts/';
const toDay = new Date()
	.toISOString()
	.replace(/T/, ' ')
	.replace(/\..+/, '')
	.substr(0, 10);
const toDayFormatted = toDay.replace(/-/g, '');
const dirYear = toDayFormatted.substr(0, 4);
const dirMonth = toDayFormatted.substr(4, 2);

let dirPath = dirBasePath + dirYear;
gcPath += dirYear;
if (!fs.existsSync(dirPath)) {
	fs.mkdirSync(dirPath);
}
dirPath += '/' + dirMonth;
gcPath += '/' + dirMonth;
if (!fs.existsSync(dirPath)) {
	fs.mkdirSync(dirPath);
}
let thumbDir = dirPath + '/thumbs';
if (!fs.existsSync(thumbDir)) {
	fs.mkdirSync(thumbDir);
}
let dirPathx = path.join(dirPath, '/coco');
if (!fs.existsSync(dirPathx)) {
	fs.mkdirSync(dirPathx);
}
const postMediaStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, dirPath);
	},
	filename: (req, file, cb) => {
		let extension = path.extname(file.originalname) || '.jpg';
		cb(null, file.fieldname + '-' + Date.now() + extension);
	},
});

async function compress_local_image(file, inCallback) {
	console.log('compress_local_image file = ', file);

	let pathOrig = file.destination + '/' + file.filename;
	let pathDest = dirPathx;

	/*
    compress_media_image(inputFilePath, destinationFolderPath, callback)
      - This function compresses a given image and keeps its original file Format.
      @inputFilePath : 
        - Is string indicating the absolute path of the original/input file in current system (example: C://path_to_input_Folder/toto.png)
      @destinationFolderPath : 
        - It can be whether equal to :
        a) (boolean) false <ONLY> :  
          - This means that we want to override the original/input file by removing it, once compressing is finished, and giving its name 
            to the compressed file ==> (inputFilePath == outputFilePath)
        b) (string) :  
          - In this case, it should be a string value with a valid destination/output folder path, unless the value will be considered as
            equals to false (boolean)
  
      @callback : 
        - Is a callback function returning (@error, @data) described below.
    */

	compress_utils2.compress_media_image(
		pathOrig,
		false,
		async function (error, data) {
			/*
          @error : 
          - Default : null if there is no error
          - Else    : Could be a string or json object indicating that an error eccured when compressing
          @data  :
          - If there is no error, it should be a string indicating the absolute path of the destination/output file in current system (example: C://path_to_output_Folder/toto.png)
          - Else: if an error occurs (@error != null) then @data equals a null value (@data == null)
        */

			/* Google Cloud code *
        const options = {
            destination: gcPath + "/" +file.filename,
            resumable: true,
            validation: 'crc32c',
            metadata: {
                metadata: {
                    event: ''
                }
            }
        };

        console.log('<===in bucket ===>');
       await bucket.upload(data, options, function(err, file) {
            console.log("=== GC Err ===");
            console.log(err);
            console.log(file);
            console.log("=== GC Err ===");
            console.log('https://storage.googleapis.com/' + BucketName + "/" + file.name);
            
        });
        /* ***** */

			console.log('-----------------------------------------');
			console.log('image error = ', error);
			console.log('image data  = ', data);
			console.log('-----------------------------------------');

			inCallback(file);
		}
	);
}

function compress_local_video_new(file, inCallback) {
	console.log('compress_local_video file = ', file);

	let pathOrig = dirPath + '/' + file.filename;
	let pathDest = './' + dirPathx;

	/*
    compress_media_video(inputFilePath, destinationFolderPath, callback)
      - This function compresses a given video and converts it to MP4 Format.
      @inputFilePath : 
        - Is string indicating the absolute path of the original/input file in current system (example: C://path_to_input_Folder/toto.mp4)
      @destinationFolderPath : 
        - It can be whether equal to :
        a) (boolean) false <ONLY> :  
          - This means that we want to override the original/input file by removing it, once compressing is finished, and giving its name 
            to the compressed file ==> (inputFilePath == outputFilePath)
        b) (string) :  
          - In this case, it should be a string value with a valid destination/output folder path, unless the value will be considered as
            equals to false (boolean)
  
      @callback : 
        - Is a callback function returning (@error, @data) described below.
    */
	compress_utils2.compress_media_video(pathOrig, false, function (error, data) {
		console.log('=== utils2 ===');
		console.log(error);
		console.log(data);
		console.log('=== utils2 ===');
		inCallback(pathOrig);
	});
}

function compress_local_video(file, inCallback) {
	console.log('compress_local_video file = ', file);

	let pathOrig = dirPath + '/' + file.filename;
	let pathDest = './' + dirPathx;

	/*
    compress_media_video(inputFilePath, destinationFolderPath, callback)
      - This function compresses a given video and converts it to MP4 Format.
      @inputFilePath : 
        - Is string indicating the absolute path of the original/input file in current system (example: C://path_to_input_Folder/toto.mp4)
      @destinationFolderPath : 
        - It can be whether equal to :
        a) (boolean) false <ONLY> :  
          - This means that we want to override the original/input file by removing it, once compressing is finished, and giving its name 
            to the compressed file ==> (inputFilePath == outputFilePath)
        b) (string) :  
          - In this case, it should be a string value with a valid destination/output folder path, unless the value will be considered as
            equals to false (boolean)
  
      @callback : 
        - Is a callback function returning (@error, @data) described below.
    */

	// compress_utils.compress_media_video(pathOrig, false, function (error, data) {
	compress_utils2.compress_media_video(pathOrig, false, function (error, data) {
		/*
          @error : 
          - Default : null if there is no error
          - Else    : Could be a string or json object indicating that an error eccured when compressing
          @data  :
          - Default : {input: object, output: object, newFile: string}
            --> @input   : is an object giving statistics (file information, size, etc..) of the original/input file (pathOrig) 
            --> @output  : is an object giving statistics (file information, size, etc..) of the destination/output file (pathOrig) 
            --> @newFile : is string indicating the absolute path of the destination/output file in current system (example: C://path_to_output_Folder/toto.cmp.mp4)
          - Else: if an error occurs (@error != null) then @data equals a null value (@data == null)
        */
		os.cpuUsage(function (v) {
			console.log('After compressor strat CPU Usage (%): ' + v);
		});

		/* Google Cloud code *
        const options = {
            destination: gcPath + "/" +file.filename,
            resumable: true,
            validation: 'crc32c',
            metadata: {
                metadata: {
                    event: ''
                }
            }
        };

        // bucket.upload(data.newFile, options, function(err, file) {
        bucket.upload(data, options, function(err, file) {
            console.log('https://storage.googleapis.com/' + BucketName + "/" + file.name);
            
        });
        /* ***** */

		console.log('-----------------------------------------');
		console.log('video error = ', error);
		console.log('video data  = ', data);
		console.log('-----------------------------------------');

		inCallback(file);
	});
}
module.exports.addPostMedia = multer({ storage: postMediaStorage }).array(
	'files',
	5
);

module.exports.afterPostMediaUpload = async function (req, res, next) {
	let filesArr = [];
	req.files.forEach((file) => {
		compress_local_image(file, (file1) => {
			imageOrientationFixSync(file.path);
			let finalResponse = {
				mimetype: file.mimetype,
				filename: file.filename,
				path: file.path.replace(SITE_CONFIG.mediaBasePath, 'uploads/'),
			};
			filesArr.push(finalResponse);
			console.log(filesArr.length + ' === ' + req.files.length);
			if (filesArr.length == req.files.length) {
				console.log('In');
				res.json({ status: true, data: filesArr });
			}
		});
	});
};

// POST VIDEO

module.exports.addPostVideo = multer({
	storage: postMediaStorage,
	onError: function (err, next) {
		console.log('error', err);

		next(err);
	},
}).single('file');

module.exports.addPostVideoNew = multer({
	storage: postMediaStorage,
	onError: function (err, next) {
		console.log('error', err);

		next(err);
	},
}).single('file');

module.exports.afterPostVideoUploadNew = function (req, res, next) {
	os.cpuUsage(function (v) {
		console.log('Before compressor strat CPU Usage (%): ' + v);
	});
	compress_local_video_new(req.file, (file1) => {
		const originalFile = req.file.path;
		convertVideo(req.file.path, function (filePath) {
			req.file.path = filePath;
			const getDimensions = require('get-video-dimensions');
			getDimensions(filePath).then(function (dimensions) {
				let size = dimensions.width + 'x' + dimensions.height; // parseInt(Number(dimensions.width) * (450 / Number(dimensions.height))) + 'x450';
				let thumbPath = req.file.destination + '/thumbs';
				const tg = new ThumbnailGenerator({
					sourcePath: req.file.path,
					thumbnailPath: thumbPath,
				});
				tg.generate({
					size: size,
				}).then((result) => {
					thumbPath = thumbPath.replace(SITE_CONFIG.mediaBasePath, 'uploads/');
					let thumbs = [];
					result.forEach((result) => {
						thumbs.push(thumbPath + '/' + result);
					});
					req.file.path = req.file.path.replace(
						SITE_CONFIG.mediaBasePath,
						'uploads/'
					);
					req.file.destination = req.file.destination.replace(
						SITE_CONFIG.mediaBasePath,
						'uploads/'
					);
					let uploadObj = {
						mimetype: req.file.mimetype,
						filename: req.file.filename,
						path: req.file.path,
						thumbnails: thumbs,
						converted: originalFile !== filePath,
					};
					res.json({ status: true, data: [uploadObj] });
				});
			});
		});
		os.cpuUsage(function (v) {
			console.log('After complete of upload CPU Usage (%): ' + v);
		});
	});
};

module.exports.afterPostVideoUpload = function (req, res, next) {
	os.cpuUsage(function (v) {
		console.log('Before compressor strat CPU Usage (%): ' + v);
	});
	// compress_local_video(req.file, (file1) => { });
	compress_local_video(req.file, (file1) => {
		const originalFile = req.file.path;
		convertVideo(req.file.path, function (filePath) {
			req.file.path = filePath;
			const getDimensions = require('get-video-dimensions');
			getDimensions(filePath).then(function (dimensions) {
				/* make thumb 0.01 */
				var newWidth = 300;
				var newHeight = Math.ceil(
					(newWidth * dimensions.height) / dimensions.width
				);
				let size = newWidth + 'x' + newHeight; // parseInt(Number(dimensions.width) * (450 / Number(dimensions.height))) + 'x450';
				let thumbPath = req.file.destination + '/thumbs';
				const tg = new ThumbnailGenerator({
					sourcePath: req.file.path,
					thumbnailPath: thumbPath,
				});
				tg.generate({
					size: size,
				}).then((result) => {
					thumbPath = thumbPath.replace(SITE_CONFIG.mediaBasePath, 'uploads/');
					let thumbs = [];
					result.forEach((result) => {
						thumbs.push(thumbPath + '/' + result);
					});
					req.file.path = req.file.path.replace(
						SITE_CONFIG.mediaBasePath,
						'uploads/'
					);
					req.file.destination = req.file.destination.replace(
						SITE_CONFIG.mediaBasePath,
						'uploads/'
					);
					let uploadObj = {
						mimetype: req.file.mimetype,
						filename: req.file.filename,
						path: req.file.path,
						thumbnails: thumbs,
						converted: originalFile !== filePath,
					};
					res.json({ status: true, data: [uploadObj] });
				});
			});
		});
		os.cpuUsage(function (v) {
			console.log('After complete of upload CPU Usage (%): ' + v);
		});
	});
};

/**********************************PROFILE PICTURE******************************************/

const profilePictureMediaStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		const dirBasePath = SITE_CONFIG.mediaBasePath;
		let dirPath = dirBasePath + 'images';
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath);
		}
		dirPath += '/' + 'profile';
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath);
		}
		cb(null, dirPath);
	},
	filename: (req, file, cb) => {
		// console.log(path.extname(file.originalname));
		let extension = path.extname(file.originalname) || '.jpg';
		cb(null, file.fieldname + '-profile-' + Date.now() + extension);
	},
});

module.exports.addProfileMedia = multer({
	storage: profilePictureMediaStorage,
}).single('file');

module.exports.afterProfileMediaUpload = function (CLIENT, req, res, callback) {
	compress_local_image(req.file, function (file1) {
		if (file1) {
			imageOrientationFixSync(file1.path);
			req.file.path = req.file.path.replace(
				SITE_CONFIG.mediaBasePath,
				'uploads/'
			);
			req.file.destination = req.file.destination.replace(
				SITE_CONFIG.mediaBasePath,
				'uploads/'
			);
			let uploadObj = {
				mimetype: req.file.mimetype,
				filename: req.file.filename,
				path: req.file.path,
			};

			let CONNECTION = CLIENT.db(utility.dbName);
			let userCollection = CONNECTION.collection(USER_MODEL.collection_name);
			userCollection.findOneAndUpdate(
				{ user_id: req.authorization.user_id },
				{ $set: { profile_image_url: uploadObj.path } },
				function (err, updated) {
					let finalResponse = {};
					finalResponse.status = true;
					finalResponse.data = { profile_image_url: uploadObj.path };
					callback(err, finalResponse);
				}
			);
		}
	});
};

/***********************************USER PHOTOS********************************************/

const userPhotoMediaStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		const dirBasePath = SITE_CONFIG.mediaBasePath;
		let dirPath = dirBasePath + 'images';
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath);
		}
		dirPath += '/' + 'gallery';
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath);
		}
		cb(null, dirPath);
	},
	filename: (req, file, cb) => {
		// console.log(path.extname(file.originalname));
		let extension = path.extname(file.originalname) || '.jpg';
		cb(null, file.fieldname + '-profile-' + Date.now() + extension);
	},
});

module.exports.addUserPhoto = multer({ storage: userPhotoMediaStorage }).single(
	'file'
);

module.exports.afterUserPhotoUpload = function (CLIENT, req, res, callback) {
	let CONNECTION = CLIENT.db(utility.dbName);
	let postCollection = CONNECTION.collection(POST_MODEL.collection_name);
	compress_local_image(req.file, function (file1) {
		if (file1) {
			imageOrientationFixAsync(req.file.path, () => {
				req.file.path = req.file.path.replace(
					SITE_CONFIG.mediaBasePath,
					'uploads/'
				);
				req.file.destination = req.file.destination.replace(
					SITE_CONFIG.mediaBasePath,
					'uploads/'
				);
				req.body = {
					user_id: req.authorization.user_id,
					image_url: req.file.path,
				};

				USER_PHOTO.addUserPhoto(CLIENT, req, res, function (err, response) {
					if (err) {
						callback(err);
					} else {
						/* Create post once photo added */
						let newPostData = {
							posted_by: req.authorization.user_id,
							post_image: [req.file.path],
							post_type: 'image',
							post_lat_long: '',
						};
						utility.validatePostData(
							CONNECTION,
							newPostData,
							POST_MODEL,
							'insert',
							0,
							async function (err, validatedData) {
								if (err) {
									cb(err);
								} else {
									postCollection.insertOne(
										validatedData,
										async function (err, response) {
											if (err) {
												cb(err);
											} else {
												USER_PHOTO.getUserPhotos(
													CLIENT,
													req,
													res,
													function (err, resp) {
														callback(err, resp);
													}
												);
											}
										}
									);
								}
							}
						);
					}
				});
			});
		}
	});
};

module.exports.afterProfileCoverMediaUpload = function (
	CLIENT,
	req,
	res,
	callback
) {
	compress_local_image(req.file, function (file1) {
		if (file1) {
			const originalPath = req.file.path;
			console.log(req.file);
			imageOrientationFix(originalPath, () => {
				req.file.path = req.file.path.replace(
					SITE_CONFIG.mediaBasePath,
					'uploads/'
				);
				req.file.destination = req.file.destination.replace(
					SITE_CONFIG.mediaBasePath,
					'uploads/'
				);
				let uploadObj = {
					mimetype: req.file.mimetype,
					filename: req.file.filename,
					path: req.file.path,
				};

				let CONNECTION = CLIENT.db(utility.dbName);
				const user_id = req.authorization.user_id;
				let userCollection = CONNECTION.collection(USER_MODEL.collection_name);
				userCollection.findOneAndUpdate(
					{ user_id: user_id },
					{ $set: { profile_cover_image: uploadObj.path } },
					function (err, updated) {
						let finalResponse = {};
						finalResponse.status = true;
						finalResponse.data = { profile_cover_image: uploadObj.path };
						callback(err, finalResponse);
					}
				);
			});
		}
	});
};

/************* MARKET IMAGE*******************/

const marketMediaStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		const dirBasePath = SITE_CONFIG.mediaBasePath;
		let dirPath = dirBasePath + 'images';
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath);
		}
		dirPath += '/' + 'market';
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath);
		}
		cb(null, dirPath);
	},
	filename: (req, file, cb) => {
		// console.log(path.extname(file.originalname));
		let extension = path.extname(file.originalname) || '.jpg';
		cb(null, file.fieldname + '-market-' + Date.now() + extension);
	},
});

module.exports.addMarketMainPhotos = multer({
	storage: marketMediaStorage,
}).fields([
	{ name: 'main_image', maxCount: 1 },
	{ name: 'sub_image1', maxCount: 1 },
	{ name: 'sub_image2', maxCount: 1 },
	{ name: 'sub_image3', maxCount: 1 },
]);

/****************************************GROUP IMAGE********************************************/

const groupPictureMediaStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		const dirBasePath = SITE_CONFIG.mediaBasePath;
		let dirPath = dirBasePath + 'images';
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath);
		}
		dirPath += '/' + 'group';
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath);
		}
		cb(null, dirPath);
	},
	filename: (req, file, cb) => {
		// console.log(path.extname(file.originalname));
		let extension = path.extname(file.originalname) || '.jpg';
		cb(null, file.fieldname + '-group-' + Date.now() + extension);
	},
});

module.exports.addGroupMedia = multer({
	storage: groupPictureMediaStorage,
}).single('file');

module.exports.afterGroupMediaUpload = function (CLIENT, req, res, callback) {
	compress_local_image(req.file, function (file1) {
		if (file1) {
			req.file.path = req.file.path.replace(
				SITE_CONFIG.mediaBasePath,
				'uploads/'
			);
			req.file.destination = req.file.destination.replace(
				SITE_CONFIG.mediaBasePath,
				'uploads/'
			);
			let uploadObj = {
				mimetype: req.file.mimetype,
				filename: req.file.filename,
				path: req.file.path,
			};

			let CONNECTION = CLIENT.db(utility.dbName);
			const group_id = Number(req.params.group_id);
			let userCollection = CONNECTION.collection(GROUP_MODEL.collection_name);
			userCollection.findOneAndUpdate(
				{ group_id: group_id },
				{ $set: { group_image: uploadObj.path } },
				function (err, updated) {
					let finalResponse = {};
					finalResponse.status = true;
					finalResponse.data = { group_image: uploadObj.path };
					callback(err, finalResponse);
				}
			);
		}
	});
};

/******************************** MESSAGE PHOTO UPLOAD ***************************************/

const messageMediaStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		const dirBasePath = SITE_CONFIG.mediaBasePath + 'messages/';
		const toDay = new Date()
			.toISOString()
			.replace(/T/, ' ')
			.replace(/\..+/, '')
			.substr(0, 10);
		const toDayFormatted = toDay.replace(/-/g, '');
		const dirYear = toDayFormatted.substr(0, 4);
		const dirMonth = toDayFormatted.substr(4, 2);

		let dirPath = dirBasePath + dirYear;
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath);
		}
		dirPath += '/' + dirMonth;
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath);
		}
		let thumbDir = dirPath + '/thumbs';
		if (!fs.existsSync(thumbDir)) {
			fs.mkdirSync(thumbDir);
		}
		cb(null, dirPath);
	},
	filename: (req, file, cb) => {
		let extension = path.extname(file.originalname) || '.jpg';
		cb(null, 'afro-' + Date.now() + extension);
	},
});

module.exports.addMessageMedia = multer({
	storage: messageMediaStorage,
}).single('file');

module.exports.afterMessageMediaUpload = function (req, res, next) {
	compress_local_image(req.file, function (file1) {
		console.log('FILE PATH: ', req.file);
		console.log('FILE1 DETAILS:', file1);
		if (file1) {
			let file = req.file;
			imageOrientationFixSync(file.path);

			let finalResponse = {
				mimetype: file.mimetype,
				filename: file.filename,
				path: file.path.replace(SITE_CONFIG.mediaBasePath, 'uploads/'),
			};

			res.json({ status: true, data: finalResponse });
		}
	});
};

/******************************** MESSAGE PHOTO UPLOAD END ***************************************/

/****************************************GROUP COVER IMAGE********************************************/

module.exports.afterGroupCoverMediaUpload = function (
	CLIENT,
	req,
	res,
	callback
) {
	compress_local_image(req.file, function (file1) {
		if (file1) {
			const originalPath = req.file.path;
			imageOrientationFix(originalPath, () => {
				req.file.path = req.file.path.replace(
					SITE_CONFIG.mediaBasePath,
					'uploads/'
				);
				req.file.destination = req.file.destination.replace(
					SITE_CONFIG.mediaBasePath,
					'uploads/'
				);
				let uploadObj = {
					mimetype: req.file.mimetype,
					filename: req.file.filename,
					path: req.file.path,
				};

				let CONNECTION = CLIENT.db(utility.dbName);
				const group_id = Number(req.params.group_id);
				let userCollection = CONNECTION.collection(GROUP_MODEL.collection_name);
				userCollection.findOneAndUpdate(
					{ group_id: group_id },
					{ $set: { group_cover_image: uploadObj.path } },
					function (err, updated) {
						let finalResponse = {};
						finalResponse.status = true;
						finalResponse.data = { group_cover_image: uploadObj.path };
						callback(err, finalResponse);
					}
				);
			});
		}
	});
};

const convertVideo = function (path, callback) {
	let filePathWithoutExt = path.split('.');
	let extname = filePathWithoutExt[filePathWithoutExt.length - 1];
	if (extname === 'mp4' || extname === 'MP4' || extname === 'webm') {
		callback(path);
	} else {
		filePathWithoutExt.pop();
		filePathWithoutExt.push('mp4');
		filePathWithoutExt = filePathWithoutExt.join('.');
		let ffmpeg = require('fluent-ffmpeg');
		new ffmpeg(path)
			.audioCodec('aac')
			.videoCodec('libx264')
			.on('end', function (result) {
				// Delete the Original File after Convertion
				const fs = require('fs');
				fs.unlinkSync(path);
				callback(filePathWithoutExt);
			})
			.on('error', function (err) {
				console.log('An error occurred: ' + err.message);
				callback(path);
			})
			.on('stderr', function (stderrLine) {
				console.log('Stderr output: ' + stderrLine);
			})
			.save(filePathWithoutExt);
	}
};

const imageOrientationFix = function (path, callback) {
	im.readMetadata(path, function (err, metadata) {
		if (err) throw err;
		if (metadata.exif && metadata.exif.orientation !== 1) {
			imConvert
				.convert({
					// autoOrient: true,
					quality: 90,
					src: path,
					dst: path,
				})
				.then((resp) => {
					console.log(resp);
					callback();
				})
				.catch((err) => {
					console.log('imageOrientation===>3', err);
					callback();
				});
		} else {
			callback();
		}
	});
};

const imageOrientationFixSync = function (path) {
	im.readMetadata(path, function (err, metadata) {
		if (err) {
			console.log('IMAGEMAGIC ERR:', err.message);
			throw err;
		}
		const stats = fs.statSync(path);
		const fileSizeInMegabytes = stats['size'] / 1000000.0;

		if (
			(metadata.exif && metadata.exif.orientation !== 1) ||
			fileSizeInMegabytes > 1
		) {
			console.log('Compressing');
			imConvert
				.convert({
					// autoOrient: true,
					quality: 70,
					src: path,
					dst: path,
				})
				.then((resp) => {
					console.log(resp);
				})
				.catch((err) => {
					console.log('imageOrientation===>1', err);
				});
		}
	});
};

const imageOrientationFixAsync = function (path, callback) {
	im.readMetadata(path, function (err, metadata) {
		if (err) throw err;
		if (metadata.exif && metadata.exif.orientation !== 1) {
			imConvert
				.convert({
					// autoOrient: true,
					quality: 90,
					src: path,
					dst: path,
				})
				.then((resp) => {
					console.log(resp);
					callback();
				})
				.catch((err) => {
					console.log('imageOrientation===>2', err);
					callback();
				});
		} else {
			callback();
		}
	});
};

const emoneyMediaStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, emoneyDirPath);
	},
	filename: (req, file, cb) => {
		let extension = path.extname(file.originalname) || '.jpg';
		cb(null, file.fieldname + '-' + Date.now() + extension);
	},
});
module.exports.addEmoneyMedia = multer({ storage: emoneyMediaStorage }).array(
	'files',
	5
);
module.exports.afterEmoneyMediaUpload = async function (req, res, next) {
	let filesArr = [];

	req.files.forEach((file) => {
		compress_local_image(file, (file1) => {
			imageOrientationFixSync(file.path);
			// imageOrientationFixSync2(file.path, result => {
			let finalResponse = {
				mimetype: file.mimetype,
				filename: file.filename,
				path: file.path.replace(SITE_CONFIG.mediaBasePath, 'uploads/'),
			};
			filesArr.push(finalResponse);
			if (filesArr.length == req.files.length) {
				res.json({ status: true, data: filesArr });
			}
			// });
		});
	});
};

module.exports.imageOrientationFix = imageOrientationFix;
module.exports.imageOrientationFixSync = imageOrientationFixSync;
