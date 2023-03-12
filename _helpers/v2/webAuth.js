const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const { authorization } = req.headers;
  if(!authorization) {
    return res.status(401).json({
      status: false,
      message: 'missing auth header'
    })
  }

  // extract token from auth header
  const token = authorization.split(' ')[1].trim();
	const { refresh_token } = req.cookies;

	if(!token || !refresh_token) {
		return res.status(401).json({
			status: false,
      message: 'UNAUTHORIZED'
		})
	}

  let payload = {};

  // verify token
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if(error.name === 'TokenExpiredError') {
			return res.status(401).json({
				status: false,
				message: 'invalid jwt token'
			})
    }

    console.log('====================================');
    console.log('TOKEN VERIFY ERR: ',error.message);
    console.log('====================================');
		if(error.message === 'jwt malformed') {
			return res.status(401).json({
				status: false,
				message: 'invalid jwt token'
			})
		}
    return res.status(500).json({
      status: false,
      message: 'AN ERROR OCCURED'
    })
  }

	req.authorization = { user_id: payload.user_id };
	next();
}