// packages/backend/src/utils/validators.js
// Reusable express-validator rule arrays.
// Import these into route files to DRY up validation.

const { body, param, query } = require('express-validator');
const { TARGET_BOUNDS } = require('../config/constants');

// ── Auth ──────────────────────────────────────────────────────────────
const validateSignup = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3–30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username may only contain letters, numbers, _ and -'),

  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
];

const validateLogin = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// ── Automation targets ────────────────────────────────────────────────
// Dynamically build validators for each target field.
const validateTargets = Object.entries(TARGET_BOUNDS).map(([field, { min, max }]) =>
  body(`targets.${field}`)
    .optional()
    .isFloat({ min, max })
    .withMessage(`${field} must be between ${min} and ${max}`)
);

// ── Data export date range ────────────────────────────────────────────
const validateDateRange = [
  query('from')
    .isISO8601().withMessage('from must be a valid ISO date (YYYY-MM-DD)'),
  query('to')
    .isISO8601().withMessage('to must be a valid ISO date (YYYY-MM-DD)')
    .custom((to, { req }) => {
      if (new Date(to) < new Date(req.query.from)) {
        throw new Error('"to" must be after "from"');
      }
      return true;
    }),
];

// ── Password change ───────────────────────────────────────────────────
const validatePasswordChange = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('New password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('New password must contain at least one number'),
  body('confirmPassword').custom((val, { req }) => {
    if (val !== req.body.newPassword) throw new Error('Passwords do not match');
    return true;
  }),
];

// ── Username change ───────────────────────────────────────────────────
const validateUsernameChange = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3–30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username may only contain letters, numbers, _ and -'),
];

// ── Generic validation result checker ────────────────────────────────
const { validationResult } = require('express-validator');

function checkValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      // Return all field errors so the frontend can display them inline
      fields: errors.array().reduce((acc, e) => {
        acc[e.path] = e.msg;
        return acc;
      }, {}),
    });
  }
  next();
}

module.exports = {
  validateSignup,
  validateLogin,
  validateTargets,
  validateDateRange,
  validatePasswordChange,
  validateUsernameChange,
  checkValidation,
};
