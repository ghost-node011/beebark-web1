const Message = require('../models/Message');
const User = require('../models/User');
const ConversationState = require('../models/ConversationState');
const { isBlockedBetween } = require('./userRelations');

/**
 * Save a message between two connected people and push it to the receiver if
 * they're online. Used by both the socket and the REST endpoint.
 */
async function sendDirectMessage({ senderId, receiverId, text, io, connectedUsers }) {
  const body = String(text || '').trim();
  if (!body) throw new Error('Message is empty');
  if (body.length > 5000) throw new Error('Message is too long');

  const [sender, receiver] = await Promise.all([User.findById(senderId), User.findById(receiverId)]);
  if (!sender || !receiver || receiver.accountStatus === 'deactivated') throw new Error('This person is not available');
  if (!sender.connections.map(String).includes(String(receiverId))) throw new Error('Not connected with this user');
  if (isBlockedBetween(sender, receiver)) throw new Error('You can\'t message this person');

  const message = await Message.create({ sender: senderId, receiver: receiverId, text: body });

  // A new message brings a deleted conversation back for the receiver
  await ConversationState.updateOne(
    { user: receiverId, other: senderId, deleted: true },
    { $set: { deleted: false } }
  );

  const messageData = {
    _id: message._id.toString(),
    sender: String(senderId),
    receiver: String(receiverId),
    text: body,
    createdAt: message.createdAt
  };
  const receiverSocketId = connectedUsers && connectedUsers.get(String(receiverId));
  if (io && receiverSocketId) io.to(receiverSocketId).emit('receive-message', messageData);
  return messageData;
}

module.exports = { sendDirectMessage };
