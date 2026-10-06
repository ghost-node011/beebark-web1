const Message = require('../models/Message');
const User = require('../models/User');
const ConversationState = require('../models/ConversationState');
const { isBlockedBetween } = require('./userRelations');

const RELATION_FIELDS = 'connections blockedUsers accountStatus';

const toData = (m) => ({
  _id: String(m._id),
  sender: String(m.sender),
  receiver: String(m.receiver),
  text: m.text || '',
  attachments: m.attachments || [],
  createdAt: m.createdAt,
  deliveredAt: m.deliveredAt || null,
  readAt: m.readAt || null
});

const emitTo = (io, connectedUsers, userId, event, payload) => {
  const socketId = connectedUsers && connectedUsers.get(String(userId));
  if (io && socketId) io.to(socketId).emit(event, payload);
  return Boolean(io && socketId);
};

/**
 * Save a message between two connected people and push it to the receiver if
 * they're online (which also counts as delivered). Used by the socket and REST.
 */
// Only files that came from our own upload endpoint
const UPLOADED = /^(https:\/\/res\.cloudinary\.com\/|\/uploads\/)[^\s"'<>]+$/;
function cleanAttachments(list) {
  return (Array.isArray(list) ? list : []).slice(0, 5)
    .filter((a) => a && typeof a.url === 'string' && UPLOADED.test(a.url))
    .map((a) => ({
      url: a.url,
      name: String(a.name || '').slice(0, 200),
      mime: String(a.mime || '').slice(0, 100),
      size: Math.max(0, Number(a.size) || 0),
      kind: a.kind === 'image' ? 'image' : 'file'
    }));
}

async function sendDirectMessage({ senderId, receiverId, text, attachments, io, connectedUsers }) {
  const body = String(text || '').trim();
  const files = cleanAttachments(attachments);
  if (!body && !files.length) throw new Error('Message is empty');
  if (body.length > 5000) throw new Error('Message is too long');

  // Only the fields the checks need; full profiles (résumé text etc.) are large
  const [sender, receiver] = await Promise.all([
    User.findById(senderId).select(RELATION_FIELDS).lean(),
    User.findById(receiverId).select(RELATION_FIELDS).lean()
  ]);
  if (!sender || !receiver || receiver.accountStatus === 'deactivated') throw new Error('This person is not available');
  if (!(sender.connections || []).some((id) => String(id) === String(receiverId))) throw new Error('Not connected with this user');
  if (isBlockedBetween(sender, receiver)) throw new Error('You can\'t message this person');

  const online = Boolean(connectedUsers && connectedUsers.get(String(receiverId)));
  const message = await Message.create({ sender: senderId, receiver: receiverId, text: body, attachments: files, deliveredAt: online ? new Date() : undefined });
  const data = toData(message);
  emitTo(io, connectedUsers, receiverId, 'receive-message', data);

  // A new message brings a deleted conversation back for the receiver
  ConversationState.updateOne({ user: receiverId, other: senderId, deleted: true }, { $set: { deleted: false } }).catch(() => {});
  return data;
}

/** Everything waiting for this person has now reached them; tell the senders. */
async function markDelivered({ userId, io, connectedUsers }) {
  const pending = await Message.find({ receiver: userId, deliveredAt: null }).select('sender').lean();
  if (!pending.length) return;
  const at = new Date();
  await Message.updateMany({ receiver: userId, deliveredAt: null }, { $set: { deliveredAt: at } });
  for (const sender of new Set(pending.map((m) => String(m.sender)))) {
    emitTo(io, connectedUsers, sender, 'messages-delivered', { by: String(userId), at });
  }
}

/** The reader opened the conversation with `otherId`; tell the sender if receipts are on. */
async function markRead({ readerId, otherId, io, connectedUsers }) {
  const filter = { sender: otherId, receiver: readerId, read: false };
  const count = await Message.countDocuments(filter);
  ConversationState.updateOne({ user: readerId, other: otherId, markedUnread: true }, { $set: { markedUnread: false } }).catch(() => {});
  if (!count) return 0;
  const reader = await User.findById(readerId).select('settings.readReceipts').lean();
  const share = reader?.settings?.readReceipts !== false;
  const at = new Date();
  const set = { read: true, deliveredAt: at };
  if (share) set.readAt = at;
  // deliveredAt only fills gaps; don't move an earlier delivery time
  await Message.updateMany({ ...filter, deliveredAt: { $ne: null } }, { $set: share ? { read: true, readAt: at } : { read: true } });
  await Message.updateMany({ ...filter, deliveredAt: null }, { $set: set });
  if (share) emitTo(io, connectedUsers, otherId, 'messages-read', { by: String(readerId), at });
  else emitTo(io, connectedUsers, otherId, 'messages-delivered', { by: String(readerId), at });
  return count;
}

module.exports = { sendDirectMessage, markDelivered, markRead, toData };
