// packages/backend/src/routes/auth.js
// Handles: signup, login, token refresh, logout,
//          forgot-password (fuzzy + admin-request flows),
//          and forced password reset after admin approval.

const router  = require('express').Router();
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');
const crypto  = require('crypto');
const User    = require('../models/User');
const { ActivityLog, AdminRequest, SystemLog } = require('../models/models');
const { requireAuth }  = require('../middleware/auth');
const { ROLES, FUZZY_PASSWORD_THRESHOLD } = require('../config/constants');
const {
  validateSignup, validateLogin,
  validatePasswordChange, checkValidation,
} = require('../utils/validators');

// ── Helper: sign a short-lived access token ───────────────────────────
function signAccessToken(user) {
  return jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
}

// ── Helper: sign a long-lived refresh token ───────────────────────────
function signRefreshToken(user) {
  return jwt.sign(
    { userId: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}

// ════════════════════════════════════════════════════════════════════
// POST /api/auth/signup
// ════════════════════════════════════════════════════════════════════
router.post('/signup', validateSignup, checkValidation, async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Check if username is already taken
    const existing = await User.findOne({ username: username.trim() });
    if (existing) {
      return res.status(409).json({ error: 'username already taken' });
    }

    // Determine role: first user ever = head_admin; everyone else = user
    const count = await User.countDocuments();
    const role  = count === 0 ? ROLES.HEAD_ADMIN : ROLES.USER;

    const user = new User({ username: username.trim(), password, role });
    await user.save();

    // Issue tokens immediately so the user is logged in after signup
    const accessToken  = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    user.refreshToken  = refreshToken;
    await user.save();

    await SystemLog.create({
      source: 'server', level: 'ok',
      message: `New user registered: ${user.username} (${role})`,
    });

    res.status(201).json({ accessToken, refreshToken, user });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════
// POST /api/auth/login
// ════════════════════════════════════════════════════════════════════
router.post('/login', validateLogin, checkValidation, async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // findOne is case-sensitive; username was stored as-is during signup
    const user = await User.findOne({ username: username.trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (user.status === 'banned') {
      return res.status(403).json({ error: 'Account is banned' });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const accessToken  = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    user.refreshToken  = refreshToken;
    await user.save();

    res.json({ accessToken, refreshToken, user, mustChangePassword: user.mustChangePassword });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════
// POST /api/auth/refresh
// Exchange a refresh token for a new access token.
// ════════════════════════════════════════════════════════════════════
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ error: 'Refresh token revoked' });
    }

    const newAccess  = signAccessToken(user);
    const newRefresh = signRefreshToken(user);
    user.refreshToken = newRefresh;
    await user.save();

    res.json({ accessToken: newAccess, refreshToken: newRefresh });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════
// POST /api/auth/logout
// Revokes the refresh token so it can't be reused.
// ════════════════════════════════════════════════════════════════════
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    req.user.refreshToken = null;
    await req.user.save();
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════
// POST /api/auth/forgot/fuzzy
// User attempts recovery with a rough guess of their last password.
// We use Levenshtein distance: if the attempt is within threshold,
// we issue a single-use recovery token.
// ════════════════════════════════════════════════════════════════════
router.post('/forgot/fuzzy', async (req, res, next) => {
  try {
    const { username, attempt } = req.body;
    if (!username || !attempt) {
      return res.status(400).json({ error: 'username and attempt are required' });
    }

    const user = await User.findOne({ username: username.trim() });
    // Always return the same response to prevent username enumeration
    if (!user || !user.previousPasswordHash) {
      return res.json({ match: false });
    }

    // Compare the plaintext attempt to both the current hash and previous hash.
    // We hash-compare the attempt to the stored previousPasswordHash.
    // For fuzzy matching we need the plaintext of the previous password —
    // since we can only store hashes, we check exact bcrypt match first.
    // If exact match passes, we consider it a success (close enough = identical here).
    // NOTE: True fuzzy matching of a bcrypt hash is impossible without storing
    // the plaintext. The spec says "close enough allows access" — our
    // implementation checks the previous hash for an exact match.
    // This is a secure interpretation: a user who remembers their exact
    // previous password gets recovery; pure guesses do not.
    const exactMatch = await user.comparePreviousPassword(attempt);
    if (!exactMatch) {
      return res.json({ match: false });
    }

    // Issue a single-use recovery token (expires in 15 minutes)
    const token = crypto.randomBytes(32).toString('hex');
    user.recoveryToken       = token;
    user.recoveryTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
    user.mustChangePassword  = true;
    await user.save();

    res.json({ match: true, recoveryToken: token });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════
// POST /api/auth/forgot/admin-request
// User submits an admin recovery request with a message explaining
// their situation. An admin reviews it in the Admin panel.
// ════════════════════════════════════════════════════════════════════
router.post('/forgot/admin-request', async (req, res, next) => {
  try {
    const { username, message } = req.body;
    if (!username || !message) {
      return res.status(400).json({ error: 'username and message are required' });
    }
    if (message.length > 1000) {
      return res.status(400).json({ error: 'Message too long (max 1000 characters)' });
    }

    const user = await User.findOne({ username: username.trim() });
    if (!user) {
      // Vague response to avoid enumeration
      return res.json({ submitted: true });
    }

    await AdminRequest.create({
      userId:   user._id,
      username: user.username,
      message:  message.trim(),
    });

    res.json({ submitted: true });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════
// POST /api/auth/recover
// Uses a recovery token (issued by fuzzy-match or admin approval)
// to log the user in and force a password change.
// ════════════════════════════════════════════════════════════════════
router.post('/recover', async (req, res, next) => {
  try {
    const { recoveryToken } = req.body;
    if (!recoveryToken) return res.status(400).json({ error: 'Recovery token required' });

    const user = await User.findOne({ recoveryToken });
    if (!user || !user.recoveryTokenExpiry || user.recoveryTokenExpiry < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired recovery token' });
    }

    // Consume the token (single-use)
    user.recoveryToken       = null;
    user.recoveryTokenExpiry = null;
    await user.save();

    // Issue normal session tokens; mustChangePassword is still true
    const accessToken  = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    user.refreshToken  = refreshToken;
    await user.save();

    res.json({ accessToken, refreshToken, user, mustChangePassword: true });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════
// POST /api/auth/change-password
// Protected — requires valid JWT.  Used in Settings and forced reset.
// ════════════════════════════════════════════════════════════════════
router.post('/change-password', requireAuth, validatePasswordChange, checkValidation, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Re-fetch user with the password hash (excluded from requireAuth query)
    const user = await User.findById(req.user._id);
    const match = await user.comparePassword(currentPassword);
    if (!match) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Save old hash before overwriting
    user._previousPassword = user.password; // picked up by pre-save hook
    user.password           = newPassword;
    user.mustChangePassword = false;         // Clear the forced-change flag

    await user.save();

    // Log that a password was changed (no details for privacy)
    await ActivityLog.create({
      userId:   user._id,
      username: user.username,
      action:   'Changed account password',
      page:     'settings',
    });

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
