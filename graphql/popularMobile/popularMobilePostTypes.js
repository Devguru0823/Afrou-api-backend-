const {gql}=require("apollo-server-express")

const typeDefs = gql`

type Query {
    # popularMobile:()
    popularMobile(type: PostedFor, page: Int): [swagger]
}
`


module.exports = typeDefs