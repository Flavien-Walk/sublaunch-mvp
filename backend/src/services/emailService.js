const SibApiV3Sdk = require('sib-api-v3-sdk');
const EmailLog = require('../models/EmailLog');

const client = SibApiV3Sdk.ApiClient.instance;
client.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

const FROM = {
  email: process.env.BREVO_FROM_EMAIL || 'noreply@sublaunch.app',
  name: process.env.BREVO_FROM_NAME || 'SubLaunch',
};

async function sendEmail({ toEmail, toName, subject, htmlContent, type, userId }) {
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.sender = FROM;
  sendSmtpEmail.to = [{ email: toEmail, name: toName || toEmail }];
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = htmlContent;

  try {
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    await EmailLog.create({
      userId,
      toEmail,
      type,
      subject,
      status: 'sent',
      brevoMessageId: result?.messageId,
    });
    return { success: true };
  } catch (err) {
    console.error('Email send error:', err.message);
    await EmailLog.create({ userId, toEmail, type, subject, status: 'failed', error: err.message });
    return { success: false, error: err.message };
  }
}

// === Email templates ===

async function sendVerificationCode({ toEmail, firstName, code, userId }) {
  return sendEmail({
    toEmail, userId, type: 'verification_code',
    subject: 'Votre code de vérification SubLaunch',
    htmlContent: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#6366f1">SubLaunch</h2>
        <p>Bonjour ${firstName || ''},</p>
        <p>Votre code de vérification est :</p>
        <div style="background:#f1f5f9;border-radius:8px;padding:24px;text-align:center;margin:24px 0">
          <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#6366f1">${code}</span>
        </div>
        <p style="color:#64748b;font-size:14px">Ce code expire dans 15 minutes.</p>
      </div>`,
  });
}

async function sendWelcomeEmail({ toEmail, firstName, userId }) {
  return sendEmail({
    toEmail, userId, type: 'welcome',
    subject: 'Bienvenue sur SubLaunch 🎉',
    htmlContent: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#6366f1">Bienvenue sur SubLaunch !</h2>
        <p>Bonjour ${firstName || ''},</p>
        <p>Votre compte est confirmé. Vous pouvez maintenant accéder à la plateforme.</p>
        <a href="${process.env.FRONTEND_URL}/login" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">Accéder à mon compte</a>
      </div>`,
  });
}

async function sendPasswordResetEmail({ toEmail, firstName, resetLink, userId }) {
  return sendEmail({
    toEmail, userId, type: 'password_reset',
    subject: 'Réinitialisation de votre mot de passe SubLaunch',
    htmlContent: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#6366f1">SubLaunch</h2>
        <p>Bonjour ${firstName || ''},</p>
        <p>Cliquez ci-dessous pour réinitialiser votre mot de passe. Ce lien expire dans 1 heure.</p>
        <a href="${resetLink}" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">Réinitialiser mon mot de passe</a>
        <p style="color:#64748b;font-size:13px;margin-top:24px">Si vous n'avez pas demandé cette action, ignorez cet email.</p>
      </div>`,
  });
}

async function sendPaymentSuccessEmail({ toEmail, firstName, planName, amount, currency, telegramLink, userId }) {
  return sendEmail({
    toEmail, userId, type: 'payment_success',
    subject: `✅ Paiement confirmé — ${planName}`,
    htmlContent: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#6366f1">Paiement confirmé !</h2>
        <p>Bonjour ${firstName || ''},</p>
        <p>Votre abonnement <strong>${planName}</strong> est actif. Montant débité : <strong>${(amount / 100).toFixed(2)} ${currency?.toUpperCase()}</strong>.</p>
        ${telegramLink ? `
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:20px;margin:24px 0">
          <p style="margin:0 0 12px;font-weight:bold">Votre lien d'accès Telegram :</p>
          <a href="${telegramLink}" style="color:#6366f1;word-break:break-all">${telegramLink}</a>
          <p style="color:#64748b;font-size:13px;margin-top:8px">Ce lien est à usage unique et valable 24h.</p>
        </div>` : ''}
        <a href="${process.env.FRONTEND_URL}/dashboard" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:8px">Mon tableau de bord</a>
      </div>`,
  });
}

async function sendPaymentFailedEmail({ toEmail, firstName, planName, userId }) {
  return sendEmail({
    toEmail, userId, type: 'payment_failed',
    subject: `⚠️ Échec de paiement — ${planName}`,
    htmlContent: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#ef4444">Échec de paiement</h2>
        <p>Bonjour ${firstName || ''},</p>
        <p>Le paiement pour votre abonnement <strong>${planName}</strong> a échoué. Votre accès sera suspendu si le paiement n'est pas régularisé.</p>
        <a href="${process.env.FRONTEND_URL}/dashboard/billing" style="display:inline-block;background:#ef4444;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">Mettre à jour mon moyen de paiement</a>
      </div>`,
  });
}

async function sendSubscriptionCanceledEmail({ toEmail, firstName, planName, userId }) {
  return sendEmail({
    toEmail, userId, type: 'subscription_canceled',
    subject: `Abonnement annulé — ${planName}`,
    htmlContent: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#6366f1">SubLaunch</h2>
        <p>Bonjour ${firstName || ''},</p>
        <p>Votre abonnement <strong>${planName}</strong> a été annulé. Votre accès au groupe Telegram a été révoqué.</p>
        <p>Vous pouvez vous réabonner à tout moment.</p>
        <a href="${process.env.FRONTEND_URL}" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">Voir les offres</a>
      </div>`,
  });
}

async function sendAccessSuspendedEmail({ toEmail, firstName, userId }) {
  return sendEmail({
    toEmail, userId, type: 'access_suspended',
    subject: `Votre accès Telegram a été suspendu`,
    htmlContent: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#f59e0b">Accès suspendu</h2>
        <p>Bonjour ${firstName || ''},</p>
        <p>Votre accès au groupe Telegram a été suspendu suite à un problème avec votre abonnement.</p>
        <a href="${process.env.FRONTEND_URL}/dashboard/billing" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">Régulariser mon compte</a>
      </div>`,
  });
}

async function sendTelegramLinkEmail({ toEmail, firstName, telegramLink, userId }) {
  return sendEmail({
    toEmail, userId, type: 'telegram_access',
    subject: '🔗 Votre lien d\'accès Telegram',
    htmlContent: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#6366f1">Votre accès Telegram</h2>
        <p>Bonjour ${firstName || ''},</p>
        <p>Voici votre lien d'accès au groupe privé Telegram :</p>
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:20px;margin:24px 0">
          <a href="${telegramLink}" style="color:#6366f1;word-break:break-all;font-weight:bold">${telegramLink}</a>
          <p style="color:#64748b;font-size:13px;margin-top:8px">Ce lien est à usage unique et valable 24h.</p>
        </div>
      </div>`,
  });
}

async function sendCrmManualEmail({ toEmail, firstName, subject, message, userId }) {
  return sendEmail({
    toEmail, userId, type: 'crm_manual',
    subject,
    htmlContent: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <p>Bonjour ${firstName || ''},</p>
        ${message.split('\n').map(l => `<p>${l}</p>`).join('')}
        <hr style="margin-top:32px;border:none;border-top:1px solid #e2e8f0">
        <p style="color:#94a3b8;font-size:12px">SubLaunch — ${process.env.FRONTEND_URL}</p>
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
