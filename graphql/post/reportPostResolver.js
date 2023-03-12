const { isAuthenticated } = require("../helpers/authentication");

const { AuthenticationError, ApolloError } = require("apollo-server-express");
const {reportPostByPostId} = require("./reportPostModel")
const resolvers = {
    reportPost: async (parent, args, context) => {
    let auth = isAuthenticated(context);
    if (auth) {
      try {
        return await reportPostByPostId(args, context);
      } catch (error) {
        throw new ApolloError(error.message || error);
      }
    } else {
      throw new AuthenticationError();
    }
  },
};

module.exports = resolvers;
