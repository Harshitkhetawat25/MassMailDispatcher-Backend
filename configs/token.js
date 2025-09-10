const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
	throw new Error('JWT_SECRET environment variable is required');
}

const genToken = (userId) =>{
	const token = jwt.sign({userId}, process.env.JWT_SECRET, {expiresIn: '15m'});
	return token;
}

module.exports = {genToken};