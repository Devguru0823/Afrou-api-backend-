/**
 * Send message
 */
const sendMessage = () => {
    var fromId = prompt("Enter From user id: ");
    var toId = prompt("Enter to user id: ");
    var message = prompt("Enter Message: ");
    const data = {
        from_id: parseInt(fromId),
        to_id: parseInt(toId),
        message: message + " - Socket.io",
    };
    socket.emit('message', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('Message sent', responseData);
    });
};

/**
 * Update message
 */
const updateMessage = () => {
    const data = {
        from_id: 2149,
        message_id: 4846,
        message: "My updated message - Socket.io"
    };
    socket.emit('updateMessage', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('Message update', responseData);
    });
};

/**
 * Like/Dislike message
 */
const likeMessage = () => {
    const data = {
        from_id: 2161,
        message_id: 3202,
        like_type: "message"
    };
    socket.emit('likeMessage', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('Message like', responseData);
    });
};

/**
 * Delete message
 */
const deleteMessage = () => {
    const data = {
        from_id: 2149,
        message_id: 3209
    };
    socket.emit('deleteMessage', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('Message delete', responseData);
    });
};

/**
 * Delete all messages
 */
const deleteAllMessages = () => {
    var fromId = prompt("Enter From user id: ");
    var toId = prompt("Enter to user id: ");
    var deleteFor = prompt("Delete for [1=Only for me, 2=For all]: ");
    const data = {
        from_id: parseInt(fromId),
        to_id: parseInt(toId),
        delete_for: parseInt(deleteFor)
    };
    socket.emit('deleteAllMessages', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('Message delete', responseData);
    });
};

/**
 * Delete selected messages
 */
const deleteSelectedMessages = () => {
    var fromId = prompt("Enter From user id: ");
    var toId = prompt("Enter to user id: ");
    var message_ids = prompt("Enter message id(s) [Enter comma seperated for multiple ids]: ");
    var deleteFor = prompt("Delete for [1=Only for me, 2=For all]: ");
    message_ids = message_ids.split(',');
    var messageIds = [];
    $.each(message_ids, function (index, id) {
        messageIds.push(parseInt(id.trim()))
    });
    const data = {
        from_id: parseInt(fromId),
        to_id: parseInt(toId),
        message_ids: messageIds,
        delete_for: parseInt(deleteFor)
    };
    socket.emit('deleteSelectedMessages', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('Delete Selected Messages', responseData);
    });
};

/**
 * Archive messages
 */
const archiveMessages = () => {
    var fromId = prompt("Enter from user id: ");
    var toId = [];
    do {
        toId.push(parseInt(prompt("Enter to user id: ")));
    } while (confirm("Do you want to enter more ids?"));
    const data = {
        from_id: parseInt(fromId),
        to_id: toId
    };
    socket.emit('archiveMessages', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('Message archive', responseData);
    });
};

/**
 * Remove archive messages
 */
const removeArchiveMessages = () => {
    var fromId = prompt("Enter from user id: ");
    var toId = [];
    do {
        toId.push(parseInt(prompt("Enter to user id: ")));
    } while (confirm("Do you want to enter more ids?"));
    const data = {
        from_id: parseInt(fromId),
        to_id: toId
    };
    socket.emit('removeArchiveMessages', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('Messages remove from archive', responseData);
    });
};

/**
 * Get archive messages
 */
const getArchiveUsers = () => {
    var fromId = prompt("Enter from user id: ");
    const data = {
        from_id: parseInt(fromId)
    };
    socket.emit('getArchiveUsers', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('Archived Users', responseData);
    });
};

/**
 * Archive users
 */
const archiveUsers = () => {
    var fromId = prompt("Enter from user id: ");
    var toId = [];
    do {
        toId.push(parseInt(prompt("Enter to user id: ")));
    } while (confirm("Do you want to enter more ids?"));
    const data = {
        from_id: parseInt(fromId),
        to_id: toId
    };
    socket.emit('archiveUsers', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('User archive', responseData);
    });
};

/**
 * Remove archive users
 */
const removeArchiveUsers = () => {
    var fromId = prompt("Enter from user id: ");
    var toId = [];
    do {
        toId.push(parseInt(prompt("Enter to user id: ")));
    } while (confirm("Do you want to enter more ids?"));
    const data = {
        from_id: parseInt(fromId),
        to_id: toId
    };
    socket.emit('removeArchiveUsers', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('Users remove from archive', responseData);
    });
};

/**
 * Delete users from message list
 */
const deleteUserfromMessageList = () => {
    var fromId = prompt("Enter from user id: ");
    var toId = [];
    do {
        toId.push(parseInt(prompt("Enter to user id: ")));
    } while (confirm("Do you want to enter more ids?"));
    const data = {
        from_id: parseInt(fromId),
        to_id: toId
    };
    socket.emit('deleteUserfromMessageList', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('Delete user from message list', responseData);
    });
};

/**
 * Reply message
 */
const replyMessage = () => {
    const data = {
        from_id: 2161,
        to_id: 2149,
        message_id: 3202,
        message_text: "Reply message from socket.io"
    };
    socket.emit('replyMessage', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('Message reply', responseData);
    });
};

/**
 * Get message
 */
const getMessages = () => {
    var fromId = prompt("Enter from user id: ");
    var toId = prompt("Enter to user id: ");
    const data = {
        from_id: parseInt(fromId),
        to_id: parseInt(toId),
        page: 1
    };
    socket.emit('getmessages', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('Message get', responseData);
    });
};

/**
 * Create group
 */
const createGroup = () => {
    const data = {
        title: "Group 2",
        created_by: 2149,
        is_public: true
    };
    socket.emit('createMessageGroup', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('Group Created', responseData);
    });
};

/**
 * Get room
 */
const getRoom = () => {
    const data = {
        from_id: 2149,
        to_id: 2161
    };
    socket.emit('getroom', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('getroom', responseData);
    });
};

/**
 * Get socket id
 */
const getSocketId = () => {
    const data = {
        user_id: 2149
    };
    socket.emit('getsocketid', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('getsocketid', responseData);
    });
};

/**
 * Get Notifications
 */
const getNotifications = () => {
    const data = {
        user_id: 2149,
        page: 1
    };
    socket.emit('getnotifications', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('getnotifications', responseData);
    });
};

/**
 * Get Notification Counter
 */
const getNotificationCounter = () => {
    const data = {
        user_id: 2149
    };
    socket.emit('getnotificationcounter', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('getnotificationcounter', responseData);
    });
};

/**
 * Get message
 */
const getMessageList = () => {
    var userId = prompt("Enter user id: ");
    let page = prompt('page no')
    const data = {
        user_id: parseInt(userId),
        page: Number(page) || 1,
        // all: true
    };
    socket.emit('getmessagelist', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('getmessagelist', responseData);
    });
};

/**
 * Trigger Notification
 */
const triggerNotificationNewMessage = () => {
    const data = {
        from_user_id: 2149,
        to_user_id: 2161,
        type: "new message"
    };
    socket.emit('notification', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('notification', responseData);
    });
};

/**
 * Add member to group
 */
const addMemberToGroup = () => {
    var fromId = prompt("Enter admin member id: ");
    var memberId = prompt("Enter member id: ");
    var groupId = prompt("Enter group id: ");
    const data = {
        from_id: parseInt(fromId),
        member_id: parseInt(memberId),
        group_id: parseInt(groupId)
    };
    socket.emit('addMemberToMessageGroup', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('Member added', responseData);
    });
};

/**
 * Remove member from group
 */
const removeMemberFromGroup = () => {
    var fromId = prompt("Enter admin member id: ");
    var memberId = prompt("Enter member id: ");
    var groupId = prompt("Enter group id: ");
    const data = {
        from_id: parseInt(fromId),
        member_id: parseInt(memberId),
        group_id: parseInt(groupId)
    };
    socket.emit('removeMemberFromMessageGroup', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('Member removed', responseData);
    });
};

/**
 * Mark member as Admin
 */
const markMemberAsAdmin = () => {
    var fromId = prompt("Enter admin member id: ");
    var memberId = prompt("Enter member id: ");
    var groupId = prompt("Enter group id: ");
    const data = {
        from_id: parseInt(fromId),
        member_id: parseInt(memberId),
        group_id: parseInt(groupId)
    };
    socket.emit('markMemberAsAdmin', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('Marked as Admin', responseData);
    });
};

/**
 * Remove member from Admin
 */
const removeMemberFromAdmin = () => {
    var fromId = prompt("Enter admin member id: ");
    var memberId = prompt("Enter member id: ");
    var groupId = prompt("Enter group id: ");
    const data = {
        from_id: parseInt(fromId),
        member_id: parseInt(memberId),
        group_id: parseInt(groupId)
    };
    socket.emit('removeMemberFromAdmin', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('Removed from Admin', responseData);
    });
};

/**
 * Get Group Members
 */
const getGroupMembers = () => {
    var groupId = prompt("Enter group id: ");
    const data = {
        group_id: parseInt(groupId)
    };
    socket.emit('getGroupMembers', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('Group Members', responseData);
    });
};

/**
 * Get Groups
 */
const getGroups = () => {
    const data = {};
    socket.emit('getGroups', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('Groups', responseData);
    });
};

/**
 * Get Group By Id
 */
const getGroupById = () => {
    var groupId = prompt("Enter group id: ");
    const data = {
        group_id: parseInt(groupId)
    };
    socket.emit('getGroupById', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('Group', responseData);
    });
};

/**
 * Get Group By Id
 */
const editMessageGroup = () => {
    var groupId = prompt("Enter group id: ");
    var groupTitle = prompt("Enter group title: ");
    var groupStatus = prompt("Enter group status: ");
    const data = {
        group_id: parseInt(groupId),
        title: groupTitle,
        status: groupStatus
    };
    socket.emit('editMessageGroup', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('Edit Message Group', responseData);
    });
};

/**
 * Send call notification
 */
const callNotification = () => {
    var fromId = prompt("Enter from user id: ");
    var toId = prompt("Enter to user id: ");
    var callType = prompt("Enter call type (audio / video): ");
    const data = {
        from_id: parseInt(fromId),
        to_id: parseInt(toId),
        calltype: callType.toLowerCase()
    };
    socket.emit('callNotification', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('Call Notification', responseData);
    });
};

/**
 * Accept call
 */
const acceptCall = () => {
    var fromId = prompt("Enter from user id: ");
    var callId = prompt("Enter call id: ");
    const data = {
        from_id: parseInt(fromId),
        call_id: parseInt(callId)
    };
    socket.emit('acceptCall', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('Call Accept', responseData);
    });
};

/**
 * End call
 */
const endCall = () => {
    var fromId = prompt("Enter from user id: ");
    var callId = prompt("Enter call id: ");
    var callDuration = prompt("Enter call duration (00:00:00): ");
    const data = {
        from_id: parseInt(fromId),
        call_id: parseInt(callId),
        call_duration: callDuration
    };
    socket.emit('endCall', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('Call End', responseData);
    });
};

/**
 * Reject call
 */
const rejectCall = () => {
    var fromId = prompt("Enter from user id: ");
    var callId = prompt("Enter call id: ");
    const data = {
        from_id: parseInt(fromId),
        call_id: parseInt(callId)
    };
    socket.emit('rejectCall', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('Call Reject', responseData);
    });
};

/**
 * Call log
 */
const callLog = () => {
    var fromId = prompt("Enter from user id: ");
    const data = {
        from_id: parseInt(fromId)
    };
    socket.emit('callLog', data, function (err, responseData) {
        if (err) {
            alert('An error occured');
            console.log(err);
            return -1;
        }
        console.log('Call Log', responseData);
    });
};
