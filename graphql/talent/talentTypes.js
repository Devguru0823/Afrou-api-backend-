const { gql } = require("apollo-server-express");

const typeDefs = gql`
  type Query {
    talents(page: Int): swaggerPosts
  }
`;
module.exports = typeDefs;
