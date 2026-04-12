// packages/backend/src/services/wsService.js
// Central WebSocket service — v1.1
// Changes from v1.0:
//   + piOnline flag broadcast to all browsers on Pi connect/disconnect
//   + NPK partial failsafe: imbalance detection + overdose counting
//   + Emergency ceiling failsafes (temp > 40°C, humidity > 90%)
//   + Consecutive null sensor reading tracker
//   + getPiOnline() exported for REST status endpoint

const WebSocket  = require('ws');
const jwt        = require('jsonwebtoken');
const SensorData = require('../models/SensorData');
const { ActivityLog, SystemLog, AutomationSettings, ActuatorState } = require('../models/models');
const {
  WS_TYPES,
  SENSOR_BOUNDS,
  HEARTBEAT_TIMEOUT_MS,
  PELTIER_MIN_TEMP_DROP,
  PELTIER_TEMP_CHECK_MS,
  PELTIER_COOLDOWN_MS,
  PELTIER_FAN_AFTER_OFF_MS,
  NPK_IMBALANCE_WARN_MS,
  NPK_OVERDOSE_COUNT,
  SENSOR_NULL_THRESHOLD,
  HUMIDITY_EMERGENCY_CEILING,
  TEMP_EMERGENCY_CEILING,
} = require('../config/constants');

// ── Module-level state ────────────────────────────────────────────────
let wss               = null;
let piClient          = null;
let piOnline          = false;
let heartbeatTimer    = null;
let lastTemp          = null;
let peltierCheckTimer = null;

const npkTargetReachedAt = { nitrogen: null, phosphorus: null, potassium: null };
const npkOverdoseCount   = { nitrogen: 0,    phosphorus: 0,    potassium: 0    };
const nullCounts = { temperature:0, humidity:0, soilMoisture1:0, soilMoisture2:0, nitrogen:0, phosphorus:0, potassium:0 };
let pumpStallCheck = { soil1Before: null, soil2Before: null, timer: null };

// ── init(server) ──────────────────────────────────────────────────────
function init(server) {
  wss = new WebSocket.Server({ server });

  wss.on('connection', async (ws, req) => {
    const url   = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    const isPi  = url.searchParams.get('client') === 'pi';

    // ── Authenticate Pi ──────────────────────────────────────────────
    if (isPi) {
      if (token !== process.env.PI_SECRET) {
        ws.close(4001, 'Unauthorized Pi connection');
        return;
      }
      if (piClient && piClient.readyState === WebSocket.OPEN) piClient.close(4002, 'Replaced by new Pi connection');

      piClient = ws;
      piOnline = true;
      console.log('[WS] Raspberry Pi connected');
      resetHeartbeatTimer();
      broadcastPiStatus(true);
      await SystemLog.create({ source:'raspi', level:'ok', message:'Raspberry Pi WebSocket connected' });

      ws.on('message', data => handlePiMessage(data));
      ws.on('close', async () => {
        console.warn('[WS] Pi disconnected');
        piClient = null;
        piOnline = false;
        clearTimeout(heartbeatTimer);
        broadcastPiStatus(false);
        broadcastNotification('⚠ Raspberry Pi disconnected from server', 'warn');
        await SystemLog.create({ source:'raspi', level:'warn', message:'Raspberry Pi WebSocket disconnected' });
      });
      return;
    }

    // ── Authenticate browser client ──────────────────────────────────
    if (!token) { ws.close(4003, 'No token'); return; }
    let decoded;
    try { decoded = jwt.verify(token, process.env.JWT_SECRET); }
    catch { ws.close(4004, 'Invalid token'); return; }

    ws.userId = decoded.userId;

    // Send latest snapshot immediately on browser connect
    try {
      const latest = await SensorData.findOne().sort({ createdAt: -1 }).lean();
      if (latest) ws.send(JSON.stringify({ type: WS_TYPES.LIVE_SENSORS, data: latest }));
    } catch (_) {}

    // Send current Pi status to this new browser immediately
    ws.send(JSON.stringify({ type: WS_TYPES.PI_STATUS, online: piOnline }));

    ws.on('close', () => {});
  });

  console.log('[WS] WebSocket server ready');
}

// ── handlePiMessage(rawData) ──────────────────────────────────────────
async function handlePiMessage(rawData) {
  let msg;
  try { msg = JSON.parse(rawData); } catch { return; }

  switch (msg.type) {

    case WS_TYPES.HEARTBEAT:
      resetHeartbeatTimer();
      if (!piOnline) { piOnline = true; broadcastPiStatus(true); }
      break;

    case WS_TYPES.SENSOR_DATA: {
      const sanitized = sanitizeSensorData(msg.data || {});
      try { await SensorData.create({ ...sanitized, source: msg.data?.source || 'live' }); }
      catch (e) { console.error('[WS] SensorData save failed:', e.message); }
      broadcastToAll(JSON.stringify({ type: WS_TYPES.LIVE_SENSORS, data: sanitized }));
      checkPeltierTempFailsafe(sanitized.temperature);
      checkPumpStall(sanitized);
      checkNpkPartialFailsafe(sanitized);
      checkEmergencyCeilings(sanitized);
      trackNullReadings(sanitized);
      break;
    }

    case WS_TYPES.SYSTEM_EVENT: {
      const { level='info', message='', source='raspi' } = msg;
      await SystemLog.create({ source, level, message });
      if (level === 'warn' || level === 'error') broadcastNotification(message, level);
      break;
    }

    default:
      console.warn('[WS] Unknown Pi message type:', msg.type);
  }
}

// ── sanitizeSensorData ────────────────────────────────────────────────
function sanitizeSensorData(d) {
  const result = {};
  for (const [key, { min, max }] of Object.entries(SENSOR_BOUNDS)) {
    const val = d[key];
    if (val == null) {
      result[key] = null;
    } else if (typeof val !== 'number' || val < min || val > max) {
      result[key] = null;
      SystemLog.create({ source:'system', level:'warn', message:`Sensor ${key} value ${val} out of bounds [${min},${max}] — discarded` }).catch(()=>{});
    } else {
      result[key] = val;
    }
  }
  if (d.sensorStatus) result.sensorStatus = d.sensorStatus;
  return result;
}

// ── resetHeartbeatTimer ───────────────────────────────────────────────
function resetHeartbeatTimer() {
  clearTimeout(heartbeatTimer);
  heartbeatTimer = setTimeout(async () => {
    broadcastNotification('⚠ No heartbeat from Arduino — please check Arduino Mega connection', 'error');
    await SystemLog.create({ source:'system', level:'error', message:`Arduino heartbeat lost — no signal for ${HEARTBEAT_TIMEOUT_MS/1000}s` });
  }, HEARTBEAT_TIMEOUT_MS);
}

// ── checkPeltierTempFailsafe ──────────────────────────────────────────
function checkPeltierTempFailsafe(temp) {
  if (temp === null) return;
  if (lastTemp === null) lastTemp = temp;
  if (!peltierCheckTimer) {
    peltierCheckTimer = setTimeout(async () => {
      peltierCheckTimer = null;
      try {
        const state = await ActuatorState.findById('singleton');
        if (!state?.peltier) { lastTemp = null; return; }
        const drop = (lastTemp || temp) - temp;
        if (drop < PELTIER_MIN_TEMP_DROP) {
          state.peltier = false; state.peltierLastOffAt = new Date(); await state.save();
          sendToPi({ type: WS_TYPES.ACTUATOR_CMD, actuator:'peltier', on:false });
          broadcastActuatorState({ peltier: false });
          broadcastNotification(`⚠ Peltier auto-off: temp only dropped ${drop.toFixed(2)}°C in 5 min (need ${PELTIER_MIN_TEMP_DROP}°C)`, 'error');
          await SystemLog.create({ source:'system', level:'error', message:`Peltier auto-off: insufficient temp drop (${drop.toFixed(2)}°C in 5 min)` });

          // Schedule peltier fan off after 60s
          setTimeout(async () => {
            try {
              const s = await ActuatorState.findById('singleton');
              if (s?.peltierFan) { s.peltierFan = false; await s.save(); broadcastActuatorState({ peltierFan:false }); }
            } catch(_) {}
          }, PELTIER_FAN_AFTER_OFF_MS);
        }
      } catch (e) { console.error('[Peltier Failsafe]', e.message); }
      lastTemp = temp;
    }, PELTIER_TEMP_CHECK_MS);
  }
}

// ── checkEmergencyCeilings ────────────────────────────────────────────
async function checkEmergencyCeilings(d) {
  try {
    const state = await ActuatorState.findById('singleton');
    if (!state) return;

    if (d.humidity !== null && d.humidity > HUMIDITY_EMERGENCY_CEILING) {
      if (!state.intakeFan || !state.exhaustFan) {
        state.intakeFan = true; state.exhaustFan = true; await state.save();
        sendToPi({ type: WS_TYPES.ACTUATOR_CMD, actuator:'intakeFan',  on:true });
        sendToPi({ type: WS_TYPES.ACTUATOR_CMD, actuator:'exhaustFan', on:true });
        broadcastActuatorState({ intakeFan:true, exhaustFan:true });
        broadcastNotification(`🚨 Emergency: Humidity ${d.humidity.toFixed(0)}% exceeds ${HUMIDITY_EMERGENCY_CEILING}% ceiling — fans forced ON`, 'error');
        await SystemLog.create({ source:'system', level:'error', message:`Emergency humidity ceiling: ${d.humidity.toFixed(0)}% — fans forced ON` });
      }
    }

    if (d.temperature !== null && d.temperature > TEMP_EMERGENCY_CEILING) {
      const cooldownOk = !state.peltierLastOffAt ||
        (Date.now() - new Date(state.peltierLastOffAt).getTime() >= PELTIER_COOLDOWN_MS);
      if (!state.peltier && cooldownOk) {
        state.peltier = true; await state.save();
        sendToPi({ type: WS_TYPES.ACTUATOR_CMD, actuator:'peltier', on:true });
        broadcastActuatorState({ peltier:true });
        broadcastNotification(`🚨 Emergency: Temperature ${d.temperature.toFixed(1)}°C exceeds ${TEMP_EMERGENCY_CEILING}°C ceiling — Peltier forced ON`, 'error');
        await SystemLog.create({ source:'system', level:'error', message:`Emergency temp ceiling: ${d.temperature.toFixed(1)}°C — Peltier forced ON` });
      } else if (!cooldownOk) {
        broadcastNotification(`🚨 Emergency: Temperature ${d.temperature.toFixed(1)}°C critical but Peltier is in cooldown — open vents manually!`, 'error');
      }
    }
  } catch (e) { console.error('[Emergency Ceilings]', e.message); }
}

// ── checkNpkPartialFailsafe ───────────────────────────────────────────
async function checkNpkPartialFailsafe(d) {
  try {
    const settings = await AutomationSettings.findById('singleton');
    if (!settings) return;
    const targets = settings.targets;
    const now = Date.now();
    const nutrients = [
      { key:'nitrogen',   val:d.nitrogen,   target:targets.nitrogen   },
      { key:'phosphorus', val:d.phosphorus, target:targets.phosphorus },
      { key:'potassium',  val:d.potassium,  target:targets.potassium  },
    ];

    for (const n of nutrients) {
      if (n.val === null) continue;
      // Overdose detection
      if (n.val > n.target * 1.2) {
        npkOverdoseCount[n.key]++;
        if (npkOverdoseCount[n.key] >= NPK_OVERDOSE_COUNT) {
          npkOverdoseCount[n.key] = 0;
          broadcastNotification(`⚠ NPK: ${n.key} (${n.val} ppm) is >20% above target (${n.target} ppm). Check solution concentration.`, 'warn');
          await SystemLog.create({ source:'system', level:'warn', message:`NPK overdose: ${n.key} at ${n.val} ppm vs target ${n.target} ppm (${NPK_OVERDOSE_COUNT} consecutive readings)` });
        }
      } else {
        npkOverdoseCount[n.key] = 0;
      }

      // Threshold reached tracking
      if (n.val >= n.target) {
        if (!npkTargetReachedAt[n.key]) {
          npkTargetReachedAt[n.key] = now;
          await SystemLog.create({ source:'system', level:'ok', message:`NPK: ${n.key} reached target (${n.val} ppm ≥ ${n.target} ppm)` });
        }
      } else {
        npkTargetReachedAt[n.key] = null;
      }
    }

    // Imbalance check — one nutrient at target while others still low
    const atTarget   = nutrients.filter(n => n.val !== null && npkTargetReachedAt[n.key] !== null);
    const stillBelow = nutrients.filter(n => n.val !== null && n.val < n.target);
    if (atTarget.length > 0 && stillBelow.length > 0) {
      const longestWait = Math.max(...atTarget.map(n => now - npkTargetReachedAt[n.key]));
      if (longestWait >= NPK_IMBALANCE_WARN_MS) {
        const atNames  = atTarget.map(n=>n.key).join(', ');
        const lowNames = stillBelow.map(n=>`${n.key} (${n.val} ppm)`).join(', ');
        broadcastNotification(`⚠ NPK Imbalance: ${atNames} at target, but ${lowNames} still below. Check reservoir solution ratio.`, 'warn');
        await SystemLog.create({ source:'system', level:'warn', message:`NPK imbalance: ${atNames} reached target while ${lowNames} below target for ${Math.round(longestWait/60000)} min` });
        for (const n of atTarget) npkTargetReachedAt[n.key] = now; // reset to avoid repeated alerts
      }
    }
  } catch (e) { console.error('[NPK Partial Failsafe]', e.message); }
}

// ── trackNullReadings ─────────────────────────────────────────────────
async function trackNullReadings(d) {
  const keys = Object.keys(nullCounts);
  for (const key of keys) {
    if (d[key] === null) {
      nullCounts[key]++;
      if (nullCounts[key] === SENSOR_NULL_THRESHOLD) {
        broadcastNotification(`⚠ Sensor "${key}" returned no data for ${SENSOR_NULL_THRESHOLD} readings — possible hardware issue`, 'warn');
        await SystemLog.create({ source:'system', level:'warn', message:`Sensor ${key}: ${SENSOR_NULL_THRESHOLD} consecutive null readings` });
      }
    } else {
      if (nullCounts[key] >= SENSOR_NULL_THRESHOLD) {
        await SystemLog.create({ source:'system', level:'ok', message:`Sensor ${key} back online after ${nullCounts[key]} null readings` });
      }
      nullCounts[key] = 0;
    }
  }
}

// ── checkPumpStall ────────────────────────────────────────────────────
function checkPumpStall(d) {
  ActuatorState.findById('singleton').then(state => {
    if (!state || (!state.pump1 && !state.pump2) || pumpStallCheck.timer) return;
    pumpStallCheck.soil1Before = d.soilMoisture1;
    pumpStallCheck.soil2Before = d.soilMoisture2;
    pumpStallCheck.timer = setTimeout(async () => {
      pumpStallCheck.timer = null;
      try {
        const latest = await SensorData.findOne().sort({ createdAt: -1 }).lean();
        const s = await ActuatorState.findById('singleton');
        if (!latest || !s) return;
        if (s.pump1 && latest.soilMoisture1 !== null && pumpStallCheck.soil1Before !== null && Math.abs(latest.soilMoisture1 - pumpStallCheck.soil1Before) < 1) {
          broadcastNotification('⚠ Pump 1 ON but Soil Moisture 1 unchanged — auto-stopped. Check water reservoir.', 'error');
          s.pump1 = false; await s.save();
          sendToPi({ type: WS_TYPES.ACTUATOR_CMD, actuator:'pump1', on:false });
          await SystemLog.create({ source:'system', level:'error', message:'Pump 1 auto-off: soil moisture 1 not responding — check reservoir' });
        }
        if (s.pump2 && latest.soilMoisture2 !== null && pumpStallCheck.soil2Before !== null && Math.abs(latest.soilMoisture2 - pumpStallCheck.soil2Before) < 1) {
          broadcastNotification('⚠ Pump 2 ON but Soil Moisture 2 unchanged — auto-stopped. Check water reservoir.', 'error');
          s.pump2 = false; await s.save();
          sendToPi({ type: WS_TYPES.ACTUATOR_CMD, actuator:'pump2', on:false });
          await SystemLog.create({ source:'system', level:'error', message:'Pump 2 auto-off: soil moisture 2 not responding — check reservoir' });
        }
      } catch(e) { console.error('[Pump Stall]', e.message); }
    }, 3 * 60 * 1000);
  }).catch(()=>{});
}

// ── Exported helpers ──────────────────────────────────────────────────
function broadcastPiStatus(online) {
  broadcastToAll(JSON.stringify({ type: WS_TYPES.PI_STATUS, online }));
}
function sendToPi(obj) {
  if (piClient && piClient.readyState === WebSocket.OPEN) piClient.send(JSON.stringify(obj));
  else console.warn('[WS] sendToPi: Pi not connected. Dropped:', obj.type);
}
function broadcastToAll(rawStr) {
  if (!wss) return;
  wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN && c !== piClient) c.send(rawStr); });
}
function broadcastActuatorState(partial) {
  broadcastToAll(JSON.stringify({ type: WS_TYPES.ACTUATOR_STATE, data: partial }));
}
function broadcastNotification(message, level='info') {
  broadcastToAll(JSON.stringify({ type: WS_TYPES.NOTIFICATION, message, level }));
}
function getPiOnline() { return piOnline; }

module.exports = { init, sendToPi, broadcastActuatorState, broadcastNotification, broadcastToAll, getPiOnline };
