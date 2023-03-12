const { isAuthenticated } = require('../helpers/authentication');
const { getAfroswaggerPosts } = require('./postModel.js');
const { getPostById } = require('./getPostByIdModel');
const { AuthenticationError, ApolloError } = require('apollo-server-express');
const { getPostLikes: getPostLikesResolver } = require('./getPostLikesModel');
const resolvers = {
	posts: async (parent, args, context) => {
		let auth = isAuthenticated(context);
		if (auth) {
			try {
				return await getAfroswaggerPosts(args, context.user);
			} catch (error) {
				throw new ApolloError(error.message || error);
			}
		} else {
			throw new AuthenticationError();
		}
	},
	getPostLikes: async (parent, args, context) => {
		let auth = isAuthenticated(context);
		if (auth) {
			try {
				let data = await getPostLikesResolver(args, context);
				console.log(data);
				return data;
			} catch (error) {
				console.log(error);
				throw new ApolloError(error.message || error);
			}
		} else {
			throw new AuthenticationError();
		}
	},
	postById: async (parent, args, context) => {
		let auth = isAuthenticated(context);
		if (auth) {
			try {
				return await getPostById(args, context);
			} catch (error) {
				console.log(error);
				throw new ApolloError(error.message || error);
			}
		} else {
			throw new AuthenticationError();
		}
	},
};

module.exports = resolvers;
