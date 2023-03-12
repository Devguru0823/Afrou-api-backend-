const FCM = require('fcm-push');
const serverKey =
	'AAAAzT4glkc:APA91bEXyhxjfKQVQK2LZZqvbzZAzBObWK9z8pwxPgvuQyFEi7lCuDiIqWVUJ26cKL2Kv0pCl5vW8PKRRHtfLdQCoLY_jpk9hvaDgsWLi33TM2M3e_Ei_ey7TxHGTTnc_uMYTVXkZjFU';
const fcm = new FCM(serverKey);
module.exports. sendPush = (to, collapse_key, data, sendNotification = true) => {
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
			icon: 'https://www.afrocamgist.com/images/sharelogo.png'
		},
		data
	};
	if (sendNotification) {
		payload.notification = {
			title: data.title || 'Afrocamgist',
			body: data.body,
			sound: data.sound || 'default',
			click_action: data.click_action,
			icon: 'https://www.afrocamgist.com/images/sharelogo.png'
		};
	}
	fcm
		.send(payload)
		.then((response) => {
			// console.log(`Sent Successfully: ${response}`);
		})
		.catch((err) => {
			// console.log("For message limit Check===>", data.status);
			// console.log(`Error While Sending Push ${err}`);
		});
};