'use strict';
const fs = require('fs');
const API_KEY =
	'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';
module.exports.sendRegistrationEmail = function (userData) {
	console.log(userData);
	let message =
		'<div>Hi ' +
		userData.first_name +
		', <br/>Thank you for Registering with us. Click the link below to verify your registration</div>\n' +
		'<div><a href="https://afrocamgist.com/verify-email/' +
		userData.verification_token +
		'">https://afrocamgist.com/verify-email/' +
		userData.verification_token +
		'</a></div>';
	let subject = 'Complete Registration';
	sendEmail(userData.email, subject, message, userData);
};

module.exports.sendRegistrationEmailOTP = function (userData) {
	let message =
		'<div>Hi ' +
		userData.first_name +
		', <br/>Thank you for Registering with us. Use below code to verify your email address.</div>\n' +
		'<div>' +
		userData.verification_otp +
		'</div>';
	let subject = 'Complete Registration';
	sendEmail(userData.email, subject, message, userData);
};

module.exports.sendFollowRequestEmail = function (fromUser, toUser) {
	let message =
		'<div>Hi ' +
		toUser.first_name +
		', <br/><a href="https://afrocamgist.com/profile/' +
		fromUser.user_id +
		'">' +
		fromUser.first_name +
		' ' +
		fromUser.last_name +
		'</a> has sent you Follow request.</div>\n' +
		'<div><a href="https://afrocamgist.com/profile/' +
		fromUser.user_id +
		'">https://afrocamgist.com/profile/' +
		fromUser.user_id +
		'</a></div>';
	let subject = 'Follow Request';
	sendEmail(toUser.email, subject, message, toUser);
};

module.exports.sendGroupInvitationEmail = function (
	fromUser,
	toUser,
	groupDetails
) {
	let message =
		'<div>Hi ' +
		toUser.first_name +
		', <br/><a href="https://afrocamgist.com/profile/' +
		fromUser.user_id +
		'">' +
		fromUser.first_name +
		' ' +
		fromUser.last_name +
		'</a> has invited you to join a group <strong>' +
		groupDetails.group_title +
		'</strong>.</div>\n' +
		'<div><a href="https://afrocamgist.com/afrogroup/' +
		groupDetails.group_id +
		'">https://afrocamgist.com/afrogroup/' +
		groupDetails.group_id +
		'</a></div>';
	let subject = 'Group Invitation';
	sendEmail(toUser.email, subject, message, toUser);
};

module.exports.sendPasswordResetEmail = function (userData) {
	let message =
		'<div>Hi ' +
		userData.first_name +
		', <br/>You have requested for Password Reset.</div>\n' +
		'<div>Your OTP is <strong>' +
		userData.password_reset_otp +
		'</strong> which is valid for next 1 hour.</div>';
	let subject = 'Password Reset Request';
	sendEmail(userData.email, subject, message, userData);
};

module.exports.sendPasswordResetConfirmEmail = function (userData) {
	let message =
		'<div>Hi ' +
		userData.first_name +
		', <br/>Password reset was successful.</div>\n' +
		'<div>No actions required. This email is just to inform you about the activity. If it was not you please contact Administrator</div>';
	let subject = 'Password Reset Successful';
	sendEmail(userData.email, subject, message, userData);
};

module.exports.send2FaTokenEmail = function (userData, token) {
	let message = `<div>Hi ${userData.first_name} <br />Please use the OTP code below to continue with you 2fa sign in <br />${token}<br /><b>Note that this link expires in 10 mins</b></div>`;
	let subject = 'Two-Factor Authentication Login';
	sendEmail(userData.email, subject, message, userData);
};

module.exports.sendInvoiceEmail = function (id, userData) {
	let message = `<div>Hi ${
		userData.name.split(' ')[0]
	} <br />Thank you for subscribing to our insurance plan. Please visit the link below to see an invoice of your purchase at anytime. <br />${
		process.env.NODE_ENV === 'production'
			? `https://afrocamgist.com/ehealth/subscription/history/${id}`
			: `https://staging.afrocamgist.com/ehealth/subscription/history/${id}`
	}<br /></div>`;
	let subject = 'Insurance Invoice';
	sendEmail(userData.email, subject, message, userData);
};

const sendEmail = function (
	toEmail,
	subject,
	message,
	userData,
	hideUnsubscribe = false
) {
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
			userData.user_id +
			`" style="color: inherit;">unsubscribe</a>.
                </h6>
            </td>
        </tr>`;
		template = template.replace(
			'{{UNSUBSCRIBE_TEXT}}',
			hideUnsubscribe ? '' : unsubscribeText
		);
		// template = template.replace('{{UNSUBSCRIBE_TEXT}}', '');
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
			return await transporter.sendMail({
				from: emailFrom, // sender address
				to: [toEmail], // list of receivers
				subject: subject + ' | AFROCAMGIST', // Subject line
				html: template,
			});
		}

		main();
	});
};

// const sendEmail = function (toEmail, subject, message) {
//     console.log(__dirname);
//     fs.readFile(__dirname + '/email-template.html', 'utf8', function(err, data) {
//         // console.log(err, data);
//         let template = data;
//         template = template.replace("{{EMAIL_CONTENT}}", message);
//         const sgMail = require('@sendgrid/mail');
//         sgMail.setApiKey(API_KEY);
//         const msg = {
//             to: toEmail,
//             from: {email: 'noreply@afrocamgist.com', name: 'AFROCAMGIST'},
//             // content: [
//             //     {
//             //         "type": "html",
//             //         "value": message
//             //     }
//             // ],
//             text: message,
//             html: template,
//             subject: subject + ' | AFROCAMGIST'
//         };
//         sgMail.send(msg);

//     });

// };
// console.error("not sending mail",{REASON:"no recipients defined \n please pass a valid `toEmail` variable value to send a mail",time:new Date(),userData:{user_id:123},})
// module.exports.sendEmail2 =sendEmail2

// sendEmail("omtests12@gmail.com","aa","hwllo ",{user_id:"2149"})
module.exports.sendEmail = sendEmail;
