require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');

const app = express();

// === CORS ===
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'https://sublaunch-mvp.vercel.app',
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
app.use(express.json());

// === Rate limiting ===
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

// === Routes ===
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/creator', require('./routes/creator'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/telegram', require('./routes/telegram'));
app.use('/api/affiliate', require('./routes/affiliate'));

// === Health check ===
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// === 404 ===
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// === Error handler ===
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// === MongoDB + Start ===
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

module.exports = app;
