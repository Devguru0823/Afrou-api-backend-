const { io } = require('../routes/socket');

const FCM = require('fcm-push');
const serverKey =
	'AAAAzT4glkc:APA91bEXyhxjfKQVQK2LZZqvbzZAzBObWK9z8pwxPgvuQyFEi7lCuDiIqWVUJ26cKL2Kv0pCl5vW8PKRRHtfLdQCoLY_jpk9hvaDgsWLi33TM2M3e_Ei_ey7TxHGTTnc_uMYTVXkZjFU';
const fcm = new FCM(serverKey);
const NOTIFICATION = require('../models/notification');
const MESSAGES = require('../models/message');
const utility = require('../utilities');

const fs = require('fs');

const sendPush = async function (
	to,
	collapse_key,
	data,
	sendNotification = true
) {
	try {
		let payload = {
			to,
			collapse_key,
			priority: 'high',
			delay_while_idle: true,
			dry_run: false,
			badge: '1',
			mutable_content: data.mutable_content || false,
			content_available: data.content_available || false,
			show_in_foreground: true,
			notification: {
				title: data.title || 'Afrocamgist',
				body: data.body,
				sound: data.sound || 'default',
				click_action: data.click_action,
				icon: 'https://www.afrocamgist.com/images/sharelogo.png',
			},
			data,
		};
		if (sendNotification) {
			payload.notification = {
				title: data.title || 'Afrocamgist',
				body: data.body,
				sound: data.sound || 'default',
				click_action: data.click_action,
				icon: 'https://www.afrocamgist.com/images/sharelogo.png',
			};
		}
		fcm
			.send(payload)
			.then((response) => {
				console.log(`Sent Successfully: ${response}`);
			})
			.catch((err) => {
				console.log('For message limit Check===>', data.status);
				console.log(`Error While Sending Push ${err}`);
			});
	} catch (err) {
		console.log('Push notification ERROR: ', err);
	}
};

const sendPush2 = (to, collapse_key, data, sendNotification = true, email) => {
	if (email) {
		var data1 = {
			from_id: email.fromUser.user_id,
			to_id: email.toUser.user_id,
		};
		if (email.toUser.socketId && email.toUser.socketId != '') {
			const req = { authorization: { user_id: email.toUser.user_id } },
				res = {};
			// connect to mongodb
			utility.mongoConnect(req, res, (client) => {
				NOTIFICATION.getCounters(client, req, res, (err, counters) => {
					if (err) {
						console.log('ERR GETTING COUNTERS:', err);
						client.close();
						return;
					}
					data1.counters = counters.data;
					if (email.type === 'newMessage') {
						// check for user's messages
						MESSAGES.getMessagesList(client, req, res, (msgErr, messages) => {
							if (msgErr) {
								console.log('ERR GETTING MESSAGES: ', msgErr);
								return;
							}
							data1.messages = messages.data;
							console.log('[SENDPUSH2 FUNCTION] DATA1:', data1);
							io.to(email.toUser.socketId).emit('notification', data1);
							client.close();
						});
					} else {
						console.log('[SENDPUSH2 FUNCTION] DATA1:', data1);
						io.to(email.toUser.socketId).emit('notification', data1);
						client.close();
					}
				});
			});
		}
	}

	let payload = {
		to,
		collapse_key,
		priority: 'high',
		delay_while_idle: true,
		dry_run: false,
		badge: '1',
		mutable_content: data.mutable_content || false,
		content_available: data.content_available || false,
		show_in_foreground: true,
		notification: {
			title: data.title || 'Afrocamgist',
			body: data.body,
			image: data.image || '',
			sound: data.sound || 'default',
			click_action: data.click_action,
			icon: 'https://www.afrocamgist.com/images/sharelogo.png',
		},
		data,
	};
	if (sendNotification) {
		payload.notification = {
			title: data.title || 'Afrocamgist',
			body: data.body,
			image: data.image || '',
			sound: data.sound || 'default',
			click_action: data.click_action,
			icon: 'https://www.afrocamgist.com/images/sharelogo.png',
		};
	}
	fcm
		.send(payload)
		.then((response) => {
			console.log(`Sent Successfully: ${response}`);
		})
		.catch((err) => {
			console.log('For message limit Check===>', data.status);
			console.log(`Error While Sending Push ${err}`);
			/**
			 * If error then send email notification.
			 */
			if (email) {
				// console.log("==> ", email);
				email.sendEmail = false;
				if (sendNotification && email.sendEmail) {
					console.log('Send email');
					if (email.toUser && email.toUser.email && email.toUser.email != '') {
						switch (email.type) {
							case 'postLike':
								likePostEmail(email);
								break;
							case 'groupPostLike':
								likeGroupPostEmail(email);
								break;
							case 'commentLike':
								likeCommentEmail(email);
								break;
							case 'postShare':
								postShareEmail(email);
								break;
							case 'postOnGroup':
								postOnGroupEmail(email);
								break;
							case 'taggedByUser':
								taggedByUserEmail(email);
								break;
							case 'postCreated':
								postCreatedEmail(email);
								break;
							case 'groupPostReport':
								groupPostReportEmail(email);
								break;
							case 'groupInvitation':
								groupInvitationEmail(email);
								break;
							case 'groupInvitationAccepted':
								groupInvitationAcceptedEmail(email);
								break;
							case 'postComment':
								postCommentEmail(email);
								break;
							case 'newMessage':
								newMessageEmail(email);
								break;
							case 'newStory':
								newStoryEmail(email);
								break;
							case 'followRequest':
								followRequestEmail(email);
								break;
							case 'acceptFollowRequest':
								acceptFollowRequestEmail(email);
								break;
							case 'follow':
								followEmail(email);
								break;
							case 'test':
								testEmail(email);
								break;
							default:
							// code block
						}
					}
				}
			}
		});
};

const likePostEmail = function (email) {
	var userName = getUserName(email);
	var to = email.toUser.email,
		content = {
			subject: 'Like on post',
			message:
				`
                    <div>
                        Hi ` +
				userName.toUserName +
				`, <br/>
                        <a href="https://afrocamgist.com/profile/` +
				email.fromUser.user_id +
				`">` +
				userName.fromUserName +
				`</a> liked  your post.
                    </div>
                    \n` +
				`
                    <div>
                        <a href="https://afrocamgist.com/post/` +
				email.post_id +
				`">https://afrocamgist.com/post/` +
				email.post_id +
				`</a>
                    </div>`,
		};
	sendEmail2(to, content.subject, content.message, email);
};

const likeGroupPostEmail = function (email) {
	var userName = getUserName(email);
	var to = email.toUser.email,
		content = {
			subject: 'Like on post',
			message:
				`
                    <div>
                        Hi ` +
				userName.toUserName +
				`, <br/>
                        <a href="https://afrocamgist.com/profile/` +
				email.fromUser.user_id +
				`">` +
				userName.fromUserName +
				`</a> liked your post in a Forum.
                    </div>
                    \n` +
				`
                    <div>
                        <a href="https://afrocamgist.com/post/` +
				email.post_id +
				`">https://afrocamgist.com/post/` +
				email.post_id +
				`</a>
                    </div>`,
		};
	sendEmail2(to, content.subject, content.message, email);
};

const likeCommentEmail = function (email) {
	var userName = getUserName(email);
	var to = email.toUser.email,
		content = {
			subject: 'Like on Comment',
			message:
				`
                    <div>
                        Hi ` +
				userName.toUserName +
				`, <br/>
                        <a href="https://afrocamgist.com/profile/` +
				email.fromUser.user_id +
				`">` +
				userName.fromUserName +
				`</a> liked  your Comment.
                    </div>
                    \n` +
				`
                    <div>
                        <a href="https://afrocamgist.com/post/` +
				email.post_id +
				`">https://afrocamgist.com/post/` +
				email.post_id +
				`</a>
                    </div>`,
		};
	sendEmail2(to, content.subject, content.message, email);
};

const postShareEmail = function (email) {
	var userName = getUserName(email);
	var to = email.toUser.email,
		content = {
			subject: 'Share Post',
			message:
				`
                    <div>
                        Hi ` +
				userName.toUserName +
				`, <br/>
                        <a href="https://afrocamgist.com/profile/` +
				email.fromUser.user_id +
				`">` +
				userName.fromUserName +
				`</a> shared your post.
                    </div>
                    \n` +
				`
                    <div>
                        <a href="https://afrocamgist.com/post/` +
				email.post_id +
				`">https://afrocamgist.com/post/` +
				email.post_id +
				`</a>
                    </div>`,
		};
	sendEmail2(to, content.subject, content.message, email);
};

const postOnGroupEmail = function (email) {
	var userName = getUserName(email);
	var to = email.toUser.email,
		content = {
			subject: 'Forum Post',
			message:
				`
                    <div>
                        Hi ` +
				userName.toUserName +
				`, <br/>
                        <a href="https://afrocamgist.com/profile/` +
				email.fromUser.user_id +
				`">` +
				userName.fromUserName +
				`</a> posted on ` +
				email.group_title +
				`
                    </div>
                    \n` +
				`
                    <div>
                        <a href="https://afrocamgist.com/post/` +
				email.post_id +
				`">https://afrocamgist.com/post/` +
				email.post_id +
				`</a>
                    </div>`,
		};
	sendEmail2(to, content.subject, content.message, email);
};

const taggedByUserEmail = function (email) {
	var userName = getUserName(email);
	var to = email.toUser.email,
		content = {
			subject: 'Tagged By User',
			message:
				`
                    <div>
                        Hi ` +
				userName.toUserName +
				`, <br/>
                        <a href="https://afrocamgist.com/profile/` +
				email.fromUser.user_id +
				`">` +
				userName.fromUserName +
				`</a> has Tagged you.
                    </div>
                    \n` +
				`
                    <div>
                        <a href="https://afrocamgist.com/post/` +
				email.post_id +
				`">https://afrocamgist.com/post/` +
				email.post_id +
				`</a>
                    </div>`,
		};
	sendEmail2(to, content.subject, content.message, email);
};

const postCreatedEmail = function (email) {
	var userName = getUserName(email);
	var to = email.toUser.email,
		content = {
			subject: 'Post created By User',
			message:
				`
                    <div>
                        Hi ` +
				userName.toUserName +
				`, <br/>
                        <a href="https://afrocamgist.com/profile/` +
				email.fromUser.user_id +
				`">` +
				userName.fromUserName +
				`</a> has created a new post.
                    </div>
                    \n` +
				`
                    <div>
                        <a href="https://afrocamgist.com/post/` +
				email.post_id +
				`">https://afrocamgist.com/post/` +
				email.post_id +
				`</a>
                    </div>`,
		};
	sendEmail2(to, content.subject, content.message, email);
};

const groupPostReportEmail = function (email) {
	var userName = getUserName(email);
	var to = email.toUser.email,
		content = {
			subject: 'Forum Post Report',
			message:
				`
                    <div>
                        Hi ` +
				userName.toUserName +
				`, <br/>
                        <a href="https://afrocamgist.com/profile/` +
				email.fromUser.user_id +
				`">` +
				userName.fromUserName +
				`</a> has reported a Post in your Forum.
                    </div>
                    \n` +
				`
                    <div>
                        <a href="https://afrocamgist.com/post/` +
				email.post_id +
				`">https://afrocamgist.com/post/` +
				email.post_id +
				`</a>
                    </div>`,
		};
	sendEmail2(to, content.subject, content.message, email);
};

const groupInvitationEmail = function (email) {
	var userName = getUserName(email);
	var to = email.toUser.email,
		content = {
			subject: 'Forum Invitation',
			message:
				`
                    <div>
                        Hi ` +
				userName.toUserName +
				`, <br/>
                        <a href="https://afrocamgist.com/profile/` +
				email.fromUser.user_id +
				`">` +
				userName.fromUserName +
				`</a> has invited you to join a Forum.
                    </div>
                    \n` +
				`
                    <div>
                        <a href="https://afrocamgist.com/afrogroup/` +
				email.group_id +
				`">https://afrocamgist.com/afrogroup/` +
				email.group_id +
				`</a>
                    </div>`,
		};
	sendEmail2(to, content.subject, content.message, email);
};

const groupInvitationAcceptedEmail = function (email) {
	var userName = getUserName(email);
	var to = email.toUser.email,
		content = {
			subject: 'Forum Invitation Accepted',
			message:
				`
                    <div>
                        Hi ` +
				userName.toUserName +
				`, <br/>
                        <a href="https://afrocamgist.com/profile/` +
				email.fromUser.user_id +
				`">` +
				userName.fromUserName +
				`</a> has accepted your Forum invitation.
                    </div>
                    \n` +
				`
                    <div>
                        <a href="https://afrocamgist.com/afrogroup/` +
				email.group_id +
				`">https://afrocamgist.com/afrogroup/` +
				email.group_id +
				`</a>
                    </div>`,
		};
	sendEmail2(to, content.subject, content.message, email);
};

const postCommentEmail = function (email) {
	var userName = getUserName(email);
	var to = email.toUser.email,
		content = {
			subject: 'Post Comment',
			message:
				`
                    <div>
                        Hi ` +
				userName.toUserName +
				`, <br/>
                        <a href="https://afrocamgist.com/profile/` +
				email.fromUser.user_id +
				`">` +
				userName.fromUserName +
				`</a>` +
				email.message +
				`.
                    </div>
                    \n` +
				`
                    <div>
                        <a href="https://afrocamgist.com/post/` +
				email.post_id +
				`">https://afrocamgist.com/post/` +
				email.post_id +
				`</a>
                    </div>`,
		};
	sendEmail2(to, content.subject, content.message, email);
};

const newMessageEmail = function (email) {
	var userName = getUserName(email);
	var to = email.toUser.email,
		content = {
			subject: 'New Message',
			message:
				`
                    <div>
                        Hi ` +
				userName.toUserName +
				`, <br/>
                        You got new message from <a href="https://afrocamgist.com/profile/` +
				email.fromUser.user_id +
				`">` +
				userName.fromUserName +
				`</a>.
                    </div>
                    \n` +
				`
                    <div>
                        <a href="https://afrocamgist.com/messages">https://afrocamgist.com/messages</a>
                    </div>`,
		};
	sendEmail2(to, content.subject, content.message, email);
};

const newStoryEmail = function (email) {
	var userName = getUserName(email);
	var to = email.toUser.email,
		content = {
			subject: 'Story created By User',
			message:
				`
                    <div>
                        Hi ` +
				userName.toUserName +
				`, <br/>
                        <a href="https://afrocamgist.com/profile/` +
				email.fromUser.user_id +
				`">` +
				userName.fromUserName +
				`</a> has created a new story.
                    </div>
                    \n` +
				`
                    <div>
                        <a href="https://afrocamgist.com">https://afrocamgist.com</a>
                    </div>`,
		};
	sendEmail2(to, content.subject, content.message, email);
};

const followRequestEmail = function (email) {
	var userName = getUserName(email);
	var to = email.toUser.email,
		content = {
			subject: 'New follow request',
			message:
				`
                    <div>
                        Hi ` +
				userName.toUserName +
				`, <br/>
                        <a href="https://afrocamgist.com/profile/` +
				email.fromUser.user_id +
				`">` +
				userName.fromUserName +
				`</a> has sent you Follow request.
                    </div>
                    \n` +
				`
                    <div>
                        <a href="https://afrocamgist.com/profile/` +
				email.fromUser.user_id +
				`">https://afrocamgist.com/profile/` +
				email.fromUser.user_id +
				`</a>
                    </div>`,
		};
	sendEmail2(to, content.subject, content.message, email);
};

const acceptFollowRequestEmail = function (email) {
	var userName = getUserName(email);
	var to = email.toUser.email,
		content = {
			subject: 'Accepted Follow Request',
			message:
				`
                    <div>
                        Hi ` +
				userName.toUserName +
				`, <br/>
                        <a href="https://afrocamgist.com/profile/` +
				email.fromUser.user_id +
				`">` +
				userName.fromUserName +
				`</a> has accepted your follow request.
                    </div>
                    \n` +
				`
                    <div>
                        <a href="https://afrocamgist.com">https://afrocamgist.com</a>
                    </div>`,
		};
	sendEmail2(to, content.subject, content.message, email);
};

const followEmail = function (email) {
	var userName = getUserName(email);
	var to = email.toUser.email,
		content = {
			subject: 'New Follower',
			message:
				`
                    <div>
                        Hi ` +
				userName.toUserName +
				`, <br/>
                        <a href="https://afrocamgist.com/profile/` +
				email.fromUser.user_id +
				`">` +
				userName.fromUserName +
				`</a> has started following you.
                    </div>
                    \n` +
				`
                    <div>
                        <a href="https://afrocamgist.com">https://afrocamgist.com</a>
                    </div>`,
		};
	sendEmail2(to, content.subject, content.message, email);
};

const testEmail = function (email) {
	var to = email.toUser.email,
		content = {
			subject: 'Subject',
			message:
				`
                    <div>
                        Hi ` +
				email.toUser.first_name +
				`, <br/>
                        <a href="https://afrocamgist.com/profile/` +
				email.fromUser.user_id +
				`">` +
				email.fromUser.first_name +
				` ` +
				email.fromUser.last_name +
				`</a> has sent you Follow request Test.
                    </div>
                    \n` +
				`
                    <div>
                        <a href="https://afrocamgist.com/profile/` +
				email.fromUser.user_id +
				`">https://afrocamgist.com/profile/` +
				email.fromUser.user_id +
				`</a>
                    </div>`,
		};
	sendEmail2(to, content.subject, content.message, email);
};

const sendEmail = function (toEmail, subject, message) {
	// console.log(__dirname);
	const nodemailer = require('nodemailer');
	fs.readFile(__dirname + '/email-template.html', 'utf8', function (err, data) {
		// console.log(err, data);
		let template = data;
		template = template.replace('{{EMAIL_CONTENT}}', message);
		template = template.replace('{{UNSUBSCRIBE_TEXT}}', '');

		async function main() {
			const emailConfig = require('../configs/email-config');
			// create reusable transporter object using the default SMTP transport

			let transporter = nodemailer.createTransport(emailConfig.config);

			let emailFrom = emailConfig.other.mail_from;

			// console.log('created');
			// send mail with defined transport object
			/* ################################### */
			/* STOP SENDING EMAILS ON STAGE SERVER */
			/* ################################### */
			// return await transporter.sendMail({
			//     from: emailFrom, // sender address
			//     to: [toEmail], // list of receivers
			//     subject: subject + ' | AFROCAMGIST', // Subject line
			//     html: template
			// });
		}

		main();
	});
};

const sendEmail2 = function (toEmail, subject, message, email) {
	// console.log(__dirname);
	const nodemailer = require('nodemailer');
	fs.readFile(__dirname + '/email-template.html', 'utf8', function (err, data) {
		// console.log(err, data);
		let template = data;
		template = template.replace('{{EMAIL_CONTENT}}', message);

		var unsubscribeText =
			`<tr>
            <td style="width: 100%; text-align: center; font-weight: 100;">
                <h6 style="font-weight: normal; padding: 10px; margin: 0;background: #fff;">
                    you can opt out of receiving future emails by clicking <a href="https://staging.afrocamgist.com/user/unsubscribe/` +
			email.toUser.user_id +
			`" style="color: inherit;">unsubscribe</a>.
                </h6>
            </td>
        </tr>`;
		template = template.replace('{{UNSUBSCRIBE_TEXT}}', unsubscribeText);

		async function main() {
			const emailConfig = require('../configs/email-config');
			// create reusable transporter object using the default SMTP transport

			let transporter = nodemailer.createTransport(emailConfig.config);

			let emailFrom = emailConfig.other.mail_from;

			// console.log('created');
			// send mail with defined transport object
			/* ################################### */
			/* STOP SENDING EMAILS ON STAGE SERVER */
			/* ################################### */
			// return await transporter.sendMail({
			//     from: emailFrom, // sender address
			//     to: [toEmail], // list of receivers
			//     subject: subject + ' | AFROCAMGIST', // Subject line
			//     html: template
			// });
		}

		main();
	});
};

const getUserName = function (email) {
	var userName = {
		toUserName: email.toUser.first_name,
		fromUserName: email.fromUser.first_name + ' ' + email.fromUser.last_name,
	};
	if (email.toUser.user_name) {
		if (email.toUser.user_name != '') {
			userName.toUserName = email.toUser.user_name;
		}
	}
	if (email.fromUser.user_name) {
		if (email.fromUser.user_name != '') {
			userName.fromUserName = email.fromUser.user_name;
		}
	}
	return userName;
};
console.log('ssssssssssss', sendPush, typeof sendPush);
module.exports = {
	sendPush,
	sendPush2,
};
