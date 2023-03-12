const { gql } = require("apollo-server-express");

const typeDefs = gql`
type Query{
    """
    get  messages by user id 
    """
    getUserMessages(userId:Int!):[Message]
}
 type Message {
    _id:            String
    message_text:   String
    message_image:  String
    from_id:        Int
    to_id:          Int
    message_status: MessageStatus
    created_date:   Date
    message_id:     Int
    liked_by:       [likedBy]
    from_user:      FromUser
    from:           String
    like_count:     Int
    liked:          Boolean
    blocked_by_me:  Boolean
}

 enum From {
    friend
    me
}
type likedBy{
    liked_by:Int
    first_name:        String
    last_name:         String
    user_name:         String
    profile_image_url: String
}
 type FromUser {
    first_name:        String
    last_name:         String
    user_name:         String
    profile_image_url: String
}



 enum MessageStatus {
    read
    unread
}

`;

module.exports = typeDefs;
