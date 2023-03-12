const { isAuthenticated } = require("../helpers/authentication");
const {getMostPopulatPostsV2} =require("./popularPostv2Model")
const { AuthenticationError,ApolloError } = require("apollo-server-express");

  
const resolvers = {
  
    popularv2: async (parent, args, context) => {
      let auth = isAuthenticated(context);
      if (auth) {
        try {
          let data = await getMostPopulatPostsV2(args, context);
          // console.log(data)
          data.data.forEach(element => {
            console.log(element.dimension)
        });
          return data;
        } catch (error) {
            throw new ApolloError(error.message || error)
        }
      } else {
        throw new AuthenticationError();
      }
    },
  
};

module.exports = resolvers;
