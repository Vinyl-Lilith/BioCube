// packages/backend/src/models/User.js
// Mongoose schema for BioCube user accounts.

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const { ROLES, STATUS, RESTRICTABLE_PAGES } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    // ── Credentials ────────────────────────────────────────────────
    username: {
      type:     String,
      required: true,
      unique:   true,
      trim:     true,
      minlength: 3,
      maxlength: 30,
      // Only allow letters, numbers, underscores, hyphens
      match: [/^[a-zA-Z0-9_-]+$/, 'Username may only contain letters, numbers, _ and -'],
    },

    password: {
      type:     String,
      required: true,
      // Raw password is never stored — only the hash (see pre-save hook below)
    },

    // Stores the HASH of the previous password so the forgot-password
    // fuzzy-match flow can compare against it without storing plaintext.
    previousPasswordHash: {
      type:    String,
      default: null,
    },

    // ── Role & Status ──────────────────────────────────────────────
    role: {
      type:    String,
      enum:    Object.values(ROLES),
      default: ROLES.USER,
    },

    status: {
      type:    String,
      enum:    Object.values(STATUS),
      default: STATUS.ACTIVE,
    },

    // Which pages this user is restricted from (admin-controlled)
    restrictedPages: {
      type:    [String],
      enum:    RESTRICTABLE_PAGES,
      default: [],
    },

    // ── Preferences ───────────────────────────────────────────────
    // The selected UI theme — persisted per account.
    theme: {
      type:    String,
      default: 'biocube',
    },

    // ── Password-reset via admin approval ─────────────────────────
    // Set to true when an admin approves a recovery request.
    // The user is forced to set a new password on next login.
    mustChangePassword: {
      type:    Boolean,
      default: false,
    },

    // Token used for the admin-approved bypass login (single-use)
    recoveryToken: {
      type:    String,
      default: null,
    },

    recoveryTokenExpiry: {
      type:    Date,
      default: null,
    },

    // ── Refresh token ─────────────────────────────────────────────
    // We store only one refresh token per user (last device wins).
    refreshToken: {
      type:    String,
      default: null,
    },
  },
  { timestamps: true } // adds createdAt and updatedAt automatically
);

// ── Pre-save hook: hash the password if it was modified ───────────────
userSchema.pre('save', async function (next) {
  // "this" refers to the document being saved
  if (!this.isModified('password')) return next(); // Skip if password unchanged

  // Before hashing the new password, save the old hash as previousPasswordHash
  // so the fuzzy-match recovery can compare against it later.
  if (this.password && this._previousPassword) {
    this.previousPasswordHash = this._previousPassword;
  }

  // bcrypt saltRounds=12 — good balance of security vs. speed
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Instance method: compare a plaintext attempt to the stored hash ───
userSchema.methods.comparePassword = async function (attempt) {
  return bcrypt.compare(attempt, this.password);
};

// ── Instance method: compare attempt to the PREVIOUS password hash ────
// Used for the fuzzy forgot-password flow.
userSchema.methods.comparePreviousPassword = async function (attempt) {
  if (!this.previousPasswordHash) return false;
  return bcrypt.compare(attempt, this.previousPasswordHash);
};

// ── Virtual: never expose the password hash in JSON responses ─────────
userSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.password;
    delete ret.previousPasswordHash;
    delete ret.refreshToken;
    delete ret.recoveryToken;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
