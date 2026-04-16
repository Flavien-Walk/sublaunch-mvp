const TelegramBot = require('node-telegram-bot-api');

let bot = null;

function getBot(customToken) {
  const token = customToken || process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token === 'REPLACE_WITH_YOUR_BOT_TOKEN') return null;
  if (!bot || customToken) {
    return new TelegramBot(token);
  }
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
    console.error('Telegram revokeInviteLink error:', err.message);
  }
}

/**
 * Ban (kick) a user from the group — they can't rejoin unless unbanned
 */
async function removeUserFromGroup(groupId, telegramUserId, customToken) {
  const b = getBot(customToken);
  if (!b) throw new Error('Telegram bot not configured');

  try {
    await b.banChatMember(groupId, telegramUserId);
    // Immediately unban so they can rejoin if they resubscribe
    await b.unbanChatMember(groupId, telegramUserId);
    return { success: true };
  } catch (err) {
    console.error('Telegram removeUser error:', err.message);
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
    const member = await b.getChatMember(groupId, telegramUserId);
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

module.exports = {
  createInviteLink,
  revokeInviteLink,
  removeUserFromGroup,
  checkMembership,
  getGroupInfo,
};
