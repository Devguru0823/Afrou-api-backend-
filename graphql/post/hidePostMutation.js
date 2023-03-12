const { isAuthenticated } = require("../helpers/authentication");

const { AuthenticationError, ApolloError } = require("apollo-server-express");
const {hidePostByPostId}  = require("./hidePostModel")
const resolvers = {
  hidePost: async (parent, args, context) => {
    let auth = isAuthenticated(context);
    if (auth) {
      try {
        return await hidePostByPostId(args, context);
      } catch (error) {
        throw new ApolloError(error.message || error);
      }
    } else {
      throw new AuthenticationError();
    }
  },
};

module.exports = resolvers;
