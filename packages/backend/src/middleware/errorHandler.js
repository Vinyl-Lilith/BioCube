// packages/backend/src/middleware/errorHandler.js
// Express error-handling middleware.  Must be registered LAST in server.js.
// Catches any error thrown with next(err) or unhandled async errors.

const { SystemLog } = require('../models/models');

async function errorHandler(err, req, res, next) {
  // Log to SystemLog collection so admins can see server errors
  try {
    await SystemLog.create({
      source:  'server',
      level:   'error',
      message: err.message || 'Unknown server error',
      meta: {
        stack:  err.stack,
        method: req.method,
        url:    req.originalUrl,
        userId: req.user?._id,
      },
    });
  } catch (_) {
    // If DB logging itself fails, just console-log and move on
    console.error('[ErrorHandler] Failed to log to DB:', _.message);
  }

  console.error('[Server Error]', err.message);

  // Mongoose validation error — bad data shape
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: Object.values(err.errors).map(e => e.message),
    });
  }

  // Mongoose duplicate key (e.g. duplicate username)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({ error: `${field} already taken` });
  }

  // JWT errors (shouldn't reach here normally but just in case)
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Default: 500 Internal Server Error
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
}

module.exports = errorHandler;
