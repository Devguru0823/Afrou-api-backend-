const {gql} = require("apollo-server-express")



const typDefs = gql`
type Mutation{
    removeArchiveUser(toId:[Int!]!):user
}
`

module.exports = typDefs