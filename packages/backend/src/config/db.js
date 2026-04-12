// packages/backend/src/config/db.js
// Connects to MongoDB using Mongoose.
// Retries on failure and logs connection state.

const mongoose = require('mongoose');

// Maximum number of automatic reconnect attempts before giving up
const MAX_RETRIES = 5;
let retries = 0;

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      // These two options silence deprecation warnings in Mongoose 7+
      serverSelectionTimeoutMS: 5000,  // Fail fast if DB not reachable
    });
    retries = 0; // Reset retry counter on successful connect
    console.log('[DB] MongoDB connected:', mongoose.connection.host);
  } catch (err) {
    retries++;
    console.error(`[DB] Connection failed (attempt ${retries}/${MAX_RETRIES}):`, err.message);

    if (retries < MAX_RETRIES) {
      // Wait 3 seconds then retry
      console.log('[DB] Retrying in 3s...');
      setTimeout(connectDB, 3000);
    } else {
      console.error('[DB] Max retries reached. Exiting.');
      process.exit(1); // Kill the process so Render can restart it
    }
  }
}

// Mongoose fires this event if the connection drops after initial connect
mongoose.connection.on('disconnected', () => {
  console.warn('[DB] MongoDB disconnected. Attempting reconnect...');
  retries = 0;
  connectDB();
});

module.exports = connectDB;
