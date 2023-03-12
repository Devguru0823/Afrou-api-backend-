const { AuthenticationError, ApolloError } = require('apollo-server-express');
const { authenticate } = require('./helpers/authentication');

const { dateScalar } = require('./scalar/dateScalar');
const http = require('http');

const commonTypes = require('./commonTypes');
const postTypes = require('./post/postType');
const postResolvers = require('./post/postResolvers');
const authTypes = require('./auth/authType');
const authMutation = require('./auth/authResolver');
const talentTypes = require('./talent/talentTypes');
const talentResolver = require('./talent/talentResolver');
const entertainmentTypes = require('./entertainment/entertainmentTypes');
const entertainmentResolver = require('./entertainment/entertainResolver');
const postBackgroundResolver = require('./postBackground/postBackgroundResolver');
const postBackgroundTypes = require('./postBackground/postBackgroundTypes');
const hashtagResolver = require('./hashtag/hashtagResolver');
const hashtagTypes = require('./hashtag/hashtagTypes');
const populerPostResolver = require('./popularPosts/popularPostResolver');
const popularPostType = require('./popularPosts/popularPostTypes');
const popularPostv2Resolver = require('./popularPostsv2/popularPostv2Resolver');
const popularPostv2Type = require('./popularPostsv2/popularPostv2Type');
const popularMobilePostsResolver = require('./popularMobile/popularMobilePostResolver');
const popularMobilePostsTypes = require('./popularMobile/popularMobilePostTypes');
const createPostMutation = require('./createPosts/createPostResolver');
const createPostsMutationTypes = require('./createPosts/createPostTypes');
const getMessageListResolver = require('./getMessageList/getMessageListResolver');
const getMessageListType = require('./getMessageList/getMessageListTypes');
const getMessagesByIdResolver = require('./getMessageList/getMessagesByUserIdResolver');
const getMessageByIdTypes = require('./getMessageList/messageTypes');
const sendMessageMutation = require('./sendMessage/sendMessageResolver');
const sendMessageType = require('./sendMessage/sendMessageTypes');
const updateMessageMutation = require('./updateMessage/updateMessageResolver');
const updateMessageTypes = require('./updateMessage/updateMessageType');
const removeArchiveUsersMutation = require('./archivedUser/removeArchiveUsersResolver');
const removeArchiveUsersTypes = require('./archivedUser/removeeArchiveUsersTypes');
const removeUserFromMessageListMutaion = require('./deleteUserFromMessageList/deleteUserFromMessageListResolver');
const removeUserFromMessageListTypes = require('./deleteUserFromMessageList/deleteUserFromMessageListTypes');
const editPostMutation = require('./post/editPostMutation');
const updateVideoPlayCountTypes = require('./updateVideoPlayCount/updateVideoPlayCountMutation');
const updateVideoPlayCountMutation = require('./updateVideoPlayCount/updateVidePlayCountTypes');
const updatePostViewMutaion = require('./post/updatePostViewCountMutation');
const deletePostMutation = require('./post/deletePostResolver');
const reportPostMutaion = require('./post/reportPostResolver');
const hidePostMutation = require('./post/hidePostMutation');
const updatePostSeenMutation = require('./post/updatePostUserSeenMutation');
const updateMostPopularSeenMutation = require('./post/updateMostPopularSeenMutation');
let typeDefs = [
	commonTypes,
	postTypes,
	authTypes,
	talentTypes,
	entertainmentTypes,
	postBackgroundTypes,
	hashtagTypes,
	popularPostType,
	popularPostv2Type,
	popularMobilePostsTypes,
	createPostsMutationTypes,
	getMessageListType,
	getMessageByIdTypes,
	sendMessageType,
	updateMessageTypes,
	removeArchiveUsersTypes,
	removeUserFromMessageListTypes,
	updateVideoPlayCountTypes,
];
const resolvers = {
	Date: dateScalar,
	Query: {
		...postResolvers,
		...talentResolver,
		...entertainmentResolver,
		...postBackgroundResolver,
		...hashtagResolver,
		...populerPostResolver,
		...popularPostv2Resolver,
		...popularMobilePostsResolver,
		...getMessageListResolver,
		...getMessagesByIdResolver,
	},
	Mutation: {
		...authMutation,
		...createPostMutation,
		...sendMessageMutation,
		...updateMessageMutation,
		...removeArchiveUsersMutation,
		...removeUserFromMessageListMutaion,
		...editPostMutation,
		...updateVideoPlayCountMutation,
		...updatePostViewMutaion,
		...deletePostMutation,
		...reportPostMutaion,
		...hidePostMutation,
		...updatePostSeenMutation,
		...updateMostPopularSeenMutation,
	},
};

const { ApolloServer } = require('apollo-server-express');
const {
	ApolloServerPluginDrainHttpServer,
	ApolloServerPluginLandingPageGraphQLPlayground,
} = require('apollo-server-core');

async function startApolloServer(typeDefs, resolvers) {
	const app = require('express')();
	const httpServer = http.createServer(app);
	const server = new ApolloServer({
		typeDefs,
		resolvers,
		introspection: true,
		playground: true,
		context: async ({ req }) => {
			try {
				let data = await authenticate(req);

				return { user: data };
			} catch (error) {
				return { error };
			}
		},
		plugins: [
			ApolloServerPluginDrainHttpServer({ httpServer }),
			ApolloServerPluginLandingPageGraphQLPlayground(),
		],
		// formatError: (err) => {
		//   console.log(err)
		//   if (err.originalError instanceof AuthenticationError) {
		//     return new ApolloError("Invalid Token", "UNAUTHORISED_ERROR");
		//   }
		//   return error;
		// },
	});

	await server.start();
	server.applyMiddleware({ app });
	await new Promise((resolve) => {
		console.log('graphql listning on port 4000');
		return httpServer.listen({ port: 4000 }, resolve);
	});
}
startApolloServer(typeDefs, resolvers);
