// packages/backend/src/routes/sensors.js
// GET  /api/sensors/latest      — most recent snapshot
// GET  /api/sensors/history     — paginated history with date range
// GET  /api/sensors/export/excel
// GET  /api/sensors/export/chart

const router     = require('express').Router();
const SensorData = require('../models/SensorData');
const { requireAuth }     = require('../middleware/auth');
const { requirePageAccess } = require('../middleware/roles');
const { validateDateRange, checkValidation } = require('../utils/validators');
const { buildExcelBuffer, buildChartData }   = require('../utils/exportData');

// All sensor routes require a logged-in user with home-page access
router.use(requireAuth, requirePageAccess('home'));

// ── GET /api/sensors/latest ───────────────────────────────────────────
// Returns the single most recent sensor reading.
// Used by the dashboard to show "live" values on page load.
// The actual live feed goes through WebSocket.
router.get('/latest', async (req, res, next) => {
  try {
    const latest = await SensorData.findOne().sort({ createdAt: -1 }).lean();
    res.json(latest || {});
  } catch (err) {
    next(err);
  }
});

// ── GET /api/sensors/history ──────────────────────────────────────────
// Query params: from, to (ISO dates), page (default 1), limit (default 100)
// Returns paginated sensor readings for the selected date range.
router.get('/history', validateDateRange, checkValidation, async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(1000, parseInt(req.query.limit) || 100);
    const skip  = (page - 1) * limit;

    const filter = {
      createdAt: {
        $gte: new Date(from),
        $lte: new Date(new Date(to).setHours(23, 59, 59, 999)),
      },
    };

    const [rows, total] = await Promise.all([
      SensorData.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit).lean(),
      SensorData.countDocuments(filter),
    ]);

    res.json({ rows, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/sensors/export/excel ─────────────────────────────────────
// Returns a .xlsx file download.
router.get('/export/excel', validateDateRange, checkValidation, async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const rows = await SensorData.find({
      createdAt: {
        $gte: new Date(from),
        $lte: new Date(new Date(to).setHours(23, 59, 59, 999)),
      },
    }).sort({ createdAt: 1 }).lean();

    const buffer = buildExcelBuffer(rows);
    res.setHeader('Content-Disposition', `attachment; filename="biocube_${from}_to_${to}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/sensors/export/chart ────────────────────────────────────
// Returns JSON array of data points for the frontend chart renderer.
router.get('/export/chart', validateDateRange, checkValidation, async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const rows = await SensorData.find({
      createdAt: {
        $gte: new Date(from),
        $lte: new Date(new Date(to).setHours(23, 59, 59, 999)),
      },
    }).sort({ createdAt: 1 }).lean();

    res.json(buildChartData(rows));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
