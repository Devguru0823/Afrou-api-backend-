const { gql } = require("apollo-server-express");

const typeDefs = gql`
  type Mutation {
    login(
      username: String!
      password: String!
      firebase_token: String
      email: String
      facebook_id: String
      google_id: String
      """
      if the device is ios pass the voip_id , voip_id is used for push notifications in other apis
      """
      voip_id: String
      """
      pass this value if user is trying  with social login 
      """
      type:loginType
    ): Welcome
  
  }

  type Welcome {
    token: String
    user_id: Int
    login_time: Date
    login_ip: String
    login_type: String
    user: user
  }
enum loginType{
  facebook
  google
}
  type user {
    _id: String
    first_name: String
    last_name: String
    firebase_token: String
    email: String
    contact_number: String
    registered_with: String
    profile_image_url: String
    cover_image_url: String
    private: Boolean
    introduced: Boolean
    status: Status
    created_date: Date
    last_active: Date
    user_id: Int
    email_verified: Boolean
    phone_verified: Boolean
    last_login_ip: String
    profile_cover_image: String
    date_of_birth: Date
    gender: String
    nationality: String
    religion: String
    sports_interests: [String]
    updated_date: Date
    following_ids: [Int]
    follower_ids: [Int]
    following_hashtags: [String]
    user_name: String
    mostpopularpostseen: [Int]
    login_device_detail: [String]
    password_reset_expiry: Date
    password_reset_otp: String
    career_interest: String
    profile_title: String
    state: String
    hidden_posts: [Int]
    archived_users: [String]
    delmsglist_users: [Int]
    voip_token: String
    blocked_ids: [String]
    voip_id: String
    device_id: String
    device_tokens: [String]
    about: String
    followings_list: [followsList]
    followers_list: [followsList]
    friends_list: [friendsList]
    profile_strength: Int
    totalPostLikes: Int
  }

  type followsList {
    first_name: String
    last_name: String
    profile_image_url: String
    user_id: Int
    follower_ids: [Int]
  }

  type friendsList {
    _id: String
    first_name: String
    last_name: String
    profile_image_url: String
    last_active: Date
    user_id: Int
    blocked_ids: [Int]
    user_name: String
    last_message: String
    last_message_image: String
    last_message_time: Date
    unread_count: Int
    SocketUser_user_id: Int
    SocketUser_status: String
    blocked_by_me: Boolean
    online_status: Boolean
  }

  enum Status {
    active
    inactive
  }
`;

module.exports = typeDefs;
