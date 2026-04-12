// packages/backend/src/services/cronService.js
// Scheduled background jobs.
// MongoDB TTL indexes handle SensorData cleanup automatically,
// but we use cron for anything that needs custom logic.

const cron       = require('node-cron');
const SensorData = require('../models/SensorData');
const { SystemLog, AdminRequest } = require('../models/models');
const { DATA_RETENTION_DAYS }     = require('../config/constants');

function startCronJobs() {

  // ── Daily at midnight: hard-delete any sensor records older than 30 days ──
  // Belt-and-suspenders alongside the TTL index — in case of index issues.
  cron.schedule('0 0 * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const result = await SensorData.deleteMany({ createdAt: { $lt: cutoff } });
      if (result.deletedCount > 0) {
        await SystemLog.create({
          source: 'system', level: 'ok',
          message: `Cron: deleted ${result.deletedCount} sensor records older than ${DATA_RETENTION_DAYS} days`,
        });
        console.log(`[Cron] Deleted ${result.deletedCount} old sensor records`);
      }
    } catch (err) {
      console.error('[Cron] Sensor data cleanup failed:', err.message);
      await SystemLog.create({
        source: 'system', level: 'error',
        message: `Cron: sensor data cleanup failed — ${err.message}`,
      }).catch(() => {});
    }
  });

  // ── Every hour: clean up stale pending admin requests older than 7 days ──
  cron.schedule('0 * * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      await AdminRequest.deleteMany({ createdAt: { $lt: cutoff }, status: 'pending' });
    } catch (err) {
      console.error('[Cron] AdminRequest cleanup failed:', err.message);
    }
  });

  console.log('[Cron] Scheduled jobs started');
}

module.exports = { startCronJobs };
