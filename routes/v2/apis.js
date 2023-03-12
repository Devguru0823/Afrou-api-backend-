var express = require('express');
var router = express.Router();
var utilities = require('../../utilitie');

function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;
  while (0 !== currentIndex) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]
    ];
  }
  return array;
}

router.route('/get-posts').get(async (req, res) => {
  utilities.MysqlConnect(req, res, async function (CLIENT) {
    const user_id = req.authorization.user_id;
    try {
      if (!user_id) {
        return res.status(400).json({ status: false, error: 'missing user id' });
      }
      const timelinePosts = [];
      const randomTimelinePosts = shuffle(timelinePosts);
      return res.status(200).json({ status: true, data: { posts: randomTimelinePosts } });
    } catch (error) {
      return res.status(500).json({ status: false, error: 'an error occured' });
    }
  });
});

module.exports = router;