const { gql } = require("apollo-server-express");

const typeDefs = gql`
type Query{
    popular(type:PostedFor  ):[swagger]
}`;

module.exports = typeDefs