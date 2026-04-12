// packages/backend/src/routes/admin.js
// Permission matrix:
//   Head Admin : ban/unban/restrict/unrestrict/promote/demote/delete ANY user except themselves
//   Admin      : ban/unban/restrict/unrestrict USERS only — cannot touch other admins or head_admin
//   Neither    : can demote/promote (that's head_admin only)
//   Nobody     : can delete or demote head_admin

const router  = require('express').Router();
const crypto  = require('crypto');
const User    = require('../models/User');
const { ActivityLog, SystemLog, AdminRequest } = require('../models/models');
const { requireAuth }       = require('../middleware/auth');
const { requireAdmin, requireHeadAdmin } = require('../middleware/roles');
const { ROLES, STATUS, RESTRICTABLE_PAGES } = require('../config/constants');

router.use(requireAuth, requireAdmin);

// ── Helper: check if the acting user can perform an action on the target
// Returns an error string if not allowed, null if allowed.
function canActOn(actor, target) {
  // Nobody can act on themselves via the admin panel
  if (actor._id.toString() === target._id.toString()) {
    return 'You cannot perform this action on your own account';
  }
  // Head admin cannot be touched by anyone
  if (target.role === ROLES.HEAD_ADMIN) {
    return 'The head admin account cannot be modified';
  }
  // Regular admins can only act on plain users — not other admins
  if (actor.role === ROLES.ADMIN && target.role === ROLES.ADMIN) {
    return 'Admins cannot perform this action on other admins';
  }
  return null;
}

// ── GET /api/admin/users ──────────────────────────────────────────────
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find({})
      .select('-password -refreshToken -recoveryToken')
      .sort({ createdAt: 1 });
    res.json(users);
  } catch (err) { next(err); }
});

// ── PUT /api/admin/users/:id/status ───────────────────────────────────
// Body: { status: 'banned'|'active' }
// Head admin: can ban/unban admins and users
// Admin: can only ban/unban users
router.put('/users/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (![STATUS.BANNED, STATUS.ACTIVE].includes(status)) {
      return res.status(400).json({ error: 'status must be "banned" or "active"' });
    }

    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found' });

    const err = canActOn(req.user, target);
    if (err) return res.status(403).json({ error: err });

    target.status = status;
    await target.save();

    await ActivityLog.create({
      userId:   req.user._id,
      username: req.user.username,
      action:   `${status === STATUS.BANNED ? 'Banned' : 'Unbanned'} user: ${target.username}`,
      page:     'admin',
    });

    res.json({ _id: target._id, status: target.status });
  } catch (err) { next(err); }
});

// ── PUT /api/admin/users/:id/restrict ─────────────────────────────────
// Body: { pages: ['home','manual',...] } — empty array = unrestrict all
// Head admin: can restrict admins and users
// Admin: can only restrict users
router.put('/users/:id/restrict', async (req, res, next) => {
  try {
    const { pages } = req.body;
    if (!Array.isArray(pages)) {
      return res.status(400).json({ error: 'pages must be an array' });
    }

    const validPages = pages.filter(p => RESTRICTABLE_PAGES.includes(p));

    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found' });

    const err = canActOn(req.user, target);
    if (err) return res.status(403).json({ error: err });

    target.restrictedPages = validPages;
    // Only mark restricted if actually restricting pages; clear to active otherwise
    if (target.status !== STATUS.BANNED) {
      target.status = validPages.length > 0 ? STATUS.RESTRICTED : STATUS.ACTIVE;
    }
    await target.save();

    await ActivityLog.create({
      userId:   req.user._id,
      username: req.user.username,
      action:   validPages.length
        ? `Restricted ${target.username} from pages: ${validPages.join(', ')}`
        : `Removed all page restrictions from ${target.username}`,
      page: 'admin',
    });

    res.json({ _id: target._id, restrictedPages: target.restrictedPages, status: target.status });
  } catch (err) { next(err); }
});

// ── PUT /api/admin/users/:id/role ─────────────────────────────────────
// Head admin only: promote user→admin or demote admin→user
// Body: { role: 'admin'|'user' }
router.put('/users/:id/role', requireHeadAdmin, async (req, res, next) => {
  try {
    const { role } = req.body;
    if (![ROLES.ADMIN, ROLES.USER].includes(role)) {
      return res.status(400).json({ error: 'role must be "admin" or "user"' });
    }

    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found' });

    if (target.role === ROLES.HEAD_ADMIN) {
      return res.status(403).json({ error: 'Head admin role cannot be changed' });
    }
    if (req.user._id.toString() === target._id.toString()) {
      return res.status(403).json({ error: 'You cannot change your own role' });
    }

    const oldRole = target.role;
    target.role   = role;
    await target.save();

    await ActivityLog.create({
      userId:   req.user._id,
      username: req.user.username,
      action:   `${role === ROLES.ADMIN ? 'Promoted' : 'Demoted'} ${target.username} from ${oldRole} to ${role}`,
      page:     'admin',
    });

    res.json({ _id: target._id, role: target.role });
  } catch (err) { next(err); }
});

// ── DELETE /api/admin/users/:id ───────────────────────────────────────
// Head admin only. Cannot delete their own account via this endpoint.
router.delete('/users/:id', requireHeadAdmin, async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found' });

    if (target.role === ROLES.HEAD_ADMIN) {
      return res.status(403).json({ error: 'Cannot delete the head admin account' });
    }

    const deletedUsername = target.username;
    await User.findByIdAndDelete(req.params.id);

    // Clean up any admin requests belonging to this user
    await AdminRequest.deleteMany({ userId: req.params.id });

    await ActivityLog.create({
      userId:   req.user._id,
      username: req.user.username,
      action:   `Deleted account: ${deletedUsername}`,
      page:     'admin',
    });

    await SystemLog.create({
      source:  'system',
      level:   'warn',
      message: `Account deleted by head admin: ${deletedUsername}`,
    });

    res.json({ deleted: true, username: deletedUsername });
  } catch (err) { next(err); }
});

// ── GET /api/admin/logs/activity ──────────────────────────────────────
router.get('/logs/activity', async (req, res, next) => {
  try {
    const logs = await ActivityLog.find({}).sort({ createdAt: -1 }).limit(200).lean();
    res.json(logs);
  } catch (err) { next(err); }
});

// ── GET /api/admin/logs/system ────────────────────────────────────────
router.get('/logs/system', async (req, res, next) => {
  try {
    const logs = await SystemLog.find({}).sort({ createdAt: -1 }).limit(500).lean();
    res.json(logs);
  } catch (err) { next(err); }
});

// ── GET /api/admin/requests ───────────────────────────────────────────
router.get('/requests', async (req, res, next) => {
  try {
    const requests = await AdminRequest.find({ status: 'pending' }).sort({ createdAt: -1 }).lean();
    res.json(requests);
  } catch (err) { next(err); }
});

// ── POST /api/admin/requests/:id/approve ─────────────────────────────
router.post('/requests/:id/approve', async (req, res, next) => {
  try {
    const request = await AdminRequest.findById(req.params.id);
    if (!request || request.status !== 'pending') {
      return res.status(404).json({ error: 'Request not found or already handled' });
    }

    const user = await User.findById(request.userId);
    if (!user) return res.status(404).json({ error: 'User no longer exists' });

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

    res.json({ approved: true, recoveryToken: token, message: `User ${user.username} can now log in with this token` });
  } catch (err) { next(err); }
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
  } catch (err) { next(err); }
});

module.exports = router;
