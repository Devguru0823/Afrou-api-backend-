const jwt = require('jsonwebtoken');

module.exports = (payload, type) => {
	let token;
	if (type === 'access') {
		token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
	}

	if (type === 'refresh') {
		token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
	}
	return token;
};
