// packages/backend/src/models/ActivityLog.js
// Records user actions (actuator toggles, value changes, etc.)
// Does NOT log credential changes (passwords, tokens).
// Auto-deleted after 24 hours.

const mongoose = require('mongoose');
const { ACTIVITY_LOG_HOURS } = require('../config/constants');

const activityLogSchema = new mongoose.Schema(
  {
    // The user who performed the action
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: { type: String, required: true },

    // Human-readable description of what happened.
    // e.g. "Turned ON Intake Fan (Manual mode)"
    action: { type: String, required: true },

    // Optional: page context (manual, automation, admin, settings)
    page:   { type: String, default: 'unknown' },
  },
  { timestamps: true }
);

// TTL: auto-delete after 24 hours
activityLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: ACTIVITY_LOG_HOURS * 3600 }
);

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);


// ─────────────────────────────────────────────────────────────────────
// packages/backend/src/models/SystemLog.js
// Logs errors and events from the Raspberry Pi, Arduino, and server.
// These are long-lived — no TTL (admins review them).

const systemLogSchema = new mongoose.Schema(
  {
    // Source of the log entry
    source: {
      type: String,
      enum: ['arduino', 'raspi', 'server', 'system'],
      default: 'system',
    },

    // Log severity level
    level: {
      type: String,
      enum: ['info', 'warn', 'error', 'ok'],
      default: 'info',
    },

    // The actual log message
    message: { type: String, required: true },

    // Optional structured payload (e.g. sensor values at time of error)
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

systemLogSchema.index({ createdAt: -1 }); // Most recent first

const SystemLog = mongoose.model('SystemLog', systemLogSchema);


// ─────────────────────────────────────────────────────────────────────
// Admin recovery request — when a user chooses "Message Admin"
// on the forgot-password screen.

const adminRequestSchema = new mongoose.Schema(
  {
    // The user making the request
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: { type: String, required: true },

    // Their explanation of the situation
    message:  { type: String, required: true, maxlength: 1000 },

    // Admin decision
    status: {
      type:    String,
      enum:    ['pending', 'approved', 'denied'],
      default: 'pending',
    },

    // Which admin handled it
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    handledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const AdminRequest = mongoose.model('AdminRequest', adminRequestSchema);


// ─────────────────────────────────────────────────────────────────────
// AutomationSettings — one singleton document stores the current
// target values and which actuators are in auto mode.

const automationSettingsSchema = new mongoose.Schema(
  {
    // Only one document should ever exist; use upsert when updating.
    _id: { type: String, default: 'singleton' },

    automationEnabled: { type: Boolean, default: true },

    // Target setpoints the Arduino tries to maintain
    targets: {
      temperature:   { type: Number, default: 24 },
      humidity:      { type: Number, default: 65 },
      soilMoisture1: { type: Number, default: 40 },
      soilMoisture2: { type: Number, default: 40 },
      nitrogen:      { type: Number, default: 80 },
      phosphorus:    { type: Number, default: 60 },
      potassium:     { type: Number, default: 90 },
    },

    // Per-sensor automation toggle (user can disable individual sensors)
    enabled: {
      temperature:   { type: Boolean, default: true },
      humidity:      { type: Boolean, default: true },
      soilMoisture1: { type: Boolean, default: true },
      soilMoisture2: { type: Boolean, default: true },
      nitrogen:      { type: Boolean, default: true },
      phosphorus:    { type: Boolean, default: true },
      potassium:     { type: Boolean, default: true },
    },

    // Priority order — array of task names the Arduino addresses in order
    // when multiple conditions need correcting simultaneously.
    // Default: temperature → soil → npk → humidity
    priorityOrder: {
      type:    [String],
      default: ['temperature', 'soilMoisture', 'npk', 'humidity'],
    },

    // Last user who changed settings
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

const AutomationSettings = mongoose.model('AutomationSettings', automationSettingsSchema);


// ─────────────────────────────────────────────────────────────────────
// ActuatorState — tracks the live on/off state of all 8 actuators.
// Also persists the Peltier cooldown timer.

const actuatorStateSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'singleton' },

    pump1:       { type: Boolean, default: false },
    pump2:       { type: Boolean, default: false },
    peristaltic: { type: Boolean, default: false },
    peltier:     { type: Boolean, default: false },
    peltierFan:  { type: Boolean, default: false },
    intakeFan:   { type: Boolean, default: false },
    exhaustFan:  { type: Boolean, default: false },
    mister:      { type: Boolean, default: false },

    // When the Peltier was last turned OFF (used to enforce 10-min lockout)
    peltierLastOffAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const ActuatorState = mongoose.model('ActuatorState', actuatorStateSchema);


module.exports = { ActivityLog, SystemLog, AdminRequest, AutomationSettings, ActuatorState };
