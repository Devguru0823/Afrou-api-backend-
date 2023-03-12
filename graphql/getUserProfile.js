'use strict';
const FRIEND_REQUEST_MODEL = require("./friend_request.json");
const POST_MODEL = require('./post.json');
const USER_MODEL = require('./user.json');
let utility = require("../utilities");
const messages = require('./message');

/**
 * GET USER PROFILE
 * @param CLIENT
 * @param req
 * @param res
 * @param user_id
 * @param callback
 */
// module.exports.getUserProfile = function (CLIENT, req, res, user_id, callback) {
//     let CONNECTION = CLIENT.db(utility.dbName);
//     let userCollection = CONNECTION.collection(USER_MODEL.collection_name);
//     // Own Profile
//     if (user_id === req.authorization.user_id) {
//         userCollection.aggregate([
//             {
//                 $match: {
//                     user_id: user_id
//                 }
//             },
//             {
//                 $project: {
//                     password: 0,
//                     verification_token: 0,
//                     verification_otp: 0
//                 }
//             },
//             {
//                 $lookup: {
//                     from: "user",
//                     let: {
//                         userIds: { $cond: [{ $isArray: ["$following_ids"] }, "$following_ids", []] }
//                     },
//                     pipeline: [
//                         {
//                             $match: {
//                                 $expr: {
//                                     $in: ["$user_id", "$$userIds"]
//                                 }
//                             }
//                         },
//                         {
//                             $match: {
//                                 status: 'active'
//                             }
//                         },
//                         {
//                             $project: {
//                                 "first_name": 1,
//                                 "last_name": 1,
//                                 "user_id": 1,
//                                 "profile_image_url": 1,
//                                 "_id": 0,
//                                 "follower_ids": 1
//                             }
//                         }
//                     ],
//                     as: "followings_list"
//                 }
//             },
//             {
//                 $lookup: {
//                     from: "user",
//                     let: {
//                         userIds: { $cond: [{ $isArray: ["$follower_ids"] }, "$follower_ids", []] }
//                     },
//                     pipeline: [
//                         {
//                             $match: {
//                                 $expr: {
//                                     $in: ["$user_id", "$$userIds"]
//                                 }
//                             }
//                         },
//                         {
//                             $match: {
//                                 status: 'active'
//                             }
//                         },
//                         {
//                             $project: {
//                                 "first_name": 1,
//                                 "last_name": 1,
//                                 "user_id": 1,
//                                 "profile_image_url": 1,
//                                 "_id": 0,
//                                 "follower_ids": 1
//                             }
//                         }
//                     ],
//                     as: "followers_list"
//                 }
//             }
//         ]).toArray((err, userDataArr) => {
//             let finalOutput = {};
//             finalOutput.status = true;
//             finalOutput.data = userDataArr[0];
//             // Online Offline Friends
//             // if (finalOutput.data.friends_list) {
//             //     finalOutput.data.friends_list.forEach(friend => {
//             //         if (friend.last_active) {
//             //             let minutesDifference = moment().diff(friend.last_active, 'minutes');
//             //             if (minutesDifference === 0) {
//             //                 friend.online_status = true;
//             //             } else {
//             //                 friend.online_status = false;
//             //             }
//             //         } else {
//             //             friend.online_status = false;
//             //         }
//             //     });
//             // }
//             messages.getMessagesList(CLIENT, req, res, (err, chatList) => {
//                 finalOutput.data.friends_list = chatList.data;
//                 // Profile Strength
//                 let totalSize = Object.keys(USER_MODEL.properties).length;
//                 let profileSize = 0;
//                 Object.keys(USER_MODEL.properties).forEach(key => {
//                     if (userDataArr[0][key]) {
//                         profileSize++;
//                     }
//                 });
//                 finalOutput.data.profile_strength = Math.round((profileSize / (totalSize * 2)) * 100) || 0;
//                 callback(err, finalOutput);
//             });
//         })
//     } else {
//         // Other Profile
//         userCollection.find({
//             user_id: { $in: [user_id, req.authorization.user_id] },
//             status: 'active'
//         }, { projection: { password: 0, verification_token: 0 } }).toArray((err, userDetailsArr) => {
//             if (err) {
//                 callback(err);
//             } else {
//                 if (userDetailsArr.length === 2) {
//                     // Valid Other Profile
//                     let currentUserProfile = {};
//                     let otherUserProfile = {};
//                     userDetailsArr.forEach(elem => {
//                         if (elem.user_id === user_id) {
//                             otherUserProfile = elem;
//                         } else {
//                             currentUserProfile = elem;
//                         }
//                     });
//                     let mutualFriendsIds = utility.getMutualFriendIds(currentUserProfile, otherUserProfile);
//                     let isMyFriend = utility.checkFriend(otherUserProfile.user_id, currentUserProfile);
//                     let isFollowing = false;
//                     if (currentUserProfile && currentUserProfile.following_ids && currentUserProfile.following_ids.indexOf(user_id) !== -1) {
//                         isFollowing = true;
//                     }
//                     otherUserProfile.mutual_friends = [];
//                     otherUserProfile.is_my_friend = isFollowing;
//                     // Check if there is a Follow Request
//                     const followRequestCollection = CONNECTION.collection(FRIEND_REQUEST_MODEL.collection_name);
//                     followRequestCollection.find({
//                         $or: [{
//                             requested_to: user_id,
//                             requested_by: req.authorization.user_id
//                         }, { requested_to: req.authorization.user_id, requested_by: user_id }]
//                     }).toArray((err, requests) => {
//                         let haveRequestFromMe = false;
//                         let haveRequestFromHim = false;
//                         if (requests && requests.length > 0) {
//                             requests.forEach(request => {
//                                 if (request.requested_by === user_id) {
//                                     haveRequestFromHim = true;
//                                 } else {
//                                     haveRequestFromMe = true;
//                                 }
//                             });
//                         }
//                         let requestButton = null;
//                         let followingButton = {};
//                         otherUserProfile.blocked_by_me = Array.isArray(currentUserProfile.blocked_ids) && currentUserProfile.blocked_ids.includes(otherUserProfile.user_id);
//                         const blockButton = {};
//                         if (isFollowing) {
//                             followingButton.button_text = 'Unfollow';
//                             followingButton.button_link = '/profile/' + user_id + '/cancel-follow';
//                             followingButton.button_type = 'removefriend';
//                             if (isMyFriend) {
//                                 requestButton = {};
//                                 requestButton.button_text = 'Remove Role Model';
//                                 requestButton.button_link = '/profile/' + user_id + '/cancel-friend';
//                                 requestButton.button_type = 'removefriend';
//                             } else {
//                                 requestButton = {};
//                                 requestButton.button_text = 'Role Model';
//                                 requestButton.button_link = '/profile/' + user_id + '/add-friend';
//                                 requestButton.button_type = 'addfriend';
//                             }
//                         } else {
//                             followingButton.button_text = 'Follow';
//                             followingButton.button_link = '/profile/' + user_id + '/follow';
//                             followingButton.button_type = 'addfriend';
//                             if (haveRequestFromMe) {
//                                 followingButton.button_text = 'Follow Requested';
//                                 followingButton.button_link = '#';
//                                 followingButton.button_type = 'addfriend';
//                             }
//                         }
//                         otherUserProfile.request_buttons = [followingButton];
//                         if (requestButton) {
//                             otherUserProfile.request_buttons.push(requestButton);
//                         }
//                         if (haveRequestFromHim) {
//                             otherUserProfile.request_buttons.push({
//                                 button_text: 'Accept Follow Request',
//                                 button_link: '/profile/' + user_id + '/confirm-follow',
//                                 button_type: 'addfriend'
//                             });
//                             otherUserProfile.request_buttons.push({
//                                 button_text: 'Reject Follow Request',
//                                 button_link: '/profile/' + user_id + '/cancel-follow-request',
//                                 button_type: 'removefriend'
//                             });
//                         }
//                         if (otherUserProfile.blocked_by_me) {
//                             blockButton.button_text = 'Unblock';
//                             blockButton.button_link = '/profile/' + user_id + '/unblock';
//                             blockButton.button_type = 'addfriend';
//                             otherUserProfile.request_buttons = [blockButton];
//                         } else {
//                             blockButton.button_text = 'Block User';
//                             blockButton.button_link = '/profile/' + user_id + '/block';
//                             blockButton.button_type = 'removefriend';
//                             otherUserProfile.request_buttons.push(blockButton);
//                         }
//                         // Get Friend List, Following List and Followers List
//                         userCollection.aggregate([
//                             {
//                                 $match: {
//                                     user_id: user_id
//                                 }
//                             },
//                             {
//                                 $lookup: {
//                                     from: "user",
//                                     let: {
//                                         userIds: { $cond: [{ $isArray: ["$friend_ids"] }, "$friend_ids", []] }
//                                     },
//                                     pipeline: [
//                                         {
//                                             $match: {
//                                                 $expr: {
//                                                     $in: ["$user_id", "$$userIds"]
//                                                 }
//                                             }
//                                         },
//                                         {
//                                             $match: {
//                                                 status: 'active'
//                                             }
//                                         },
//                                         {
//                                             $project: {
//                                                 "first_name": 1,
//                                                 "last_name": 1,
//                                                 "user_id": 1,
//                                                 "profile_image_url": 1,
//                                                 "_id": 0,
//                                                 "follower_ids": 1
//                                             }
//                                         }
//                                     ],
//                                     as: "friends_list"
//                                 }
//                             },
//                             {
//                                 $lookup: {
//                                     from: "user",
//                                     let: {
//                                         userIds: { $cond: [{ $isArray: ["$following_ids"] }, "$following_ids", []] }
//                                     },
//                                     pipeline: [
//                                         {
//                                             $match: {
//                                                 $expr: {
//                                                     $in: ["$user_id", "$$userIds"]
//                                                 }
//                                             }
//                                         },
//                                         {
//                                             $match: {
//                                                 status: 'active'
//                                             }
//                                         },
//                                         {
//                                             $project: {
//                                                 "first_name": 1,
//                                                 "last_name": 1,
//                                                 "user_id": 1,
//                                                 "profile_image_url": 1,
//                                                 "_id": 0,
//                                                 "follower_ids": 1
//                                             }
//                                         }
//                                     ],
//                                     as: "followings_list"
//                                 }
//                             },
//                             {
//                                 $lookup: {
//                                     from: "user",
//                                     let: {
//                                         userIds: { $cond: [{ $isArray: ["$follower_ids"] }, "$follower_ids", []] }
//                                     },
//                                     pipeline: [
//                                         {
//                                             $match: {
//                                                 $expr: {
//                                                     $in: ["$user_id", "$$userIds"]
//                                                 }
//                                             }
//                                         },
//                                         {
//                                             $match: {
//                                                 status: 'active'
//                                             }
//                                         },
//                                         {
//                                             $project: {
//                                                 "first_name": 1,
//                                                 "last_name": 1,
//                                                 "user_id": 1,
//                                                 "profile_image_url": 1,
//                                                 "_id": 0,
//                                                 "follower_ids": 1
//                                             }
//                                         }
//                                     ],
//                                     as: "followers_list"
//                                 }
//                             }
//                         ]).toArray((err, extraFriendFollowingDetails) => {
//                             if (err) {
//                                 callback(err);
//                                 return;
//                             }
//                             otherUserProfile.friends_list = extraFriendFollowingDetails[0].friends_list || [];
//                             otherUserProfile.followings_list = extraFriendFollowingDetails[0].followings_list || [];
//                             otherUserProfile.followers_list = extraFriendFollowingDetails[0].followers_list || [];
//                             let finalOutput = {};
//                             finalOutput.status = true;
//                             finalOutput.data = otherUserProfile;
//                             callback(null, finalOutput);
//                         });
//                     });
//                 } else {
//                     let error = new Error('Invalid Profile');
//                     error.name = 'NOT_FOUND_ERROR';
//                     callback(error);
//                 }
//             }
//         });
//     }
// };
module.exports.getUserProfile = function (CLIENT, req, res, user_id, callback) {
    let CONNECTION = CLIENT.db(utility.dbName);
    let userCollection = CONNECTION.collection(USER_MODEL.collection_name);
    let postCollection = CONNECTION.collection(POST_MODEL.collection_name);
    // Own Profile
    if (user_id === req.authorization.user_id) {
        userCollection.aggregate([
            {
                $match: {
                    user_id: user_id
                }
            },
            {
                $project: {
                    password: 0,
                    verification_token: 0,
                    verification_otp: 0
                }
            },
            {
                $lookup: {
                    from: "user",
                    let: {
                        userIds: { $cond: [{ $isArray: ["$following_ids"] }, "$following_ids", []] }
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $in: ["$user_id", "$$userIds"]
                                }
                            }
                        },
                        {
                            $match: {
                                status: 'active'
                            }
                        },
                        {
                            $project: {
                                "first_name": 1,
                                "last_name": 1,
                                "user_id": 1,
                                "profile_image_url": 1,
                                "_id": 0,
                                "follower_ids": 1
                            }
                        }
                    ],
                    as: "followings_list"
                }
            },
            {
                $lookup: {
                    from: "user",
                    let: {
                        userIds: { $cond: [{ $isArray: ["$follower_ids"] }, "$follower_ids", []] }
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $in: ["$user_id", "$$userIds"]
                                }
                            }
                        },
                        {
                            $match: {
                                status: 'active'
                            }
                        },
                        {
                            $project: {
                                "first_name": 1,
                                "last_name": 1,
                                "user_id": 1,
                                "profile_image_url": 1,
                                "_id": 0,
                                "follower_ids": 1
                            }
                        }
                    ],
                    as: "followers_list"
                }
            }
        ]).toArray((err, userDataArr) => {
            let finalOutput = {};
            finalOutput.status = true;
            finalOutput.data = userDataArr[0];
            // Online Offline Friends
            // if (finalOutput.data.friends_list) {
            //     finalOutput.data.friends_list.forEach(friend => {
            //         if (friend.last_active) {
            //             let minutesDifference = moment().diff(friend.last_active, 'minutes');
            //             if (minutesDifference === 0) {
            //                 friend.online_status = true;
            //             } else {
            //                 friend.online_status = false;
            //             }
            //         } else {
            //             friend.online_status = false;
            //         }
            //     });
            // }
            messages.getMessagesList(CLIENT, req, res, (err, chatList) => {
                finalOutput.data.friends_list = chatList.data;
                //                 // Profile Strength
                //                 let totalSize = Object.keys(USER_MODEL.properties).length;
                //                 let profileSize = 0;
                //                 Object.keys(USER_MODEL.properties).forEach(key => {
                //                     if (userDataArr[0][key]) {
                //                         profileSize++;
                //                     }
                //                 });
                //                 finalOutput.data.profile_strength = Math.round((profileSize / (totalSize * 2)) * 100) || 0;
                //                 new logic for profile strength :)
                // Profile Strength
                let arr = [
                    "user_id", "first_name", "last_name", "facebook_id", "google_id", "email", "date_of_birth", "gender", "contact_number", "about", "state", "nationality", "religion", "profile_image_url", "cover_image_url", "sports_interests", "politics_interest", "career_interest", "introduced", "status", "profile_title", "mostpopularpostseen", "register_device_detail"
                ];
                let totalSize = arr.length;
                console.log({ totalSize });

                let profileSize = 0;
                let i = 0;
                arr.forEach((key) => {
                    if (userDataArr[0][key]) {
                        profileSize++;
                    } else {
                        console.log({ key, val: userDataArr[0][key], i });
                        i++;
                    }
                });
                finalOutput.data.profile_strength =
                    Math.round((profileSize / totalSize) * 100) || 0;


                delete finalOutput.data.two_fa_secret;
                postCollection.aggregate([
                    {
                        $match: {
                            posted_by: user_id
                        }
                    },
                    { $group: { _id: null, sum: { $sum: "$like_count" } } }
                ]).toArray((err, postResult) => {
                    if (postResult[0]) {
                        finalOutput.data.totalPostLikes = postResult[0].sum;
                    } else {
                        finalOutput.data.totalPostLikes = 0;
                    }

                    /** Check for user_name */
                    if (!finalOutput.data.user_name) {
                        finalOutput.data.user_name = "";
                    }
                    /** Check for profile_title */
                    if (!finalOutput.data.profile_title) {
                        finalOutput.data.profile_title = "";
                    }
                    // Encrypt response
                    // const cipherUserDetails = CyptoJs.AES.encrypt(JSON.stringify(finalOutput.data), process.env.CRYPTO_SECRET).toString();
                    // finalOutput.data = cipherUserDetails;
                    callback(err, finalOutput);
                });
            });


        });
    } else {
        // Other Profile
        userCollection.find({
            user_id: { $in: [user_id, req.authorization.user_id] },
            status: 'active'
        }, { projection: { password: 0, verification_token: 0, two_fa_secret: 0 } }).toArray((err, userDetailsArr) => {
            if (err) {
                callback(err);
            } else {
                if (userDetailsArr.length === 2) {
                    // Valid Other Profile
                    let currentUserProfile = {};
                    let otherUserProfile = {};
                    userDetailsArr.forEach(elem => {
                        if (elem.user_id === user_id) {
                            otherUserProfile = elem;
                        } else {
                            currentUserProfile = elem;
                        }
                    });

                    let mutualFriendsIds = utility.getMutualFriendIds(currentUserProfile, otherUserProfile);
                    let isMyFriend = utility.checkFriend(otherUserProfile.user_id, currentUserProfile);
                    let isFollowing = false;
                    if (currentUserProfile && currentUserProfile.following_ids && currentUserProfile.following_ids.indexOf(user_id) !== -1) {
                        isFollowing = true;
                    }

                    otherUserProfile.mutual_friends = [];
                    otherUserProfile.is_my_friend = isFollowing;


                    // Check if there is a Follow Request
                    const followRequestCollection = CONNECTION.collection(FRIEND_REQUEST_MODEL.collection_name);
                    followRequestCollection.find({
                        $or: [{
                            requested_to: user_id,
                            requested_by: req.authorization.user_id
                        }, { requested_to: req.authorization.user_id, requested_by: user_id }]
                    }).toArray((err, requests) => {
                        let haveRequestFromMe = false;
                        let haveRequestFromHim = false;
                        if (requests && requests.length > 0) {
                            requests.forEach(request => {
                                if (request.requested_by === user_id) {
                                    haveRequestFromHim = true;
                                } else {
                                    haveRequestFromMe = true;
                                }
                            });
                        }


                        let requestButton = null;
                        let followingButton = {};

                        otherUserProfile.blocked_by_me = Array.isArray(currentUserProfile.blocked_ids) && currentUserProfile.blocked_ids.includes(otherUserProfile.user_id);

                        const blockButton = {};
                        if (isFollowing) {
                            followingButton.button_text = 'Unfollow';
                            followingButton.button_link = '/profile/' + user_id + '/cancel-follow';
                            followingButton.button_type = 'removefriend';

                            if (isMyFriend) {
                                requestButton = {};
                                requestButton.button_text = 'Remove Role Model';
                                requestButton.button_link = '/profile/' + user_id + '/cancel-friend';
                                requestButton.button_type = 'removefriend';
                            } else {
                                requestButton = {};
                                requestButton.button_text = 'Role Model';
                                requestButton.button_link = '/profile/' + user_id + '/add-friend';
                                requestButton.button_type = 'addfriend';
                            }
                        } else {
                            followingButton.button_text = 'Follow';
                            followingButton.button_link = '/profile/' + user_id + '/follow';
                            followingButton.button_type = 'addfriend';

                            if (haveRequestFromMe) {
                                followingButton.button_text = 'Follow Requested';
                                followingButton.button_link = '#';
                                followingButton.button_type = 'addfriend';
                            }
                        }


                        otherUserProfile.request_buttons = [followingButton];
                        if (requestButton) {
                            otherUserProfile.request_buttons.push(requestButton);
                        }

                        if (haveRequestFromHim) {
                            otherUserProfile.request_buttons.push({
                                button_text: 'Accept Follow Request',
                                button_link: '/profile/' + user_id + '/confirm-follow',
                                button_type: 'addfriend'
                            });

                            otherUserProfile.request_buttons.push({
                                button_text: 'Reject Follow Request',
                                button_link: '/profile/' + user_id + '/cancel-follow-request',
                                button_type: 'removefriend'
                            });
                        }

                        if (otherUserProfile.blocked_by_me) {
                            blockButton.button_text = 'Unblock';
                            blockButton.button_link = '/profile/' + user_id + '/unblock';
                            blockButton.button_type = 'addfriend';
                            otherUserProfile.request_buttons = [blockButton];
                        } else {
                            blockButton.button_text = 'Block User';
                            blockButton.button_link = '/profile/' + user_id + '/block';
                            blockButton.button_type = 'removefriend';
                            otherUserProfile.request_buttons.push(blockButton);
                        }

                        // Get Friend List, Following List and Followers List
                        userCollection.aggregate([
                            {
                                $match: {
                                    user_id: user_id
                                }
                            },
                            {
                                $lookup: {
                                    from: "user",
                                    let: {
                                        userIds: { $cond: [{ $isArray: ["$friend_ids"] }, "$friend_ids", []] }
                                    },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $in: ["$user_id", "$$userIds"]
                                                }
                                            }
                                        },
                                        {
                                            $match: {
                                                status: 'active'
                                            }
                                        },
                                        {
                                            $project: {
                                                "first_name": 1,
                                                "last_name": 1,
                                                "user_id": 1,
                                                "profile_image_url": 1,
                                                "_id": 0,
                                                "follower_ids": 1
                                            }
                                        }
                                    ],
                                    as: "friends_list"
                                }
                            },
                            {
                                $lookup: {
                                    from: "user",
                                    let: {
                                        userIds: { $cond: [{ $isArray: ["$following_ids"] }, "$following_ids", []] }
                                    },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $in: ["$user_id", "$$userIds"]
                                                }
                                            }
                                        },
                                        {
                                            $match: {
                                                status: 'active'
                                            }
                                        },
                                        {
                                            $project: {
                                                "first_name": 1,
                                                "last_name": 1,
                                                "user_id": 1,
                                                "profile_image_url": 1,
                                                "_id": 0,
                                                "follower_ids": 1
                                            }
                                        }
                                    ],
                                    as: "followings_list"
                                }
                            },
                            {
                                $lookup: {
                                    from: "user",
                                    let: {
                                        userIds: { $cond: [{ $isArray: ["$follower_ids"] }, "$follower_ids", []] }
                                    },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $in: ["$user_id", "$$userIds"]
                                                }
                                            }
                                        },
                                        {
                                            $match: {
                                                status: 'active'
                                            }
                                        },
                                        {
                                            $project: {
                                                "first_name": 1,
                                                "last_name": 1,
                                                "user_id": 1,
                                                "profile_image_url": 1,
                                                "_id": 0,
                                                "follower_ids": 1
                                            }
                                        }
                                    ],
                                    as: "followers_list"
                                }
                            }
                        ]).toArray((err, extraFriendFollowingDetails) => {
                            if (err) {
                                callback(err);
                                return;
                            }

                            otherUserProfile.friends_list = extraFriendFollowingDetails[0].friends_list || [];
                            otherUserProfile.followings_list = extraFriendFollowingDetails[0].followings_list || [];
                            otherUserProfile.followers_list = extraFriendFollowingDetails[0].followers_list || [];

                            postCollection.aggregate([
                                {
                                    $match: {
                                        posted_by: user_id
                                    }
                                },
                                { $group: { _id: null, sum: { $sum: "$like_count" } } }
                            ]).toArray((err, postResult) => {
                                if (postResult[0]) {
                                    otherUserProfile.totalPostLikes = postResult[0].sum;
                                } else {
                                    otherUserProfile.totalPostLikes = 0;
                                }

                                /** Check for user_name */
                                if (!otherUserProfile.user_name) {
                                    otherUserProfile.user_name = "";
                                }
                                /** Check for profile_title */
                                if (!otherUserProfile.profile_title) {
                                    otherUserProfile.profile_title = "";
                                }
                                let finalOutput = {};
                                finalOutput.status = true;
                                // encrypt response
                                // const cipherUserDetails = CyptoJs.AES.encrypt(JSON.stringify(otherUserProfile), process.env.CRYPTO_SECRET).toString();
                                // finalOutput.data = cipherUserDetails;
                                finalOutput.data = otherUserProfile;
                                callback(null, finalOutput);
                            });

                            // let finalOutput = {};
                            // finalOutput.status = true;
                            // finalOutput.data = otherUserProfile;
                            // ecnrypt response
                            // const cipherUserDetails = CyptoJs.AES.encrypt(JSON.stringify(otherUserProfile), process.env.CRYPTO_SECRET).toString();
                            // finalOutput.data = cipherUserDetails;
                            // callback(null, finalOutput);
                        });

                    });
                } else {
                    let error = new Error('Invalid Profile');
                    error.name = 'NOT_FOUND_ERROR';
                    callback(error);
                }
            }
        });
    }

};
