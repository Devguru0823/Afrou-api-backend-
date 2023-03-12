'use strict';
const multer = require('multer');
const fs = require('fs');
const SITE_CONFIG = require('../configs/siteConfig');
const path = require('path');
const utility = require('../utilities');
const im = require('imagemagick');
const imConvert = require('easyimage');
const ThumbnailGenerator = require('video-thumbnail-generator').default;
const os = require('os-utils');
const compress_images = require('compress-images');
const gifsicle = require('gifsicle');
const sharp = require('sharp');

var ffmpeg = require('fluent-ffmpeg');

module.exports.compress_media_video = function (pathOrig, flag, cb) {
	var ext = path.extname(pathOrig);
	var pathOut = pathOrig.replace(ext, '.mp4');
	if (ext == '.mp4') {
		var pathOrig1 = pathOrig.replace(ext, '-Old.mp4');
		fs.rename(pathOrig, pathOrig1, () => {
			callFfmpeg(pathOrig1, pathOut, function (err, result) {
				console.log('=== result ===');
				console.log(err);
				console.log(result);
				console.log('==============');
				cb(err, result);
			});
		});
	} else {
		callFfmpeg(pathOrig, pathOut, function (err, result) {
			cb(err, result);
		});
	}
};

const callFfmpeg = function (pathOrig, pathOut, cb) {
	var width = 960;
	var height = 540;

	ffmpeg.ffprobe(pathOrig, function (err, metadata) {
		if (err) {
			console.error(err);
		} else {
			console.log('=== metadata - 1 ===');
			console.log(metadata);
			console.log('====================');
			// metadata should contain 'width', 'height' and 'display_aspect_ratio'
			if (metadata.streams[0].rotation) {
				if (
					metadata.streams[0].rotation == '-90' ||
					metadata.streams[1].rotation == '-90'
				) {
					metadata.streams[0].rotation = '-90';
				}
			}
			if (!metadata.streams[0].height) {
				if (metadata.streams[1].height) {
					metadata.streams[0].height = metadata.streams[1].height;
				} else {
					metadata.streams[0].rotation = '-90';
				}
			}
			if (!metadata.streams[0].width) {
				if (metadata.streams[1].width) {
					metadata.streams[0].width = metadata.streams[1].width;
				} else {
					metadata.streams[0].rotation = '-90';
				}
			}
			if (metadata.streams[0].height > metadata.streams[0].width) {
				width = metadata.streams[0].width;
				height = metadata.streams[0].height;
				if (metadata.streams[0].width < 960) {
					width = metadata.streams[0].width;
					height = metadata.streams[0].height;
				} else {
					height = Math.floor((height * 960) / width);
					width = 960;
				}
			} else {
				if (metadata.streams[0].width < 960) {
					width = metadata.streams[0].width;
					height = metadata.streams[0].height;
				}
			}

			/* ffmpeg conversion code */
			/* ffmpeg conversion code */
			console.log('=== metadata - 2 ===');
			console.log(metadata);
			console.log('====================');
			if (
				metadata.streams[0].rotation &&
				metadata.streams[0].rotation == '-90'
			) {
				ffmpeg(pathOrig)
					.videoCodec('libx264')
					.format('mp4')
					.output(pathOut)
					// .size(width+'x'+height)
					.outputOptions([
						'-vsync vfr',
						'-threads 2',
						'-preset superfast',
						'-crf 30',
						'-tune film',
					])
					.videoBitrate('384k')
					.renice(10)
					.on('end', function () {
						console.log('Finished processing');
						cb(null, pathOut);
					})
					.run();
			} else {
				/*size condition for 7MB */
				console.log('=== Size ===');
				console.log(metadata.format.size + '<= 7000000');
				console.log('============');
				if (metadata.format.size <= 7000000) {
					ffmpeg(pathOrig)
						.videoCodec('libx264')
						.format('mp4')
						.output(pathOut)
						.size(width + 'x' + height)
						.outputOptions([
							'-vsync vfr',
							'-threads 2',
							'-preset superfast',
							'-crf 28',
							'-tune film',
						])
						.videoBitrate('512k')
						.renice(10)
						.on('end', function () {
							console.log('Finished processing');
							cb(null, pathOut);
						})
						.run();
				} else {
					ffmpeg(pathOrig)
						// .audioCodec('libmp3lame')
						.videoCodec('libx264')
						.format('mp4')
						.output(pathOut)
						.size(width + 'x' + height)
						// .aspect('16:9')
						// .autopad(false)
						.outputOptions([
							'-vsync vfr',
							'-threads 2',
							'-preset superfast',
							'-crf 33',
							'-tune film',
						])
						.videoBitrate('384k')
						// .audioBitrate('64k')
						.renice(10)
						.on('end', function () {
							console.log('Finished processing');
							cb(null, pathOut);
						})
						.run();
				}
			}
		}
	});
};

module.exports.compress_media_image = function (pathOrig, flag, cb) {
	let nm = path.basename(pathOrig);
	var newPathOut = pathOrig;
	var newWidth = 800;
	var pathOrig1 = pathOrig.replace(nm, 'Old_' + nm);
	var ext = path.extname(pathOrig);
	var sizeOf = require('image-size');
	var dimensions = sizeOf(newPathOut);
	if (dimensions.width > 800) {
		fs.rename(pathOrig, pathOrig1, () => {
			if (ext == '.gif') {
				console.log('In GIF');
				/* */
				newPathOut = newPathOut.replace(nm, '_');
				compress_images(
					pathOrig1,
					newPathOut,
					{
						compress_force: false,
						statistic: true,
						autoupdate: true,
					},
					false,
					{ jpg: { engine: 'mozjpeg', command: ['-quality', '95'] } },
					{ png: { engine: 'pngquant', command: ['--quality=80-95', '-o'] } },
					{ svg: { engine: 'svgo', command: '--multipass' } },
					{ gif: { engine: 'giflossy', command: ['--lossy=95'] } },
					function (error, completed, statistic) {
						/* rename files */
						var newPathOut1 = newPathOut.replace('_', nm);
						fs.rename(newPathOut + 'Old_' + nm, newPathOut1, () => {
							cb(null, newPathOut1);
						});
					}
				);
				/* */
			} else {
				sharp(pathOrig1)
					.resize(newWidth)
					.withMetadata()
					.toFile(newPathOut, (err, info) => {
						if (err) {
							cb(err, null);
						} else {
							console.log(info);
							cb(null, newPathOut);
						}
					});
			}
		});
	} else {
		cb(null, pathOrig);
	}
};

module.exports.compress_media_image_old = function (pathOrig, flag, cb) {
	let nm = path.basename(pathOrig);
	var newPathOut = pathOrig.replace(nm, '_');
	var ext = path.extname(pathOrig);
	if (ext == '.gif') {
		console.log('In GIF');
		/* */
		compress_images(
			pathOrig,
			newPathOut,
			{
				compress_force: false,
				statistic: true,
				autoupdate: true,
			},
			false,
			{ jpg: { engine: 'mozjpeg', command: ['-quality', '95'] } },
			{ png: { engine: 'pngquant', command: ['--quality=80-95', '-o'] } },
			{ svg: { engine: 'svgo', command: '--multipass' } },
			{ gif: { engine: 'giflossy', command: ['--lossy=95'] } },
			function (error, completed, statistic) {
				/* rename files */
				let poNm = path.basename(newPathOut);
				var pathOrig1 = pathOrig.replace(nm, 'Old_' + nm);
				fs.rename(pathOrig, pathOrig1, () => {
					var newPathOut1 = newPathOut.replace(poNm, nm);
					newPathOut = newPathOut + nm;
					fs.rename(newPathOut, newPathOut1, () => {
						cb(null, newPathOut1);
					});
				});
				/* */
			}
		);
	} else {
		compress_images(
			pathOrig,
			newPathOut,
			{
				compress_force: false,
				statistic: true,
				autoupdate: true,
			},
			false,
			{ jpg: { engine: 'mozjpeg', command: ['-quality', '95'] } },
			{ png: { engine: 'pngquant', command: ['--quality=80-95', '-o'] } },
			{ svg: { engine: 'svgo', command: '--multipass' } },
			{
				gif: {
					engine: 'gifsicle',
					command: ['--colors', '64', '--use-col=web'],
				},
			},
			function (error, completed, statistic) {
				// console.log("-------------");
				// console.log(error);
				// console.log(completed);
				// console.log(statistic);
				// console.log("-------------");
				/* rename files */
				let poNm = path.basename(newPathOut);
				var pathOrig1 = pathOrig.replace(nm, 'Old_' + nm);
				fs.rename(pathOrig, pathOrig1, () => {
					var newPathOut1 = newPathOut.replace(poNm, nm);
					newPathOut = newPathOut + nm;
					var sizeOf = require('image-size');
					var dimensions = sizeOf(newPathOut);
					var newWidth = 800;
					if (dimensions.width < 800) {
						newWidth = dimensions.width;
					}
					sharp(newPathOut)
						.resize(newWidth)
						.toFile(newPathOut1, (err, info) => {
							if (err) {
								cb(err, null);
							} else {
								console.log(info);
								cb(null, newPathOut1);
							}
						});
				});
			}
		);
	}
};
