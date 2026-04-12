// packages/backend/src/middleware/auth.js
// Verifies the JWT access token on protected routes.
// Attaches the decoded user payload to req.user.

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

async function requireAuth(req, res, next) {
  try {
    // Expect: Authorization: Bearer <token>
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify the token using the access-token secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch the user to ensure they still exist and aren't banned
    const user = await User.findById(decoded.userId).select('-password -refreshToken');
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    if (user.status === 'banned') {
      return res.status(403).json({ error: 'Account banned' });
    }

    req.user = user; // Attach full user doc to request
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { requireAuth };
