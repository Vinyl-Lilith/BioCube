// packages/backend/src/models/SensorData.js
// One document = one sensor snapshot from the Arduino.
// Auto-deleted after DATA_RETENTION_DAYS days via a TTL index.

const mongoose = require('mongoose');
const { DATA_RETENTION_DAYS } = require('../config/constants');

const sensorDataSchema = new mongoose.Schema(
  {
    // ── Timestamp ─────────────────────────────────────────────────
    // createdAt is automatically added by { timestamps:true }.
    // The TTL index on createdAt handles auto-deletion.

    // ── Temperature ───────────────────────────────────────────────
    temperature: {
      type:    Number,
      default: null, // null = sensor not available
    },

    // ── Humidity ──────────────────────────────────────────────────
    humidity: {
      type:    Number,
      default: null,
    },

    // ── Soil Moisture ─────────────────────────────────────────────
    soilMoisture1: {
      type:    Number,
      default: null,
    },
    soilMoisture2: {
      type:    Number,
      default: null,
    },

    // ── NPK ───────────────────────────────────────────────────────
    nitrogen:   { type: Number, default: null },
    phosphorus: { type: Number, default: null },
    potassium:  { type: Number, default: null },

    // ── Sensor health flags ───────────────────────────────────────
    // The Arduino reports which sensors it found on startup/runtime.
    // These booleans let the UI show "Sensor offline" banners.
    sensorStatus: {
      dht22_1:   { type: Boolean, default: true },
      dht22_2:   { type: Boolean, default: true },
      soil1:     { type: Boolean, default: true },
      soil2:     { type: Boolean, default: true },
      npk:       { type: Boolean, default: true },
    },

    // ── Source ────────────────────────────────────────────────────
    // 'live' = came in over WebSocket from Pi in real-time
    // 'buffered' = Pi stored it offline and synced it later
    source: {
      type:    String,
      enum:    ['live', 'buffered'],
      default: 'live',
    },
  },
  { timestamps: true } // createdAt, updatedAt
);

// ── TTL index ─────────────────────────────────────────────────────────
// MongoDB automatically deletes documents whose createdAt is older than
// DATA_RETENTION_DAYS * 86400 seconds.  No cron job needed for this.
sensorDataSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: DATA_RETENTION_DAYS * 24 * 60 * 60 }
);

// ── Compound index for efficient date-range queries ───────────────────
// Used by the "download data" and charting features on the homepage.
sensorDataSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SensorData', sensorDataSchema);
