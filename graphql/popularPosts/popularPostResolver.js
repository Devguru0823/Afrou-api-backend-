const { isAuthenticated } = require("../helpers/authentication");
const {getMostPopulatPosts} = require("./populerPostModel")
const { AuthenticationError, ApolloError } = require("apollo-server-express");

const resolvers = {
  popular: async (parent, args, context) => {
    let auth = isAuthenticated(context);
    if (auth) {
      try {
        let data = await getMostPopulatPosts(args, context);
        // console.log(data)
        return data
        // return data;
        
      } catch (error) {
        throw new ApolloError(error.message || error);
      }
    } else {
      throw new AuthenticationError();
    }
  },
};

module.exports = resolvers;
