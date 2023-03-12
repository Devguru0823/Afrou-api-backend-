'use strict';
const NOTIFICATION_MODEL = require('../models/notification.json');
module.exports.getNotificationTextFromTemplate = function (CONNECTION, notifications, cb) {

    let userCollection = CONNECTION.collection(USER_MODEL.collection_name);

    let userIdsArray = [];
    let tempArr = [];
    notifications.forEach(not =>{
        const currentString = not.notification_details.text_template;
        let regEx = new RegExp('([0-9]+ (cat|fish))','g');
        let result = currentString.match(regEx);
        // console.log(JSON.stringify(result));
    });

};
