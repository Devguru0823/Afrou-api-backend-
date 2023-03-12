const {gql} = require("apollo-server-express")


const typeDefs = gql`
type Query{
            
    messageList(type:MessageType!):[MessageList]
}
`

module.exports = typeDefs