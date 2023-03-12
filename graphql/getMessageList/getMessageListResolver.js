const { isAuthenticated } = require('../helpers/authentication');
const { getMessagesListSocket } = require('./getMessagesListModel');
const { AuthenticationError, ApolloError } = require('apollo-server-express');

const resolvers = {
	messageList: async (parent, args, context) => {
		let auth = isAuthenticated(context);
		if (auth) {
			try {
				let data = await getMessagesListSocket(args, context);
				// console.log({data})
				return data;
				// return data;
			} catch (error) {
				throw new ApolloError(error.message || error);
			}
		} else {
			throw new AuthenticationError();
		}
	},
};

module.exports = resolvers;
