// packages/frontend/src/utils/constants.js
// Frontend mirror of backend constants — keeps the UI and API in sync.

export const ROLES = {
  HEAD_ADMIN: 'head_admin',
  ADMIN:      'admin',
  USER:       'user',
};

export const STATUS = {
  ACTIVE:     'active',
  BANNED:     'banned',
  RESTRICTED: 'restricted',
};

export const TARGET_BOUNDS = {
  temperature:   { min: 10,  max: 50   },
  humidity:      { min: 10,  max: 95   },
  soilMoisture1: { min: 5,   max: 95   },
  soilMoisture2: { min: 5,   max: 95   },
  nitrogen:      { min: 0,   max: 1000 },
  phosphorus:    { min: 0,   max: 1000 },
  potassium:     { min: 0,   max: 1000 },
};

// 10 minutes in milliseconds — matches backend PELTIER_COOLDOWN_MS
export const PELTIER_COOLDOWN_MS = 10 * 60 * 1000;

// Valid items for the automation priority order
export const VALID_PRIORITY_ITEMS = ['temperature', 'soilMoisture', 'npk', 'humidity'];

// Human-readable labels and icons for priority items
export const PRIORITY_LABELS = {
  temperature:  { icon: '🌡', label: 'Temperature',  desc: 'Controls Peltier cooling unit' },
  soilMoisture: { icon: '💧', label: 'Soil Moisture', desc: 'Controls submersible pumps 1 & 2' },
  npk:          { icon: '🧪', label: 'NPK Levels',    desc: 'Controls peristaltic pump' },
  humidity:     { icon: '🌫', label: 'Humidity',       desc: 'Controls intake & exhaust fans' },
};
