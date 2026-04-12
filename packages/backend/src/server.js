// packages/backend/src/server.js
// Application entry point.
// Sets up Express, mounts routes, attaches WebSocket server,
// starts cron jobs, and connects to MongoDB.

require('dotenv').config();

const http        = require('http');
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const rateLimit   = require('express-rate-limit');

const connectDB      = require('./config/db');
const errorHandler   = require('./middleware/errorHandler');
const wsService      = require('./services/wsService');
const { startCronJobs } = require('./services/cronService');

// ── Route modules ──────────────────────────────────────────────────────
const authRoutes       = require('./routes/auth');
const sensorsRoutes    = require('./routes/sensors');
const actuatorsRoutes  = require('./routes/actuators');
const automationRoutes = require('./routes/automation');
const adminRoutes      = require('./routes/admin');
const settingsRoutes   = require('./routes/settings');

const app    = express();
const server = http.createServer(app); // Shared server for HTTP + WebSocket

const PORT = process.env.PORT || 4000;

// ── CORS ──────────────────────────────────────────────────────────────
// Allow requests from the frontend origin (set in .env).
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',');

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (e.g. mobile apps, curl)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
}));

// ── Security headers ──────────────────────────────────────────────────
app.use(helmet());

// ── Request logging ───────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Body parsing ──────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));   // 1 MB max body size

// ── Rate limiting ─────────────────────────────────────────────────────
// Prevent brute-force on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // max 20 requests per window per IP
  message: { error: 'Too many requests — please wait 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  message: { error: 'Too many requests' },
});

// ── Routes ────────────────────────────────────────────────────────────
app.use('/api/auth',       authLimiter,  authRoutes);
app.use('/api/sensors',    apiLimiter,   sensorsRoutes);
app.use('/api/actuators',  apiLimiter,   actuatorsRoutes);
app.use('/api/automation', apiLimiter,   automationRoutes);
app.use('/api/admin',      apiLimiter,   adminRoutes);
app.use('/api/settings',   apiLimiter,   settingsRoutes);

// ── Health check ──────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 handler ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler (must be last) ───────────────────────────────
app.use(errorHandler);

// ── Start everything ──────────────────────────────────────────────────
async function start() {
  await connectDB(); // Wait for MongoDB before accepting requests

  wsService.init(server); // Attach WebSocket to the shared http server
  startCronJobs();         // Start background maintenance jobs

  server.listen(PORT, () => {
    console.log(`[Server] BioCube backend running on port ${PORT}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV}`);
  });
}

start().catch(err => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
