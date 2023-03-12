const { isAuthenticated } = require("../helpers/authentication");
const {removeArchiveUsers} = require("./removeArchiveUsersModel")
const { AuthenticationError, ApolloError } = require("apollo-server-express");

const resolvers = {
    removeArchiveUser: async (parent, args, context) => {
    let auth = isAuthenticated(context);
    if (auth) {
      try {
          console.log({args})
        let data = await removeArchiveUsers(args, context);
        console.log(data)
        return  data
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
