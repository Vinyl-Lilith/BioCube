// packages/backend/src/routes/settings.js
// GET  /api/settings/me        — fetch current user profile
// PUT  /api/settings/username  — change username
// PUT  /api/settings/theme     — change UI theme

const router = require('express').Router();
const User   = require('../models/User');
const { ActivityLog } = require('../models/models');
const { requireAuth } = require('../middleware/auth');
const { validateUsernameChange, checkValidation } = require('../utils/validators');

router.use(requireAuth);

// ── GET /api/settings/me ──────────────────────────────────────────────
router.get('/me', (req, res) => {
  // req.user is already the full user document (minus sensitive fields)
  res.json(req.user);
});

// ── PUT /api/settings/username ────────────────────────────────────────
router.put('/username', validateUsernameChange, checkValidation, async (req, res, next) => {
  try {
    const { username } = req.body;
    const newName = username.trim();

    // Check the desired username isn't already taken by someone else
    const conflict = await User.findOne({ username: newName });
    if (conflict) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const oldName = req.user.username;
    req.user.username = newName;
    await req.user.save();

    // Log: note that old username is now available for others to use
    await ActivityLog.create({
      userId:   req.user._id,
      username: newName, // log with new name
      action:   `Changed username from "${oldName}" to "${newName}"`,
      page:     'settings',
    });

    res.json({ username: newName });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/settings/theme ───────────────────────────────────────────
// Body: { theme: 'biocube' | 'arctic' | ... }
const VALID_THEMES = [
  'biocube','arctic','solar','ocean','crimson',
  'terminal','violet','sandstone','neon','slate','rose','midnight',
];

router.put('/theme', async (req, res, next) => {
  try {
    const { theme } = req.body;
    if (!VALID_THEMES.includes(theme)) {
      return res.status(400).json({ error: `Invalid theme. Valid: ${VALID_THEMES.join(', ')}` });
    }
    req.user.theme = theme;
    await req.user.save();
    res.json({ theme });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
