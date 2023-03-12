const { isAuthenticated } = require("../helpers/authentication");
const { postBackgrounds } = require("./postBackgroundModel");
const { AuthenticationError, ApolloError } = require("apollo-server-express");

const resolvers = {
    postBackground: async (parent, args, context) => {
    let auth = isAuthenticated(context);
    if (auth) {
      try {
        // no params required
        let data = await postBackgrounds();
console.log(data)
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
