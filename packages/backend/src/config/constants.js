// packages/backend/src/config/constants.js
// Central place for every magic number and enum used across the app.
// Changing a value here changes it everywhere.

module.exports = {
  // ── User Roles ─────────────────────────────────────────────────────
  ROLES: {
    HEAD_ADMIN: 'head_admin', // First registered user; cannot be demoted by admins
    ADMIN:      'admin',      // Can manage users, view all logs
    USER:       'user',       // Normal access
  },

  // ── User Status ────────────────────────────────────────────────────
  STATUS: {
    ACTIVE:     'active',
    BANNED:     'banned',
    RESTRICTED: 'restricted',
  },

  // ── Pages that can be restricted ───────────────────────────────────
  // Admins can block a user from specific pages.
  // 'settings' is intentionally excluded — users must always
  // be able to change their own password.
  RESTRICTABLE_PAGES: ['home', 'automation', 'manual', 'admin'],

  // ── Sensor value validation bounds ────────────────────────────────
  // Any value received outside these ranges is flagged as bad data.
  SENSOR_BOUNDS: {
    temperature:   { min: -10,  max: 80   },  // °C
    humidity:      { min: 0,    max: 100  },  // %
    soilMoisture1: { min: 0,    max: 100  },  // %
    soilMoisture2: { min: 0,    max: 100  },  // %
    nitrogen:      { min: 0,    max: 1999 },  // ppm
    phosphorus:    { min: 0,    max: 1999 },  // ppm
    potassium:     { min: 0,    max: 1999 },  // ppm
  },

  // ── Automation target value bounds (user-settable) ─────────────────
  // These enforce what a user can set as a target — prevents nonsense
  // like "set soil moisture to 20470%".
  TARGET_BOUNDS: {
    temperature:   { min: 10,  max: 50   },
    humidity:      { min: 10,  max: 95   },
    soilMoisture1: { min: 5,   max: 95   },
    soilMoisture2: { min: 5,   max: 95   },
    nitrogen:      { min: 0,   max: 1000 },
    phosphorus:    { min: 0,   max: 1000 },
    potassium:     { min: 0,   max: 1000 },
  },

  // ── Peltier failsafe timing ────────────────────────────────────────
  PELTIER_COOLDOWN_MS:       10 * 60 * 1000, // 10 minutes after turning off
  PELTIER_FAN_AFTER_OFF_MS:  60 * 1000,      // Peltier fan stays on 60s after Peltier off
  PELTIER_TEMP_CHECK_MS:     5  * 60 * 1000, // Check if temp dropped 0.5°C in 5 min
  PELTIER_MIN_TEMP_DROP:     0.5,            // °C — minimum required drop

  // ── Data retention ────────────────────────────────────────────────
  DATA_RETENTION_DAYS: 30, // Sensor readings older than this are auto-deleted

  // ── Heartbeat ─────────────────────────────────────────────────────
  HEARTBEAT_TIMEOUT_MS: 15 * 1000, // Alert if no heartbeat from Arduino in 15s

  // ── Fuzzy password match ───────────────────────────────────────────
  // Levenshtein distance threshold.  A value of 3 means the user's
  // attempt can differ by up to 3 characters and still "match".
  FUZZY_PASSWORD_THRESHOLD: 3,

  // ── Activity log retention ────────────────────────────────────────
  ACTIVITY_LOG_HOURS: 24,

  // ── WebSocket message types ───────────────────────────────────────
  WS_TYPES: {
    // Pi → Server
    SENSOR_DATA:   'SENSOR_DATA',
    HEARTBEAT:     'HEARTBEAT',
    SYSTEM_EVENT:  'SYSTEM_EVENT',
    // Server → Pi
    ACTUATOR_CMD:  'ACTUATOR_CMD',
    TARGET_UPDATE: 'TARGET_UPDATE',
    AUTO_MODE:     'AUTO_MODE',
    PRIORITY_ORDER:'PRIORITY_ORDER',
    // Server → Browser
    LIVE_SENSORS:  'LIVE_SENSORS',
    NOTIFICATION:  'NOTIFICATION',
    ACTUATOR_STATE:'ACTUATOR_STATE',
    PI_STATUS:     'PI_STATUS',
    // Browser → Server
    SUBSCRIBE:     'SUBSCRIBE',
  },

  // ── Default automation priority order ─────────────────────────────
  // Arduino uses this order when multiple conditions need correcting.
  DEFAULT_PRIORITY: ['temperature', 'soilMoisture', 'npk', 'humidity'],

  // ── NPK partial failsafe ──────────────────────────────────────────
  // If one NPK nutrient has been at/above target for this long while
  // others are still below, log a solution-imbalance warning.
  NPK_IMBALANCE_WARN_MS: 5 * 60 * 1000, // 5 minutes

  // If a single nutrient keeps exceeding its target after every dosing
  // cycle for this many consecutive readings, alert the user.
  NPK_OVERDOSE_COUNT: 5,

  // ── Additional failsafes ──────────────────────────────────────────
  // Max consecutive sensor-null readings before alerting sensor offline
  SENSOR_NULL_THRESHOLD: 10,

  // If humidity goes above this absolute ceiling regardless of target, force fans on
  HUMIDITY_EMERGENCY_CEILING: 90, // %

  // If temperature goes above this absolute ceiling, force Peltier on (if not in cooldown)
  TEMP_EMERGENCY_CEILING: 40, // °C
};
