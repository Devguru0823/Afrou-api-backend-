const { gql } = require("apollo-server-express");

const typeDefs = gql`
  type Mutation {
    updateMessage(message: updatemessageInput!): Message
  }

  input updatemessageInput {
    message_text: String!
    message_image: String!
    message_id: Int!
  }
`;

module.exports = typeDefs;
