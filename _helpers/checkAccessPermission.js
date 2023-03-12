const messageModel = require('../models/message.json');
const utility = require('../utilities');

module.exports.checkAccessPermission = (req, res, next) => {
  const { user_id } = req.authorization;
  const { message_id, like_type } = req.body;
  if (!message_id || !like_type) {
    return res.status(400).json({
      status: false,
      error: 'missing request body'
    });
  }

  // open connection to mongodb
  utility.mongoConnect(req, res, async (client) => {
    const db = client.db(utility.dbName);
    if (like_type === 'message') {
      const messageCollection = db.collection(messageModel.collection_name);
      const messageExist = await messageCollection.findOne({
        $or: [
          { to_id: user_id },
          { from_id: user_id }
        ]
      });
      client.close();
      if (!messageExist) {
        return res.status(401).json({
          status: false,
          error: 'you don\'t have permission to do that'
        });
      }
    }
    next();
  });
}