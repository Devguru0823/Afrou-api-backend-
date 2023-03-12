const { isAuthenticated } = require("../helpers/authentication");
const { getMostPopulatPostsNew } = require("./popularMobilePostsModel");
const { AuthenticationError, ApolloError } = require("apollo-server-express");

const resolvers = {
  popularMobile: async (parent, args, context) => {
    let auth = isAuthenticated(context);
    if (auth) {
      try {
        let data = await getMostPopulatPostsNew(args, context);
        return data;
      } catch (error) {
        console.log(error);
        return new ApolloError(error.message || error);
      }
    } else {
      return new AuthenticationError();
    }
  },
};

module.exports = resolvers;
