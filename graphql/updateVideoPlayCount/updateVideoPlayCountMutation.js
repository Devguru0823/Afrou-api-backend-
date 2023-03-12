const {gql } = require("apollo-server-express")

const typeDefs = gql`
type Mutation{
    updateVideoPlayCount(postId:Int!):counter


}
type counter {
    counter :Int
}
`

module.exports = typeDefs