const { isAuthenticated } = require("../helpers/authentication");

const { AuthenticationError, ApolloError } = require("apollo-server-express");
// const { updatePostViewCount } = require("./updatePostViewCountModel");
const {updatePostSeenuser} = require("./updatePostSeenuserModel")
const resolvers = {
    updatePostSeen: async (parent, args, context) => {
    let auth = isAuthenticated(context);
    if (auth) {
      try {
          let data =  await updatePostSeenuser(args, context);
          console.log(data)
          return data 
      } catch (error) {
        throw new ApolloError(error.message || error);
      }
    } else {
      throw new AuthenticationError();
    }
  },
};

module.exports = resolvers;
