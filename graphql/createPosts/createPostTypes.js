const { gql } = require("apollo-server-express");


const typeDefs = gql`
# swagger

type Mutation {
    createPost(post:postInput!): success
}
  input postInput {
    # _id: String
    shared_post_data: postInput
    post_text: String
    post_lat_long: String!
    tagged_id: [Int]
    posted_for: PostedFor 
    post_type: PostType 
    post_video: String
    thumbnail: String 
    # posted_by: Int
    post_location: String 
    dimension: [DimensionInput]
    like_count: Int
    comment_count: Int
    post_date: Date
    post_privacy: String
    post_id: Int
    video_play_count: Int
    bg_image_post: Boolean
    bg_map_post: Boolean
    liked: Boolean
    first_name: String
    last_name: String
    user_id: Int
    user_name: String
    private: Boolean
    profile_image_url: String
    following: String
    enable_follow: Boolean
    requestedUser: Boolean
    font_face: String
    image_size: String
    audience_details: String
    comment: [CommentInput]
  }
  input CommentInput {
    _id: String
    post_id: Int
    comment_text: String
    commented_by: Int
    comment_parent_id: Int
    comment_date: Date
    comment_status: String
    comment_id: Int
  }
  input DimensionInput {
    height: Int
    width: Int
  }
`


module.exports = typeDefs