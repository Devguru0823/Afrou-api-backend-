const { gql } = require("apollo-server-express");

const typeDefs = gql`
  type Query {
    posts(page: Int): swaggerPosts
    postById(postId: Int!): swagger
    getPostLikes(postId:Int!):[postlikedBy]
  }
  type Mutation{
    editPost(postId:Int!,post:postInput!):success
    updatePostViewCount(postId:Int!):counter
    deletePost(postId:Int!):success
    reportPost(postId:Int!,reportReason:String!):success
    hidePost(postId:Int!):success
    updatePostSeen(postId:Int!):swagger
    updateMostPopularSeen(postId:Int!):success
  }

  type postlikedBy{

    _id:               String
    email:             String
    first_name:        String
    last_name:         String
    profile_image_url: String
    user_id:           Int
    user_name:        String
    request_buttons:   [RequestButton]


  }
 
`;

module.exports = typeDefs;
