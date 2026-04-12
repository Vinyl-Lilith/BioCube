// packages/backend/src/routes/admin.js
// All routes require admin or head_admin role.
//
// GET  /api/admin/users                    — list all users
// PUT  /api/admin/users/:id/status         — ban/unban
// PUT  /api/admin/users/:id/restrict       — restrict/unrestrict pages
// PUT  /api/admin/users/:id/role           — promote/demote (head_admin only)
// GET  /api/admin/logs/activity            — 24hr activity log
// GET  /api/admin/logs/system              — system/error log
// GET  /api/admin/requests                 — pending admin recovery requests
// POST /api/admin/requests/:id/approve     — approve a recovery request
// POST /api/admin/requests/:id/deny        — deny a recovery request

const router  = require('express').Router();
const crypto  = require('crypto');
const User    = require('../models/User');
const { ActivityLog, SystemLog, AdminRequest } = require('../models/models');
const { requireAuth }       = require('../middleware/auth');
const { requireAdmin, requireHeadAdmin } = require('../middleware/roles');
const { ROLES, STATUS, RESTRICTABLE_PAGES } = require('../config/constants');

router.use(requireAuth, requireAdmin);

// ── GET /api/admin/users ──────────────────────────────────────────────
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find({}).select('-password -refreshToken -recoveryToken').sort({ createdAt: 1 });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/admin/users/:id/status ───────────────────────────────────
// Body: { status: 'banned'|'active' }
router.put('/users/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (![STATUS.BANNED, STATUS.ACTIVE].includes(status)) {
      return res.status(400).json({ error: 'status must be "banned" or "active"' });
    }

    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found' });

    // Admins cannot ban head_admin or other admins
    if ([ROLES.HEAD_ADMIN, ROLES.ADMIN].includes(target.role)) {
      return res.status(403).json({ error: 'Cannot change status of admins or head admin' });
    }

    target.status = status;
    await target.save();

    await ActivityLog.create({
      userId:   req.user._id,
      username: req.user.username,
      action:   `${status === STATUS.BANNED ? 'Banned' : 'Unbanned'} user: ${target.username}`,
      page:     'admin',
    });

    res.json({ _id: target._id, status: target.status });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/admin/users/:id/restrict ────────────────────────────────
// Body: { pages: ['home','manual',...] }  — sets the restricted pages list
router.put('/users/:id/restrict', async (req, res, next) => {
  try {
    const { pages } = req.body;
    if (!Array.isArray(pages)) {
      return res.status(400).json({ error: 'pages must be an array' });
    }

    // Filter out any invalid page names
    const validPages = pages.filter(p => RESTRICTABLE_PAGES.includes(p));

    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found' });

    if ([ROLES.HEAD_ADMIN, ROLES.ADMIN].includes(target.role)) {
      return res.status(403).json({ error: 'Cannot restrict admins or head admin' });
    }

    target.restrictedPages = validPages;
    // Update status so the UI reflects the restricted state
    target.status = validPages.length > 0 ? STATUS.RESTRICTED : STATUS.ACTIVE;
    await target.save();

    await ActivityLog.create({
      userId:   req.user._id,
      username: req.user.username,
      action:   validPages.length
        ? `Restricted ${target.username} from: ${validPages.join(', ')}`
        : `Removed all restrictions from ${target.username}`,
      page: 'admin',
    });

    res.json({ _id: target._id, restrictedPages: target.restrictedPages, status: target.status });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/admin/users/:id/role ────────────────────────────────────
// Head admin only: promote user → admin, or demote admin → user.
// Body: { role: 'admin'|'user' }
router.put('/users/:id/role', requireHeadAdmin, async (req, res, next) => {
  try {
    const { role } = req.body;
    if (![ROLES.ADMIN, ROLES.USER].includes(role)) {
      return res.status(400).json({ error: 'role must be "admin" or "user"' });
    }

    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found' });

    // Head admin cannot be demoted
    if (target.role === ROLES.HEAD_ADMIN) {
      return res.status(403).json({ error: 'Head admin cannot be demoted' });
    }

    target.role = role;
    await target.save();

    await ActivityLog.create({
      userId:   req.user._id,
      username: req.user.username,
      action:   `${role === ROLES.ADMIN ? 'Promoted' : 'Demoted'} ${target.username} to ${role}`,
      page:     'admin',
    });

    res.json({ _id: target._id, role: target.role });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/logs/activity ──────────────────────────────────────
router.get('/logs/activity', async (req, res, next) => {
  try {
    const logs = await ActivityLog.find({}).sort({ createdAt: -1 }).limit(200).lean();
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/logs/system ────────────────────────────────────────
router.get('/logs/system', async (req, res, next) => {
  try {
    const logs = await SystemLog.find({}).sort({ createdAt: -1 }).limit(500).lean();
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/requests ───────────────────────────────────────────
router.get('/requests', async (req, res, next) => {
  try {
    const requests = await AdminRequest.find({ status: 'pending' }).sort({ createdAt: -1 }).lean();
    res.json(requests);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/requests/:id/approve ─────────────────────────────
// Issues a single-use recovery token to the user.
router.post('/requests/:id/approve', async (req, res, next) => {
  try {
    const request = await AdminRequest.findById(req.params.id);
    if (!request || request.status !== 'pending') {
      return res.status(404).json({ error: 'Request not found or already handled' });
    }

    const user = await User.findById(request.userId);
    if (!user) return res.status(404).json({ error: 'User no longer exists' });

    // Generate a single-use recovery token (expires in 1 hour)
    const token = crypto.randomBytes(32).toString('hex');
    user.recoveryToken       = token;
    user.recoveryTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
    user.mustChangePassword  = true;
    await user.save();

    request.status    = 'approved';
    request.handledBy = req.user._id;
    request.handledAt = new Date();
    await request.save();

    await ActivityLog.create({
      userId:   req.user._id,
      username: req.user.username,
      action:   `Approved recovery request for user: ${user.username}`,
      page:     'admin',
    });

    // In production you'd email the token to the user; here we return it
    // so you can integrate your notification system of choice.
    res.json({ approved: true, recoveryToken: token, message: `User ${user.username} can now log in with this token` });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/requests/:id/deny ────────────────────────────────
router.post('/requests/:id/deny', async (req, res, next) => {
  try {
    const request = await AdminRequest.findById(req.params.id);
    if (!request || request.status !== 'pending') {
      return res.status(404).json({ error: 'Request not found or already handled' });
    }

    request.status    = 'denied';
    request.handledBy = req.user._id;
    request.handledAt = new Date();
    await request.save();

    await ActivityLog.create({
      userId:   req.user._id,
      username: req.user.username,
      action:   `Denied recovery request for user: ${request.username}`,
      page:     'admin',
    });

    res.json({ denied: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
