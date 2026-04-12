// packages/backend/src/routes/automation.js
// GET  /api/automation          — current settings
// PUT  /api/automation          — update target values and per-sensor toggles
// POST /api/automation/mode     — enable or disable automation mode

const router  = require('express').Router();
const { requireAuth }       = require('../middleware/auth');
const { requirePageAccess } = require('../middleware/roles');
const { AutomationSettings, ActuatorState, ActivityLog } = require('../models/models');
const { validateTargets, checkValidation } = require('../utils/validators');
const wsService = require('../services/wsService');

router.use(requireAuth, requirePageAccess('automation'));

// ── GET /api/automation ───────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    // Upsert: create with defaults if not yet in DB
    let settings = await AutomationSettings.findById('singleton');
    if (!settings) {
      settings = await AutomationSettings.create({ _id: 'singleton' });
    }
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/automation ───────────────────────────────────────────────
// Update target setpoints and per-sensor toggles.
// Body: { targets: { temperature: 24, ... }, enabled: { temperature: true, ... } }
router.put('/', validateTargets, checkValidation, async (req, res, next) => {
  try {
    const { targets, enabled } = req.body;

    const update = { lastUpdatedBy: req.user._id };
    if (targets) update.targets = targets; // Validator already bounds-checked these
    if (enabled) update.enabled = enabled;

    const settings = await AutomationSettings.findByIdAndUpdate(
      'singleton',
      { $set: update },
      { new: true, upsert: true }
    );

    // Send updated targets to the Pi so the Arduino can adjust
    wsService.sendToPi({ type: 'TARGET_UPDATE', targets: settings.targets, enabled: settings.enabled });

    // Log what changed
    const changes = [];
    if (targets) {
      Object.entries(targets).forEach(([k, v]) => changes.push(`${k} → ${v}`));
    }
    if (changes.length) {
      await ActivityLog.create({
        userId:   req.user._id,
        username: req.user.username,
        action:   `Updated automation targets: ${changes.join(', ')}`,
        page:     'automation',
      });
    }

    res.json(settings);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/automation/mode ─────────────────────────────────────────
// Body: { enabled: true|false }
// When automation is turned ON: all manual actuators are auto-turned OFF.
router.post('/mode', async (req, res, next) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: '"enabled" must be a boolean' });
    }

    const settings = await AutomationSettings.findByIdAndUpdate(
      'singleton',
      { automationEnabled: enabled },
      { new: true, upsert: true }
    );

    // When switching back to AUTO, kill all actuators (safety requirement)
    if (enabled) {
      const allOff = {
        pump1: false, pump2: false, peristaltic: false,
        peltier: false, peltierFan: false,
        intakeFan: false, exhaustFan: false, mister: false,
      };
      await ActuatorState.findByIdAndUpdate('singleton', allOff, { upsert: true });
      wsService.sendToPi({ type: 'ACTUATOR_CMD', actuator: 'all', on: false });
      wsService.broadcastActuatorState(allOff);
    }

    // Notify Pi of new mode
    wsService.sendToPi({ type: 'AUTO_MODE', enabled });

    await ActivityLog.create({
      userId:   req.user._id,
      username: req.user.username,
      action:   `Automation mode ${enabled ? 'ENABLED' : 'DISABLED'}`,
      page:     'automation',
    });

    res.json({ automationEnabled: enabled });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/automation/priority ──────────────────────────────────────
// Body: { priorityOrder: ['temperature','soilMoisture','npk','humidity'] }
// Allows users to reorder the automation priority.
const VALID_PRIORITY_ITEMS = ['temperature', 'soilMoisture', 'npk', 'humidity'];

router.put('/priority', async (req, res, next) => {
  try {
    const { priorityOrder } = req.body;

    // Validate: must be an array containing exactly the 4 valid items
    if (!Array.isArray(priorityOrder) || priorityOrder.length !== 4) {
      return res.status(400).json({ error: 'priorityOrder must be an array of exactly 4 items' });
    }
    const sorted = [...priorityOrder].sort();
    const valid  = [...VALID_PRIORITY_ITEMS].sort();
    if (JSON.stringify(sorted) !== JSON.stringify(valid)) {
      return res.status(400).json({ error: `priorityOrder must contain exactly: ${VALID_PRIORITY_ITEMS.join(', ')}` });
    }

    const settings = await AutomationSettings.findByIdAndUpdate(
      'singleton',
      { priorityOrder },
      { new: true, upsert: true }
    );

    // Send updated priority to the Pi
    wsService.sendToPi({ type: 'PRIORITY_ORDER', priorityOrder });

    // Log the change (required per spec)
    await ActivityLog.create({
      userId:   req.user._id,
      username: req.user.username,
      action:   `Changed automation priority order to: ${priorityOrder.join(' → ')}`,
      page:     'automation',
    });

    res.json({ priorityOrder: settings.priorityOrder });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
