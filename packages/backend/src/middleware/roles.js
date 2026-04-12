// packages/backend/src/middleware/roles.js
// Role-based and page-restriction middleware factories.
// Used after requireAuth to gate routes by role or page access.

const { ROLES } = require('../config/constants');

// ── requireRole(role) ─────────────────────────────────────────────────
// Returns a middleware that only allows users with the specified role
// (or higher in the hierarchy) to proceed.
// Hierarchy: head_admin > admin > user
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// ── requireAdmin ──────────────────────────────────────────────────────
// Shorthand: only admins and head_admin can proceed.
const requireAdmin = requireRole(ROLES.ADMIN, ROLES.HEAD_ADMIN);

// ── requireHeadAdmin ──────────────────────────────────────────────────
// Only the head admin can proceed (e.g. promote/demote admins).
const requireHeadAdmin = requireRole(ROLES.HEAD_ADMIN);

// ── requirePageAccess(pageName) ───────────────────────────────────────
// Checks whether this user has been restricted from a specific page.
// Admins and head_admin are never restricted.
function requirePageAccess(pageName) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });

    // Admins bypass all page restrictions
    if ([ROLES.ADMIN, ROLES.HEAD_ADMIN].includes(req.user.role)) return next();

    if (req.user.restrictedPages && req.user.restrictedPages.includes(pageName)) {
      return res.status(403).json({ error: `Access to ${pageName} page is restricted` });
    }
    next();
  };
}

module.exports = { requireRole, requireAdmin, requireHeadAdmin, requirePageAccess };
