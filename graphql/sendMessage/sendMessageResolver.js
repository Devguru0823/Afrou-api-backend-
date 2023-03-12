const { isAuthenticated } = require("../helpers/authentication");
const { AuthenticationError, ApolloError } = require("apollo-server-express");
const {addMessage} = require("./sendMessageModel")
const {replyMessage}= require("./replyMessageModel")
const resolvers = {
    sendMessage: async (parent, args, context) => {
    let auth = isAuthenticated(context);
    if (auth) {
      try {

                    if(args.message.message_id)     {
                      console.log("reply")
                      return await replyMessage(args,context)
                    }else{
                      console.log("non reply")
                      return await addMessage(args,context);
                    }
//         let data = await addMessage(args,context);
// console.log(data)
        return data;
      } catch (error) {
        throw new ApolloError(error.message || error);
      }
    } else {
      throw new AuthenticationError();
    }
  },
};

module.exports = resolvers;
