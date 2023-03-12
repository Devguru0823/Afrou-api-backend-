const { gql } = require("apollo-server-express");

const typeDefs = gql`
  type Query {
   
    postBackground: backgroundResponse
  }

  type backgroundResponse {
    status: Boolean
    data: [backgrounds]
  }

  type backgrounds {
    _id: String
    bg_id: Int
    path: String
  }
`;

module.exports = typeDefs;
