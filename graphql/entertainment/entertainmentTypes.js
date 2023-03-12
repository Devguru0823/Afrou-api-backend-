const {gql} = require("apollo-server-express")


const typeDefs = gql`
type Query {
    entertainment(page:Int):swaggerPosts
}
`

module.exports = typeDefs