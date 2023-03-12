const { isAuthenticated } = require("../helpers/authentication");
// const { postBackgrounds } = require("./postBackgroundModel");
const { deleteUserfromMessageList} = require("./deleteUserfromMessageListModel")
const { AuthenticationError, ApolloError } = require("apollo-server-express");

const resolvers = {
    removeUserFromMessageList: async (parent, args, context) => {
    let auth = isAuthenticated(context);
    if (auth) {
      try {
        // no params required
        let data = await deleteUserfromMessageList(args,context);
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
