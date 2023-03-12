// const { isAuthenticated } = require("../helpers/authentication");
// const { getAfroswaggerPosts } = require("./postModel");
const {
  AuthenticationError,
  ApolloError,
  UserInputError,
} = require("apollo-server-express");
const { loginModel } = require("./login");

const resolvers = {
  
    login: async (parent, args, context) => {
      try {
        let data = await loginModel(args, context);
        console.log(data)
        return data;
      } catch (error) {
        console.log(error);
        // VALIDATION_ERROR
        if (error.name === "VALIDATION_ERROR")
          throw new UserInputError(error.name, {
            ...error.message,
          });
        throw error;
      }
    },

};

module.exports = resolvers;
