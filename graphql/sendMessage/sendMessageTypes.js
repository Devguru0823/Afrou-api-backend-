const {gql}  =require("apollo-server-express")



const typeDefs = gql`
type Mutation{
    sendMessage(toId:Int! , message:messageInput!):Message
}

input messageInput{
    message_text:String!
    message_image:String!
    message_id:Int
}
`


module.exports = typeDefs