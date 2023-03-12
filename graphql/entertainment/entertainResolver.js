const { isAuthenticated } = require("../helpers/authentication");
const { getEntertainmentPosts } = require("./entertainmentModel");
const { AuthenticationError, ApolloError } = require("apollo-server-express");

const resolvers = {
  entertainment: async (parent, args, context) => {
    let auth = isAuthenticated(context);
    if (auth) {
      try {
        let data = await getEntertainmentPosts(args, context);
        return data;
        //   return data;
      } catch (error) {
        throw new ApolloError(error.message || error);
      }
    } else {
      throw new AuthenticationError();
    }
  },
};

module.exports = resolvers;
