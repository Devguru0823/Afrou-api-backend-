const { gql } = require("apollo-server-express");

const typeDefs = gql`
  type Query {
    popularv2(type: PostedFor, page: Int): swaggerPosts
  }
`;

module.exports = typeDefs;
