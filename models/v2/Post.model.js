const mongoose = require('mongoose');

const { Schema, model, Types } = mongoose;

const postSchema = new Schema(
	{
		post_id: {
			type: Number,
			required: true,
			primary_key: true,
		},
		post_type: {
			type: String,
			required: true,
			enum: ['text', 'image', 'video', 'shared'],
			default: 'text',
		},
		bg_image_post: {
			type: Boolean,
			required: true,
			default: false,
		},
		bg_map_post: {
			type: Boolean,
			required: true,
			default: false,
		},
		bg_image: {
			type: String,
		},
		post_text: {
			type: String,
			required: true,
			default: '',
		},
		post_image: {
			type: Array,
		},
		post_video: {
			type: String,
		},
		thumbnail: {
			type: String,
		},
		posted_by: {
			type: Number,
			required: true,
		},
		posted_for: {
			type: String,
			required: true,
			enum: ['afroswagger', 'afrotalent', 'group', 'hashtag'],
			default: 'afroswagger',
		},
		group_id: {
			type: Number,
		},
		share_post_id: {
			type: Number,
		},
		shared_post_data: {
			type: Object,
		},
		hashtags: {
			type: Array,
			required: true,
			default: [],
		},
		like_count: {
			type: Number,
			required: true,
			default: 0,
		},
		comment_count: {
			type: Number,
			required: true,
			default: 0,
		},
		post_date: {
			type: Date,
			required: true,
			default: Date.now,
		},
		post_status: {
			type: String,
			required: true,
			enum: ['active', 'inactive', 'archived'],
			default: 'active',
		},
		post_privacy: {
			type: String,
			required: true,
			enum: ['friends', 'public'],
			default: 'friends',
		},
		post_location: {
			type: String,
		},
		post_lat_long: {
			type: String,
		},
		created_date: {
			type: Date,
			required: true,
			default: Date.now,
		},
		dimension: {
			type: Array,
			required: true,
			default: [],
		},
		seen_by: {
			type: Array,
			default: [],
		},
		tagged_id: {
			type: Array,
			default: [],
		},
		post_view_count: {
			type: Number,
			default: 0,
		},
		font_face: {
			type: String,
			default: '',
		},
		image_size: {
			type: String,
			default: '',
		},
		promoted: {
			type: Boolean,
		},
	},
	{ collection: 'post' }
);

const Post = model('Post', postSchema);

module.exports = Post;
