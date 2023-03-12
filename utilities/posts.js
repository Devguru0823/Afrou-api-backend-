'use strict';
const USER_MODEL = require('../models/user.json');

/**
 *
 * @param {number} monthNum
 * @returns
 */
const get4MonthsBack = (monthNum) => {
	let month;
	switch (monthNum) {
		case 3:
			month = 11;
			break;

		case 2:
			month = 10;
			break;

		case 1:
			month = 9;
			break;

		case 0:
			month = 8;
			break;

		default:
			month = null;
			break;
	}
	return month;
};

/**
 *
 * @param {String} postDate
 * @returns
 */
const calculateFourMonthsBack = () => {
	const today = new Date();
	const day = today.getDate();
	const month = today.getMonth();
	const year = today.getFullYear();
	if (month <= 3) {
		// 4 months ago will be previous year
		const fourMonthBack = get4MonthsBack(month);
		const fourMonthBackDate = new Date(
			`${year - 1}-${fourMonthBack + 1}-${day}`
		);
		return fourMonthBackDate;
	}
	const fourMonthBack = month - 4;
	const fourMonthBackDate = new Date(
		`${year - 1}-0${fourMonthBack + 1}-${day}`
	);
	return fourMonthBackDate;
};

module.exports.getPostsConditions = function (CONNECTION, req, section, cb) {
	const loggedInUserId = req.authorization.user_id;
	// console.log(loggedInUserId)
	let userCollection = CONNECTION.collection(USER_MODEL.collection_name);

	if (section === 'afrotalent' || section === 'afroswagger') {
		userCollection
			.aggregate([
				{
					$match: {
						user_id: loggedInUserId,
					},
				},
				// {
				//   $lookup: {
				//     from: USER_MODEL.collection_name,
				//     localField: "following_ids",
				//     foreignField: "user_id",
				//     as: "friends"
				//   }
				// },
				// {
				//   $unwind:
				//     {
				//       path: "$friends",
				//       preserveNullAndEmptyArrays: true
				//     }
				// },
				// {
				//   $match: {
				//     "friends.status": 'active'
				//   }
				// },
				// {
				//   $group: {
				//     _id: "$_id",
				//     friend_ids: {$push: "$friends.user_id"},
				//     hidden_posts: {$first: "$hidden_posts"},
				//     sports_interests: {$first: '$sports_interests'}
				//   }
				// }
			])
			.toArray(function (err, userData) {
				if (err) {
					cb(err);
					return;
				}
				let userIdsForPosts = [];
				let hiddenPosts = [];
				if (
					userData[0] &&
					userData[0].following_ids &&
					Array.isArray(userData[0].following_ids)
				) {
					// console.log("userData==>",userData)
					// console.log("userData==>>>>>>>", userData[0].following_ids)
					userIdsForPosts = userData[0].following_ids;
					if (Array.isArray(userData[0].hidden_posts)) {
						hiddenPosts = [...userData[0].hidden_posts];
					}
				}
				userIdsForPosts.push(loggedInUserId);
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
											$in: userData[0].sports_interests || [],
										},
									},
									{ state: userData[0].state },
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
						// console.log("????????????condition for Afroswagger otherUsers ?????", otherUsers);
						// console.log("????????????condition for Afroswagger userData[0].sports_interests ?????", userData[0].sports_interests);
						userIdsForPosts.push(...otherUsers.map((x) => x.user_id));
						const blockedList = userData[0].blocked_ids
							? userData[0].blocked_ids
							: [];



						const fs = require("fs")
						fs.writeFile("conditions.json",JSON.stringify({userIdsForPosts,blockedList,otherUsers},),function(err){console.log(err)})
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
