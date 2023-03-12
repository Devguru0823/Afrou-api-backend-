const { isAuthenticated } = require("../helpers/authentication");
const { getPosts } = require("./talentModel");
const { AuthenticationError, ApolloError } = require("apollo-server-express");

const resolvers = {
  talents: async (parent, args, context) => {
    let auth = isAuthenticated(context);
    if (auth) {
      try {
        let data = await getPosts(args, context);
        // return data;
        // console.log(data)
        data.data.forEach((element) => {
          console.log(element.dimension);
        });
        return data;
        //   return "success";
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
