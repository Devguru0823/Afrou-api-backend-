const { isAuthenticated } = require("../helpers/authentication");
const {getMessagesByUserId}= require("./getMessagesByUserId")
const { AuthenticationError, ApolloError } = require("apollo-server-express");

const resolvers = {
    getUserMessages: async (parent, args, context) => {
    let auth = isAuthenticated(context);
    if (auth) {
      try {
        let data = await getMessagesByUserId(args, context);
        console.log(data[0].liked_by)
        return  data
        // return data;
        
      } catch (error) {
        throw new ApolloError(error.message || error);
      }
    } else {
      throw new AuthenticationError();
    }
  },
};

module.exports = resolvers;
