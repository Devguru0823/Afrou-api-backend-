const {gql} = require("apollo-server-express")

const typeDefs = gql`
type Query {
    hashtag(slug:String! page:Int):swaggerPosts
}
`

module.exports = typeDefs