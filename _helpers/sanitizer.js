const sanitize = require('sanitize-html');

module.exports = (req, res, next) => {
	if (req.body !== {}) {
		for (let [key, value] of Object.entries(req.body)) {
			let keyIsNumber = typeof value === 'number';
			if (typeof value === 'string') {
				req.body[key] = sanitize(value);
				if (keyIsNumber && req.body[key] !== '') {
					console.log('true');
					req.body[key] = Number.parseInt(req.body[key]);
				}
			}
		}
		// console.log('sanitized request body:', req.body);
		next();
		return;
	}
	next();
};
