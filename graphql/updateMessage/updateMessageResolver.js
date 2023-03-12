const { isAuthenticated } = require("../helpers/authentication");
const { AuthenticationError, ApolloError } = require("apollo-server-express");
const { updateMessage } = require("./updateMessageModel");

const resolvers = {
  updateMessage: async (parent, args, context) => {
    let auth = isAuthenticated(context);
    if (auth) {
      try {
        return await updateMessage(args, context);
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
