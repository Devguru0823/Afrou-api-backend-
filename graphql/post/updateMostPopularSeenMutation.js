const { isAuthenticated } = require("../helpers/authentication");
const {updateMostPopularSeen}= require("./updateMostPopularSeenModel")
const { AuthenticationError, ApolloError } = require("apollo-server-express");
const resolvers = {
    updateMostPopularSeen: async (parent, args, context) => {
    let auth = isAuthenticated(context);
    if (auth) {
      try {
        let data = await updateMostPopularSeen(args, context);
        console.log(data);
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
