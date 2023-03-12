const { isAuthenticated } = require("../helpers/authentication");
const { AuthenticationError, ApolloError } = require("apollo-server-express");
const {updateVideoPlayCount} = require("./updateVideoPlayCountModel")
const resolvers = {
    updateVideoPlayCount: async (parent, args, context) => {
    let auth = isAuthenticated(context);
    if (auth) {
      try {
        return await updateVideoPlayCount(args, context);
      } catch (error) {
          console.log(error)
        throw new ApolloError(error.message || error);
      }
    } else {
      throw new AuthenticationError();
    }
  },
};

module.exports = resolvers;
