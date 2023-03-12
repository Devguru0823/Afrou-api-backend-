var express = require('express');
var router = express.Router();
const PostModel = require('../../models/v2/post.json');
var utility = require('../../utilities');
const UserModel = require('../../models/v2/user.json');

/**
 * 
 * @param {number} timestamp 
 * @returns 
 */
const getTimeAgo = (timestamp) => {
  // convert timestamp to date
  const postDate = new Date(timestamp);
  // get the timeago string
  const timeago = format(postDate);
  // allowed timeago
  const allowedTimes = ['just now', 'minute', 'minutes', 'hour', 'hours', 'day', 'days', 'week', 'weeks', 'month', 'months'];
  // Get the time suffix
  const time = timeago.split(' ')[1];
  let allowedTime = null;
  for (let x of allowedTimes) {
    if (x === time) {
      allowedTime = time;
      break;
    }
  }
  if (!allowedTime) {
    return 'post expired';
  }
  if (allowedTime === 'months') {
    // convert month length to number
    const monthNum = Number.parseInt(timeago.split(' ')[0]);
    if (monthNum > 4) {
      return 'post expired';
    }
    return timeago;
  }
  return timeago;
};

/**
 * 
 * @param {Array} array 
 * @returns 
 */
function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]
    ];
  }

  return array;
}

router.route('/get-posts').get(async (req, res) => {
  utility.mongoConnect(req, res, async function (CLIENT) {
    let CONNECTION = CLIENT.db(utility.dbName);
    console.log(CONNECTION);
    let Post = CONNECTION.collection(PostModel.collection_name);
    let User = CONNECTION.collection(UserModel.collection_name);
    const user_id = req.authorization.user_id;
    console.log("user_id: ", user_id);
    try {
      // Find user
      const user = await User.findOne({
        user_id
      });
      if (!user_id) {
        return res.status(400).json({
          status: false,
          error: 'missing user id'
        });
      }
      console.log(user);
      // Create empty array to hold the timeline posts
      const timelinePosts = [];

      // for (let interest of user.sports_interests) {
      //   console.log("interest: ", interest);
      //   const interest_posts = await Post.find({
      //     tags: interest
      //   });
      //   // console.log("interest_posts: ", interest_posts);
      //   if(interest_posts) {
      //     for (let post of interest_posts) {
      //       const postInTimeline = timelinePosts.find((x) => x.post_id === post.post_id);
      //       if (!postInTimeline) {
      //         const timeago = getTimeAgo(post.timestamp);
      //         // post longer than four months
      //         if (timeago && timeago === 'post expired') {
      //           continue;
      //         }
      //         if (timeago && timeago != 'post expired') { // post is within four months
      //           // check if the post has been seen by user
      //           const postHasBeenSeen = await Seen.findOne({
      //             post_id: post._id,
      //             seen_by: user._id
      //           });
      //           // get the likes and comment and check if the length is greater than or equal 10
      //           const postLikes = await Like.find({
      //             post_id: post._id
      //           });
      //           const postComments = await Comment.find({
      //             post_id: post._id
      //           });
      //           console.log('post performance: ', postLikes.length + postComments.length);
      //           const postPerformance = postLikes.length + postComments.length;
      //           if (!postHasBeenSeen && postPerformance >= 50) {
      //             // push post to timeline array
      //             console.log('post meets timeline criteria');
      //             timelinePosts.push(post);
      //           }
      //         }
      //       }
      //       continue;
      //     }
      //   }
      // }
      // find all user's followers
      // const followings = await Following.find({
      //   followed_by: user._id
      // });

      for (let following of user.following_ids) { // iterate through the user's following array
        // find the posts of each follower
        // const following_posts = await Post.find({
        //   posted_by: following //.followed_user
        // }); //.populate('posted_by');
        // for (let post of following_posts) { // iterate through each followers posts
        //   // check how long the post has been created
        //   const timeago = getTimeAgo(post.timestamp);
        //   // post longer than four months
        //   if (timeago && timeago === 'post expired') {
        //     continue;
        //   }
        //   if (timeago && timeago != 'post expired') { // post is within four months
        //     // check if the post has been seen by user
        //     const postHasBeenSeen = await Seen.findOne({
        //       post_id: post._id,
        //       seen_by: user._id
        //     });
        //     if(!postHasBeenSeen) {
        //       const postInTimeLine = timelinePosts.find((x) => x.post_id === post.post_id);
        //       if(!postInTimeLine) {
        //         timelinePosts.push(post);
        //       }
        //     }
        //   }
        // }
      }

      // randomize timeline array
      const randomTimelinePosts = shuffle(timelinePosts);
      // send randomaized array to user
      return res.status(200).json({
        status: true,
        data: {
          posts: randomTimelinePosts
        }
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        status: false,
        error: 'an error occured'
      });
    }

    // res.json({ data: "true" });
  });
});

module.exports = router;