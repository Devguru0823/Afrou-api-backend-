const { isAuthenticated } = require("../helpers/authentication");

const { AuthenticationError, ApolloError } = require("apollo-server-express");
const { deletePost } = require("./deletePostModel");
const resolvers = {
  deletePost: async (parent, args, context) => {
    let auth = isAuthenticated(context);
    if (auth) {
      try {
        return await deletePost(args, context);
      } catch (error) {
        throw new ApolloError(error.message || error);
      }
    } else {
      throw new AuthenticationError();
    }
  },
};

module.exports = resolvers;
