const axios = require('axios');
const EmailLog = require('../models/EmailLog');

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

function getFrom() {
  return {
    email: process.env.BREVO_FROM_EMAIL || 'noreply@sublaunch.app',
    name: process.env.BREVO_FROM_NAME || 'SubLaunch',
  };
}

async function sendEmail({ toEmail, toName, subject, htmlContent, type, userId }) {
  const apiKey = process.env.BREVO_API_KEY;

  // If no API key, just log (dev mode)
  if (!apiKey || apiKey === 'REPLACE_WITH_YOUR_BREVO_API_KEY') {
    console.log(`[EMAIL SKIP - no key] type=${type} to=${toEmail} subject="${subject}"`);
    return { success: true, skipped: true };
  }

  try {
    const response = await axios.post(BREVO_API_URL, {
      sender: getFrom(),
      to: [{ email: toEmail, name: toName || toEmail }],
      subject,
      htmlContent,
    }, {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    await EmailLog.create({
      userId, toEmail, type, subject, status: 'sent',
      brevoMessageId: response.data?.messageId,
    }).catch(() => {});

    return { success: true };
  } catch (err) {
    const errMsg = err.response?.data?.message || err.message;
    console.error(`Email error [${type}] to ${toEmail}:`, errMsg);
    await EmailLog.create({ userId, toEmail, type, subject, status: 'failed', error: errMsg }).catch(() => {});
    return { success: false, error: errMsg };
  }
}

// ========== TEMPLATES ==========

async function sendVerificationCode({ toEmail, firstName, code, userId }) {
  return sendEmail({
    toEmail, userId, type: 'verification_code',
    subject: 'Votre code de vérification SubLaunch',
    htmlContent: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f0f13;color:#f8fafc">
        <h2 style="color:#6366f1;margin-bottom:8px">SubLaunch</h2>
        <p>Bonjour ${firstName || ''},</p>
        <p>Votre code de vérification :</p>
        <div style="background:#1e1e2e;border-radius:12px;padding:24px;text-align:center;margin:24px 0;border:1px solid #2d2d3d">
          <span style="font-size:40px;font-weight:bold;letter-spacing:10px;color:#6366f1">${code}</span>
        </div>
        <p style="color:#94a3b8;font-size:14px">Expire dans 15 minutes. Ne pas partager.</p>
      </div>`,
  });
}

async function sendWelcomeEmail({ toEmail, firstName, userId }) {
  return sendEmail({
    toEmail, userId, type: 'welcome',
    subject: 'Bienvenue sur SubLaunch 🎉',
    htmlContent: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f0f13;color:#f8fafc">
        <h2 style="color:#6366f1">Bienvenue !</h2>
        <p>Bonjour ${firstName || ''},</p>
        <p>Votre compte est activé.</p>
        <a href="${process.env.FRONTEND_URL}/login" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px;font-weight:500">Accéder à mon compte</a>
      </div>`,
  });
}

async function sendPasswordResetEmail({ toEmail, firstName, resetLink, userId }) {
  return sendEmail({
    toEmail, userId, type: 'password_reset',
    subject: 'Réinitialisation de votre mot de passe SubLaunch',
    htmlContent: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f0f13;color:#f8fafc">
        <h2 style="color:#6366f1">SubLaunch</h2>
        <p>Bonjour ${firstName || ''},</p>
        <p>Cliquez ci-dessous pour réinitialiser votre mot de passe (valable 1h).</p>
        <a href="${resetLink}" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px;font-weight:500">Réinitialiser</a>
        <p style="color:#64748b;font-size:13px;margin-top:24px">Si vous n'avez pas demandé ceci, ignorez cet email.</p>
      </div>`,
  });
}

async function sendPaymentSuccessEmail({ toEmail, firstName, planName, amount, currency, telegramLink, userId }) {
  return sendEmail({
    toEmail, userId, type: 'payment_success',
    subject: `✅ Paiement confirmé — ${planName}`,
    htmlContent: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f0f13;color:#f8fafc">
        <h2 style="color:#6366f1">Paiement confirmé !</h2>
        <p>Bonjour ${firstName || ''},</p>
        <p>Abonnement <strong>${planName}</strong> actif — <strong>${(amount / 100).toFixed(2)} ${(currency || 'EUR').toUpperCase()}</strong></p>
        ${telegramLink ? `
        <div style="background:#0d2010;border:1px solid #166534;border-radius:12px;padding:20px;margin:24px 0">
          <p style="margin:0 0 12px;font-weight:600;color:#4ade80">Votre lien Telegram (usage unique, 24h) :</p>
          <a href="${telegramLink}" style="color:#6366f1;word-break:break-all">${telegramLink}</a>
        </div>` : ''}
        <a href="${process.env.FRONTEND_URL}/dashboard" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:8px;font-weight:500">Mon tableau de bord</a>
      </div>`,
  });
}

async function sendPaymentFailedEmail({ toEmail, firstName, planName, userId }) {
  return sendEmail({
    toEmail, userId, type: 'payment_failed',
    subject: `⚠️ Échec de paiement — ${planName}`,
    htmlContent: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f0f13;color:#f8fafc">
        <h2 style="color:#ef4444">Échec de paiement</h2>
        <p>Bonjour ${firstName || ''},</p>
        <p>Le paiement pour <strong>${planName}</strong> a échoué. Accès suspendu si non régularisé.</p>
        <a href="${process.env.FRONTEND_URL}/dashboard/billing" style="display:inline-block;background:#ef4444;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px;font-weight:500">Mettre à jour mon paiement</a>
      </div>`,
  });
}

async function sendSubscriptionCanceledEmail({ toEmail, firstName, planName, userId }) {
  return sendEmail({
    toEmail, userId, type: 'subscription_canceled',
    subject: `Abonnement annulé — ${planName}`,
    htmlContent: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f0f13;color:#f8fafc">
        <h2 style="color:#6366f1">SubLaunch</h2>
        <p>Bonjour ${firstName || ''},</p>
        <p>Abonnement <strong>${planName}</strong> annulé. Accès Telegram révoqué.</p>
        <a href="${process.env.FRONTEND_URL}" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px;font-weight:500">Se réabonner</a>
      </div>`,
  });
}

async function sendAccessSuspendedEmail({ toEmail, firstName, userId }) {
  return sendEmail({
    toEmail, userId, type: 'access_suspended',
    subject: 'Votre accès Telegram a été suspendu',
    htmlContent: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f0f13;color:#f8fafc">
        <h2 style="color:#f59e0b">Accès suspendu</h2>
        <p>Bonjour ${firstName || ''},</p>
        <p>Accès Telegram suspendu suite à un problème avec votre abonnement.</p>
        <a href="${process.env.FRONTEND_URL}/dashboard/billing" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px;font-weight:500">Régulariser</a>
      </div>`,
  });
}

async function sendTelegramLinkEmail({ toEmail, firstName, telegramLink, userId }) {
  return sendEmail({
    toEmail, userId, type: 'telegram_access',
    subject: '🔗 Votre lien d\'accès Telegram',
    htmlContent: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f0f13;color:#f8fafc">
        <h2 style="color:#6366f1">Accès Telegram</h2>
        <p>Bonjour ${firstName || ''},</p>
        <div style="background:#0d2010;border:1px solid #166534;border-radius:12px;padding:20px;margin:24px 0">
          <p style="margin:0 0 12px;font-weight:600;color:#4ade80">Lien (usage unique, 24h) :</p>
          <a href="${telegramLink}" style="color:#6366f1;word-break:break-all;font-weight:bold">${telegramLink}</a>
        </div>
      </div>`,
  });
}

async function sendCrmManualEmail({ toEmail, firstName, subject, message, userId }) {
  return sendEmail({
    toEmail, userId, type: 'crm_manual', subject,
    htmlContent: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f0f13;color:#f8fafc">
        <p>Bonjour ${firstName || ''},</p>
        ${message.split('\n').map(l => `<p style="margin:0 0 12px">${l}</p>`).join('')}
        <hr style="margin-top:32px;border:none;border-top:1px solid #1e1e2e">
        <p style="color:#475569;font-size:12px">SubLaunch</p>
      </div>`,
  });
}

module.exports = {
  sendVerificationCode,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  sendSubscriptionCanceledEmail,
  sendAccessSuspendedEmail,
  sendTelegramLinkEmail,
  sendCrmManualEmail,
};
