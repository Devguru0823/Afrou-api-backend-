const { gql } = require('apollo-server-express');
// swagger - post types
// message - message list types
const typeDefs = gql`
	scalar Date
	type success {
		status: Boolean
	}

	type swaggerPosts {
		data: [swagger]
		count: Int
		currentPage: Int
		nextPage: Int
	}

	type swagger {
		_id: String
		shared_post_data: swagger
		post_text: String
		post_lat_long: String
		tagged_id: [Int]
		posted_for: PostedFor
		post_type: PostType
		post_video: String
		thumbnail: String
		posted_by: Int
		post_location: String
		dimension: [Dimension]
		like_count: Int
		comment_count: Int
		post_date: Date
		post_privacy: String
		post_id: Int
		post_image: [String]
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
		comments: [Comment]
		request_buttons: [RequestButton]
	}
	type Dimension {
		height: Int
		width: Int
	}
	type RequestButton {
		button_text: String
		button_link: String
		button_type: String
	}
	type Comment {
		_id: String
		post_id: Int
		comment_text: String
		commented_by: commented_by
		comment_parent_id: Int
		comment_date: Date
		comment_status: String
		comment_id: Int
	}

	type commented_by {
		first_name: String
		last_name: String
		profile_image_url: String
		user_id: Int
		user_name: String
	}
	enum PostType {
		image
		shared
		video
		text
	}

	enum PostedFor {
		afroswagger
		afrotalent
		group
		hashtag
	}
	# GET /api/messages/ response type :)
	type MessageList {
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
		message_count: Int
		SocketUser_user_id: Int
		SocketUser_status: String
		blocked_by_me: Boolean
		online_status: Boolean
	}

	enum SocketUserStatus {
		active
		inactive
	}
	enum MessageType {
		listAll
		archivedAll
	}
`;

module.exports = typeDefs;
