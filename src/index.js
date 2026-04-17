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

    // Start Telegram bot polling for deep-link account linking (/start TOKEN)
    startTelegramBot();

    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('👉 Check: 1) MONGODB_URI env var is set  2) MongoDB Atlas IP whitelist includes 0.0.0.0/0');
    process.exit(1);
  });

/**
 * Telegram bot — two responsibilities:
 * 1. Deep-link account linking: /start TOKEN → saves telegramUserId, sends invite link
 * 2. Group membership guard: when a user joins the group, verify they have an active
 *    subscription; kick immediately if not found.
 */
function startTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token === 'REPLACE_WITH_YOUR_BOT_TOKEN') {
    console.log('[telegram] Bot token not set — polling disabled');
    return;
  }

  try {
    const TelegramBot = require('node-telegram-bot-api');
    // Request chat_member updates so the bot sees members joining/leaving
    const bot = new TelegramBot(token, {
      polling: {
        interval: 2000,
        autoStart: true,
        params: { allowed_updates: ['message', 'chat_member', 'my_chat_member'] },
      },
    });

    const TelegramToken = require('./models/TelegramToken');
    const User = require('./models/User');
    const Subscription = require('./models/Subscription');
    const telegramService = require('./services/telegramService');

    // ── 1. /start TOKEN — account deep-link ──────────────────────────────
    bot.on('message', async (msg) => {
      if (msg.chat.type !== 'private') return;
      const text = msg.text || '';
      if (!text.startsWith('/start')) return;

      const linkToken = text.split(' ')[1];
      const chatId = msg.chat.id;

      if (!linkToken) {
        bot.sendMessage(chatId, '👋 Bienvenue ! Utilisez le lien de liaison fourni dans votre espace membre SubLaunch.');
        return;
      }

      try {
        const tgToken = await TelegramToken.findOne({ token: linkToken, isUsed: false });
        if (!tgToken || tgToken.expiresAt < new Date()) {
          bot.sendMessage(chatId, '❌ Lien invalide ou expiré. Régénérez-en un depuis votre dashboard.');
          return;
        }

        const telegramUserId = String(msg.from.id);
        const telegramUsername = msg.from.username;

        const conflict = await User.findOne({ telegramUserId });
        if (conflict && String(conflict._id) !== String(tgToken.userId)) {
          bot.sendMessage(chatId, '❌ Ce compte Telegram est déjà lié à un autre compte SubLaunch.');
          return;
        }

        await User.findByIdAndUpdate(tgToken.userId, { telegramUserId, telegramUsername });
        await tgToken.markUsed(telegramUserId);

        if (tgToken.subscriptionId) {
          const sub = await Subscription.findById(tgToken.subscriptionId);
          const groupId = process.env.TELEGRAM_GROUP_ID;
          if (sub && sub.status === 'active' && groupId) {
            const { inviteLink } = await telegramService.createInviteLink(groupId);
            sub.telegramInviteLink = inviteLink;
            sub.telegramAccessActive = true;
            await sub.save();
            bot.sendMessage(chatId,
              `✅ Compte lié !\n\n🔗 Votre lien d'accès privé au groupe :\n${inviteLink}\n\n` +
              `⚠️ Ce lien est personnel et à usage unique. Ne le partagez pas.`
            );
            return;
          }
        }
        bot.sendMessage(chatId, '✅ Compte Telegram lié avec succès !');
      } catch (err) {
        console.error('[bot] /start error:', err.message);
        bot.sendMessage(chatId, '❌ Erreur interne. Contactez le support.');
      }
    });

    // ── 2. Group membership guard ─────────────────────────────────────────
    // Fires when the bot sees a chat_member status change (join/leave).
    // Bot must be an admin with "Ban users" permission in the group.
    bot.on('chat_member', async (update) => {
      const groupId = process.env.TELEGRAM_GROUP_ID;
      if (!groupId) return;

      const chatId = String(update.chat.id);
      if (chatId !== String(groupId)) return; // ignore other groups

      const newStatus = update.new_chat_member?.status;
      const oldStatus = update.old_chat_member?.status;

      // Only react when someone becomes a member (joins)
      if (newStatus !== 'member' && newStatus !== 'restricted') return;
      if (oldStatus === 'member' || oldStatus === 'administrator' || oldStatus === 'creator') return;

      const telegramUserId = String(update.new_chat_member.user.id);
      if (update.new_chat_member.user.is_bot) return; // never kick bots

      try {
        const user = await User.findOne({ telegramUserId });
        if (!user) {
          console.log(`[bot] Unknown user ${telegramUserId} joined group — kicking`);
          await bot.banChatMember(groupId, parseInt(telegramUserId));
          await bot.unbanChatMember(groupId, parseInt(telegramUserId));
          return;
        }

        const activeSub = await Subscription.findOne({ userId: user._id, status: 'active' });
        if (!activeSub) {
          console.log(`[bot] User ${telegramUserId} (${user.email}) has no active subscription — kicking`);
          await bot.banChatMember(groupId, parseInt(telegramUserId));
          await bot.unbanChatMember(groupId, parseInt(telegramUserId));
          bot.sendMessage(telegramUserId,
            '❌ Votre abonnement est inactif ou expiré. Renouvelez-le sur votre espace membre pour rejoindre le groupe.'
          ).catch(() => {});
          return;
        }

        console.log(`[bot] User ${telegramUserId} (${user.email}) verified — active subscription ${activeSub._id}`);
      } catch (err) {
        console.error('[bot] chat_member guard error:', err.message);
      }
    });

    bot.on('polling_error', (err) => {
      if (err.code !== 'ETELEGRAM') console.error('[telegram] Polling error:', err.message);
    });

    console.log('[telegram] Bot polling started (account linking + group guard active)');
  } catch (err) {
    console.error('[telegram] Failed to start bot polling:', err.message);
  }
}

module.exports = app;
