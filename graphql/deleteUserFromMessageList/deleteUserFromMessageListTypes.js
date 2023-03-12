const {gql } = require("apollo-server-express")
const typeDefs  = gql`
type Mutation{
    removeUserFromMessageList(toId:[Int!]!):user
}
`;
module.exports = typeDefs