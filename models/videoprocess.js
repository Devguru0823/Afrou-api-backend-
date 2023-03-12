'use strict';
const fs = require('fs');
const SITE_CONFIG = require('../configs/siteConfig');
const path = require('path');
const utility = require('../utilities');
var ffmpeg = require('ffmpeg');
const { exec } = require('child_process');
const userModel = require('./user.json');
const postModel = require('./post.json');

module.exports.addWaterMark = async function (CLIENT, req, res, cb) {
	try {
		const dirBasePath = SITE_CONFIG.mediaBasePath;
		let s3Path = SITE_CONFIG.s3Path;
		let videoPath = req.body.video.replace('uploads/', '');
		let downloadVideoPath = s3Path.replace('cdn/uploads/', 'downloads/');
		let videoName = path.basename(videoPath);
		var newPathLogo =
			dirBasePath.replace('uploads/', 'downloads/') +
			'posts/onlyLogo/' +
			videoName;
		var newPath =
			dirBasePath.replace('uploads/', 'downloads/') + 'posts/' + videoName;
		var process = new ffmpeg(dirBasePath + videoPath);
		/** For logo at end */
		var logoMp4 = '../../' + s3Path + 'temp/' + videoName;
		var logoTs =
			'../../' + s3Path + 'temp/' + videoName.replace('.mp4', 'I.ts');
		var videoTs =
			'../../' + s3Path + 'temp/' + videoName.replace('.mp4', '.ts');
		var dataTxt =
			'../../' + s3Path + 'temp/' + videoName.replace('.mp4', '.txt');

		/**
		 * Get User Id from Post collection
		 */
		let CONNECTION = CLIENT.db(utility.dbName);
		let postCollection = CONNECTION.collection(postModel.collection_name);
		postCollection.findOne(
			{ post_video: req.body.video.trim() },
			function (err, postDetails) {
				console.log(err);
				// console.log(postDetails);
				/**
				 * Get User detail
				 */
				let user_id = postDetails.posted_by; // req.authorization.user_id;
				// let CONNECTION = CLIENT.db(utility.dbName);
				let userCollection = CONNECTION.collection(userModel.collection_name);
				userCollection.findOne(
					{ user_id: user_id },
					function (err, userDetails) {
						if (userDetails) {
							var userName = '';
							if (userDetails.user_name && userDetails.user_name != '') {
								userName = userDetails.user_name;
							} else {
								userName = userDetails.first_name + ' ' + userDetails.last_name;
							}
							/**
							 * Watermark video
							 */
							process.then(
								async function (video) {
									if (
										video.metadata.artist &&
										video.metadata.artist == 'Afrocamgist download'
									) {
										console.log('already downloaded');
										exec(
											'cp ' + dirBasePath + videoPath + ' ' + newPath,
											(error, stdout, stderr) => {
												// console.log(error);
												// console.log(stdout);
												// console.log(stderr);
												var newFilepath =
													downloadVideoPath + 'posts/' + videoName;
												cb(null, { result: true, video_path: newFilepath });
											}
										);
									} else {
										// var watermarkPath = './public/watermark7.png',
										var watermarkPath = './public/watermark150.png';
										var fontSize = 15;
										var textPosY = 65;
										var logoH = 70;
										var videoResolutionWidth =
											video.metadata.video.resolution.w;
										if (
											video.metadata.video.resolution.h >
												videoResolutionWidth &&
											videoResolutionWidth > 500
										) {
											videoResolutionWidth = video.metadata.video.resolution.h;
										}
										if (videoResolutionWidth <= 550) {
											watermarkPath = './public/watermark100.png';
											fontSize = 10;
											textPosY = 50;
											logoH = 70;
										} else if (videoResolutionWidth >= 1600) {
											watermarkPath = './public/watermark250.png';
											fontSize = 25;
											textPosY = 85;
											logoH = 55;
										} else if (videoResolutionWidth >= 1600) {
											watermarkPath = './public/watermark200.png';
											fontSize = 20;
											textPosY = 80;
											logoH = 65;
										}

										var newFilepath = downloadVideoPath + 'posts/' + videoName;
										if (fs.existsSync(newPathLogo)) {
											fs.unlinkSync(newPathLogo);
										}

										/** ===== **/
										var logoHeight = parseInt(logoH) + parseInt(fontSize);
										var topLogoPos = 20;
										var textPosY1 = 80;
										if (
											video.metadata.video.resolution.h >
											video.metadata.video.resolution.w
										) {
											topLogoPos = video.metadata.video.resolution.h / 2 - 300;
											if (topLogoPos < 20) {
												topLogoPos = 20;
											} else {
												logoHeight = topLogoPos + logoHeight;
												textPosY1 = logoHeight - 5;
												textPosY = topLogoPos + textPosY - 20;
											}
										}
										var videoCustomData = {};
										videoCustomData.originalW =
											video.metadata.video.resolution.w;
										videoCustomData.originalH =
											video.metadata.video.resolution.h;

										/** ===== **/

										exec(
											'ffmpeg -y -i ' +
												video.file_path +
												' -i ' +
												watermarkPath +
												" -filter_complex \"[0:v][1:v]overlay=x='if(lt(mod(t,10),5),10,W-w-10)':y='if(lt(mod(t,10),5)," +
												topLogoPos +
												',H-h-' +
												logoHeight +
												')\'" -codec:a copy ' +
												newPathLogo,
											(error, stdout, stderr) => {
												console.log(watermarkPath);
												exec(
													'ffmpeg -y -i ' +
														newPathLogo +
														" -metadata artist='Afrocamgist download' -vf drawtext=\"text='@" +
														userName +
														"': fontcolor=black: fontsize=" +
														fontSize +
														": box=1: boxcolor=white@0.5: \\boxborderw=5: x='if(lt(mod(t,10),5),20,(w-text_w)-20)': y='if(lt(mod(t,10),5)," +
														textPosY +
														',h-' +
														textPosY1 +
														')\'" -codec:a copy ' +
														newPath +
														' ',
													(error, stdout, stderr) => {
														/** Add logo at the end of video */
														exec(
															'ffmpeg -y -f lavfi -i color=size=' +
																videoCustomData.originalW +
																'x' +
																videoCustomData.originalH +
																':duration=3:rate=25:color=black -i ./public/watermark250.png -filter_complex "[0:v][1:v]overlay=x=(' +
																videoCustomData.originalW +
																'-250)/2:y=(' +
																videoCustomData.originalH +
																'-63)/2" ' +
																logoMp4,
															async (error, stdout, stderr) => {
																exec(
																	'ffmpeg -y -i ' +
																		logoMp4 +
																		' -c copy -bsf:v h264_mp4toannexb -f mpegts ' +
																		logoTs,
																	async (error, stdout, stderr) => {
																		exec(
																			'ffmpeg -y -i ' +
																				newPath +
																				' -c copy -bsf:v h264_mp4toannexb -f mpegts ' +
																				videoTs,
																			async (error, stdout, stderr) => {
																				var dataTxtFile = '';
																				dataTxtFile +=
																					"file '" +
																					videoTs.replace(
																						'../../cdn/uploads/temp/',
																						'/root/afro/cdn/uploads/temp/'
																					) +
																					"'\n";
																				dataTxtFile +=
																					"file '" +
																					logoTs.replace(
																						'../../cdn/uploads/temp/',
																						'/root/afro/cdn/uploads/temp/'
																					) +
																					"'";

																				fs.writeFile(
																					dataTxt,
																					dataTxtFile,
																					function (err) {
																						exec(
																							'chmod 775 ' + dataTxt,
																							async (error, stdout, stderr) => {
																								exec(
																									'ffmpeg -y -f concat -safe 0 -i ' +
																										dataTxt +
																										' -c copy -bsf:a aac_adtstoasc ' +
																										newPath,
																									async (
																										error,
																										stdout,
																										stderr
																									) => {
																										if (
																											fs.existsSync(logoMp4)
																										) {
																											console.log('In');
																											fs.unlinkSync(logoMp4);
																										} else {
																											console.log('Out');
																											console.log(logoMp4);
																										}
																										if (fs.existsSync(logoTs)) {
																											fs.unlinkSync(logoTs);
																										}
																										if (
																											fs.existsSync(videoTs)
																										) {
																											fs.unlinkSync(videoTs);
																										}
																										if (
																											fs.existsSync(dataTxt)
																										) {
																											fs.unlinkSync(dataTxt);
																										}

																										console.log('done');
																										cb(null, {
																											result: true,
																											video_path: newFilepath,
																										});
																									}
																								);
																							}
																						);
																					}
																				);
																			}
																		);
																	}
																);
															}
														);
														/* ***************************** */
														// console.log("done");
														// cb(null, {"result": true, "video_path": newFilepath});
													}
												);
											}
										);
									}
								},
								function (err) {
									console.log('Error: ' + err);
								}
							);
						}
					}
				);
			}
		);
	} catch (e) {
		cb(e.msg, null);
	}
};

module.exports.deleteVideo = async function (req, res, cb) {
	const dirBasePath = SITE_CONFIG.mediaBasePath.replace('uploads/', '');

	let videoPath = dirBasePath + req.body.video;
	let videoPathLogo = dirBasePath + 'onlyLogo/' + req.body.video;
	console.log(videoPath);
	// fs.unlinkSync(videoPath);
	if (fs.existsSync(videoPath)) {
		fs.unlinkSync(videoPath);
	}
	if (fs.existsSync(videoPathLogo)) {
		fs.unlinkSync(videoPathLogo);
	}
	cb(null, { result: true });
};
