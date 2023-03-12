const { isAuthenticated } = require("../helpers/authentication");

const { AuthenticationError, ApolloError } = require("apollo-server-express");
const {editPost:editPostModel} = require("./editPostModel")
const resolvers = {
  
  editPost: async (parent, args, context) => {
    let auth = isAuthenticated(context);
    if (auth) {
      try {
        return await editPostModel(args, context);
      } catch (error) {
        throw new ApolloError(error.message || error);
      }
    } else {
      throw new AuthenticationError();
    }
  },
};

module.exports = resolvers;
