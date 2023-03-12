const USER_MODEL = require("../models/user.json")
const getPostsConditions2 = function (CONNECTION, req, section, cb) {
    const loggedInUserId = req.authorization.user_id;
    // console.log(loggedInUserId)
    let userCollection = CONNECTION.collection(USER_MODEL.collection_name);

    if (section === 'afrotalent' || section === 'afroswagger') {
        userCollection.findOne({ user_id: loggedInUserId }, function (err, user) {
            if (err) return cb(err);
            if (user) return cb("user not found")
            let userIdsForPosts = user.following_ids ?? [loggedInUserId]
            // userIdsForPosts.push(loggedInUserId);
            const blockedList = user.blocked_ids ?? [];
            let hiddenPosts = user.hidden_posts ?? [];
            // })


            userCollection
                .aggregate([
                    {
                        $match: {
                            user_id: { $nin: userIdsForPosts },
                            status: 'active',
                            // following_ids:{$in :[loggedInUserId]}
                        },
                    },
                    {
                        $unwind: {
                            path: '$sports_interests',
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                    {
                        $match: {
                            $or: [
                                {
                                    sports_interests: {
                                        $in: user.sports_interests || [],
                                    },
                                },
                                { state: user.state },
                            ],
                        },
                    },
                    {
                        $group: {
                            _id: '$user_id',
                            user_id: { $first: '$user_id' },
                        },
                    },
                ])
                .toArray((err, otherUsers) => {





                    const fs = require("fs")
                    fs.writeFile("conditions.json", JSON.stringify({ userIdsForPosts, blockedList, otherUsers },), function (err) { console.log(err) })
                    let condition = {
                        $and: [
                            { post_status: 'active' },
                            { posted_for: section },
                            { posted_by: { $nin: blockedList } },
                            {
                                $or: [
                                    { posted_by: { $in: userIdsForPosts } },
                                    { post_privacy: 'public' },
                                ],
                            },
                            { post_id: { $nin: hiddenPosts } },
                            {
                                post_date: {
                                    $lte: new Date(),
                                    $gte: calculateFourMonthsBack(),
                                },
                            },
                        ],
                    };
                    // console.log("????????????condition for Afroswagger condition ?????", condition.$and);
                    cb(null, condition);
                });
        });
    } else if (section === 'profile') {
        let condition = {
            $and: [{ post_status: 'active' }, { posted_by: loggedInUserId }],
        };
        cb(null, condition);
    } else {
        let error = new Error('Unknown');
        cb(error);
    }
};

const getPostsConditions = function (CONNECTION, req, section, cb) {
    const loggedInUserId = req.authorization.user_id;

    let userCollection = CONNECTION.collection(USER_MODEL.collection_name);

    if (section === 'afrotalent' || section === 'afroswagger') { }
}

module.exports = getPostsConditions