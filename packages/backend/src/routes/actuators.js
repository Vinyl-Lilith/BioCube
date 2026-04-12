// packages/backend/src/routes/actuators.js
// GET  /api/actuators           — current state of all actuators
// POST /api/actuators/:name     — toggle an actuator on/off (manual mode)
//
// Business rules enforced here:
//   • Peltier cannot be turned ON within 10 min of being turned OFF
//   • Peltier fan stays ON for 60 s after Peltier turns OFF
//   • Only reachable when automation is disabled (manual mode)

const router  = require('express').Router();
const { requireAuth }       = require('../middleware/auth');
const { requirePageAccess } = require('../middleware/roles');
const { ActivityLog, ActuatorState, AutomationSettings, SystemLog } = require('../models/models');
const { PELTIER_COOLDOWN_MS, PELTIER_FAN_AFTER_OFF_MS } = require('../config/constants');
const wsService = require('../services/wsService');

// Valid actuator names — prevents arbitrary field injection
const ACTUATORS = ['pump1','pump2','peristaltic','peltier','peltierFan','intakeFan','exhaustFan','mister'];

router.use(requireAuth, requirePageAccess('manual'));

// ── GET /api/actuators ────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    // Find the singleton doc; create it with defaults if it doesn't exist yet
    let state = await ActuatorState.findById('singleton');
    if (!state) state = await ActuatorState.create({ _id: 'singleton' });
    res.json(state);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/actuators/:name ─────────────────────────────────────────
// Body: { on: true|false }
router.post('/:name', async (req, res, next) => {
  try {
    const { name } = req.params;
    const { on }   = req.body;

    // Validate actuator name
    if (!ACTUATORS.includes(name)) {
      return res.status(400).json({ error: `Unknown actuator: ${name}` });
    }
    if (typeof on !== 'boolean') {
      return res.status(400).json({ error: '"on" must be a boolean' });
    }

    // Ensure automation is off — actuators cannot be manually toggled
    // while the Arduino is in automatic mode
    const settings = await AutomationSettings.findById('singleton');
    if (settings?.automationEnabled) {
      return res.status(409).json({ error: 'Disable automation mode before using manual controls' });
    }

    let state = await ActuatorState.findById('singleton');
    if (!state) state = await ActuatorState.create({ _id: 'singleton' });

    // ── Peltier-specific failsafes ─────────────────────────────────
    if (name === 'peltier' && on) {
      // Check if 10-minute cooldown has elapsed since it was last turned off
      if (state.peltierLastOffAt) {
        const elapsed = Date.now() - state.peltierLastOffAt.getTime();
        if (elapsed < PELTIER_COOLDOWN_MS) {
          const remaining = Math.ceil((PELTIER_COOLDOWN_MS - elapsed) / 1000);
          return res.status(409).json({
            error: `Peltier is in cooldown. ${remaining}s remaining.`,
            cooldownRemaining: remaining,
          });
        }
      }
    }

    if (name === 'peltier' && !on) {
      // Record the time the Peltier was turned off for cooldown enforcement
      state.peltierLastOffAt = new Date();

      // Auto-schedule Peltier fan to turn off after 60 seconds
      setTimeout(async () => {
        try {
          const s = await ActuatorState.findById('singleton');
          if (s && s.peltierFan) {
            s.peltierFan = false;
            await s.save();
            // Notify Pi and browser clients
            wsService.broadcastActuatorState({ peltierFan: false });
            await SystemLog.create({
              source: 'system', level: 'ok',
              message: 'Peltier fan auto-off after 60s post-Peltier shutdown',
            });
          }
        } catch (e) {
          console.error('[Peltier Fan Auto-off]', e.message);
        }
      }, PELTIER_FAN_AFTER_OFF_MS);
    }

    // Apply the state change
    state[name] = on;
    await state.save();

    // Forward the command to the Raspberry Pi via WebSocket
    wsService.sendToPi({ type: 'ACTUATOR_CMD', actuator: name, on });

    // Broadcast updated state to all connected browser clients
    wsService.broadcastActuatorState({ [name]: on });

    // Log the user action (excluding credential-related actions)
    await ActivityLog.create({
      userId:   req.user._id,
      username: req.user.username,
      action:   `Turned ${on ? 'ON' : 'OFF'} ${name} (Manual mode)`,
      page:     'manual',
    });

    res.json({ [name]: on });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/actuators/all-off ───────────────────────────────────────
// Emergency kill-all: turns off every actuator at once.
router.post('/all-off', async (req, res, next) => {
  try {
    const settings = await AutomationSettings.findById('singleton');
    if (settings?.automationEnabled) {
      return res.status(409).json({ error: 'Disable automation mode first' });
    }

    const off = Object.fromEntries(ACTUATORS.map(a => [a, false]));
    off.peltierLastOffAt = new Date(); // Record peltier off time just in case
    await ActuatorState.findByIdAndUpdate('singleton', off, { upsert: true });

    wsService.sendToPi({ type: 'ACTUATOR_CMD', actuator: 'all', on: false });
    wsService.broadcastActuatorState(off);

    await ActivityLog.create({
      userId:   req.user._id,
      username: req.user.username,
      action:   'Emergency ALL-OFF — all actuators disabled',
      page:     'manual',
    });

    res.json({ message: 'All actuators turned off' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
