const TelegramBot = require('node-telegram-bot-api');

let bot = null;

function getBot(customToken) {
  const token = customToken || process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token === 'REPLACE_WITH_YOUR_BOT_TOKEN') return null;
  if (customToken) return new TelegramBot(token); // custom token always creates new instance
  if (!bot) bot = new TelegramBot(token);
  return bot;
}

/**
 * Generate a one-time-use, 24h invite link for the group
 */
async function createInviteLink(groupId, customToken) {
  const b = getBot(customToken);
  if (!b) throw new Error('Telegram bot not configured');

  const expireDate = Math.floor(Date.now() / 1000) + 86400; // 24h from now
  const result = await b.createChatInviteLink(groupId, {
    member_limit: 1,         // single use
    expire_date: expireDate,
    name: `access_${Date.now()}`,
  });

  return {
    inviteLink: result.invite_link,
    inviteLinkId: result.name,
    expiresAt: new Date(expireDate * 1000),
  };
}

/**
 * Revoke an invite link (prevent unused links from being used)
 */
async function revokeInviteLink(groupId, inviteLink, customToken) {
  const b = getBot(customToken);
  if (!b) return;
  try {
    await b.revokeChatInviteLink(groupId, inviteLink);
  } catch (err) {
    console.error('[telegram] revokeInviteLink error:', err.message);
  }
}

/**
 * Ban then immediately unban a user from the group.
 * Ban removes them; immediate unban allows them to rejoin if they resubscribe.
 * telegramUserId must be a numeric user ID (not @username).
 */
async function removeUserFromGroup(groupId, telegramUserId, customToken) {
  const b = getBot(customToken);
  if (!b) throw new Error('Telegram bot not configured');

  // Telegram API requires numeric ID
  const numericId = parseInt(telegramUserId, 10);
  if (isNaN(numericId)) {
    console.error(`[telegram] removeUserFromGroup: invalid telegramUserId "${telegramUserId}"`);
    return { success: false, error: 'Invalid telegramUserId (must be numeric)' };
  }

  try {
    console.log(`[telegram] Banning user ${numericId} from group ${groupId}`);
    await b.banChatMember(groupId, numericId);

    // Unban immediately so they can rejoin later if they resubscribe
    await b.unbanChatMember(groupId, numericId);
    console.log(`[telegram] User ${numericId} removed and unbanned successfully`);
    return { success: true };
  } catch (err) {
    console.error(`[telegram] removeUserFromGroup error for ${numericId}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Check if a user is a member of the group
 */
async function checkMembership(groupId, telegramUserId, customToken) {
  const b = getBot(customToken);
  if (!b) return false;
  try {
    const numericId = parseInt(telegramUserId, 10);
    const member = await b.getChatMember(groupId, numericId);
    return ['member', 'administrator', 'creator'].includes(member.status);
  } catch {
    return false;
  }
}

/**
 * Get group info for validation
 */
async function getGroupInfo(groupId, customToken) {
  const b = getBot(customToken);
  if (!b) throw new Error('Telegram bot not configured');
  return b.getChat(groupId);
}

/**
 * Send a message to a user via the bot (used for deep-link confirmations)
 */
async function sendMessage(telegramUserId, text, customToken) {
  const b = getBot(customToken);
  if (!b) return;
  try {
    const numericId = parseInt(telegramUserId, 10);
    await b.sendMessage(numericId, text, { parse_mode: 'HTML' });
  } catch (err) {
    console.error(`[telegram] sendMessage error to ${telegramUserId}:`, err.message);
  }
}

module.exports = {
  createInviteLink,
  revokeInviteLink,
  removeUserFromGroup,
  checkMembership,
  getGroupInfo,
  sendMessage,
  getBot,
};
