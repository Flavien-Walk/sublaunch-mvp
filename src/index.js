require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');

let helmet;
try {
  helmet = require('helmet');
} catch (e) {
  // helmet not installed yet — will be added to package.json
  helmet = null;
}

const app = express();

// === Security headers ===
if (helmet) {
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
  }));
} else {
  // Minimal security headers without helmet
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
}

// === CORS ===
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'https://sublaunch-mvp.vercel.app',
  'http://localhost:3000',
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// === Stripe webhook MUST be raw body (before json middleware) ===
const stripeRoutes = require('./routes/stripe');
app.use('/api/stripe', (req, res, next) => {
  if (req.originalUrl === '/api/stripe/webhook') {
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    express.json()(req, res, next);
  }
});
app.use('/api/stripe', stripeRoutes);

// === JSON parser for all other routes ===
app.use(express.json({ limit: '1mb' }));

// === Rate limiting — general ===
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
app.use('/api/', limiter);

// === Rate limiting — auth endpoints (stricter) ===
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts. Please wait 15 minutes.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// === Health check (for Render wakeup polling) ===
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// === Routes ===
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/creator', require('./routes/creator'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/telegram', require('./routes/telegram'));
app.use('/api/affiliate', require('./routes/affiliate'));
app.use('/api/saas', require('./routes/saas'));
app.use('/api/test', require('./routes/test'));

// === 404 ===
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// === Error handler (never leak stack traces to client) ===
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  if (statusCode >= 500) {
    console.error('[error]', err.stack || err.message);
  }
  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal server error' : (err.message || 'Error'),
  });
});

// === MongoDB + Start ===
const PORT = process.env.PORT || 5000;

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set. Check your environment variables.');
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
})
  .then(() => {
    console.log('✅ MongoDB connected');

    // Start the expiration cron AFTER DB is connected
    const { startExpirationCron } = require('./services/cronService');
    startExpirationCron();

    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('👉 Check: 1) MONGODB_URI env var is set  2) MongoDB Atlas IP whitelist includes 0.0.0.0/0');
    process.exit(1);
  });

module.exports = app;
