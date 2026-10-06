const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const Job = require('../models/Job');
const ConversationState = require('../models/ConversationState');
const Report = require('../models/Report');
const auth = require('../middleware/auth');
const { sendDirectMessage, markDelivered, markRead, toData } = require('../utils/directMessages');
const { PERSON_FIELDS, isBlockedBetween, uniqueIds } = require('../utils/userRelations');

const isId = (v) => mongoose.isValidObjectId(v);

// People you have a job relationship with: you applied to their job, or they applied to yours
async function jobContacts(userId) {
  const [applied, posted] = await Promise.all([
    Job.find({ 'applicants.user': userId }).select('postedBy').lean(),
    Job.find({ postedBy: userId }).select('applicants.user').lean()
  ]);
  const ids = new Set(applied.map((j) => String(j.postedBy)));
  posted.forEach((j) => (j.applicants || []).forEach((a) => a.user && ids.add(String(a.user))));
  return ids;
}

/**
 * Conversation list: one row per connection with the last message, unread
 * count and your flags. ?filter=all|unread|starred|archived|jobs, ?q=name
 */
router.get('/conversations', auth, async (req, res) => {
  try {
    const me = await User.findById(req.userId).populate('connections', `${PERSON_FIELDS} accountStatus`);
    const blocked = new Set((me.blockedUsers || []).map(String));
    const people = uniqueIds(me.connections).filter((c) => c && c.accountStatus !== 'deactivated' && !blocked.has(String(c._id)));
    const ids = people.map((p) => p._id);

    const [states, jobs] = await Promise.all([
      ConversationState.find({ user: req.userId, other: { $in: ids } }).lean(),
      jobContacts(req.userId)
    ]);
    const stateOf = new Map(states.map((s) => [String(s.other), s]));

    // Opening the inbox means anything waiting has reached this device
    markDelivered({ userId: me._id, io: req.app.get('io'), connectedUsers: req.app.get('connectedUsers') }).catch(() => {});

    // One row per conversation: the last message and the unread count, counted
    // in the database (only messages after a "delete for me" are included)
    const pairs = ids.flatMap((id) => {
      const cleared = stateOf.get(String(id))?.clearedAt;
      const after = cleared ? { createdAt: { $gt: cleared } } : {};
      return [{ sender: me._id, receiver: id, ...after }, { sender: id, receiver: me._id, ...after }];
    });
    const lastAndUnread = pairs.length ? await Message.aggregate([
      { $match: { $or: pairs } },
      { $addFields: { other: { $cond: [{ $eq: ['$sender', me._id] }, '$receiver', '$sender'] } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$other',
          last: { $first: { text: '$text', attachments: '$attachments', sender: '$sender', createdAt: '$createdAt', deliveredAt: '$deliveredAt', readAt: '$readAt' } },
          unread: { $sum: { $cond: [{ $and: [{ $ne: ['$sender', me._id] }, { $eq: ['$read', false] }] }, 1, 0] } }
        }
      }
    ]) : [];
    const summaryOf = new Map(lastAndUnread.map((r) => [String(r._id), r]));
    const seeReceipts = me.settings?.readReceipts !== false;

    let rows = people.map((p) => {
      const id = String(p._id);
      const state = stateOf.get(id) || {};
      const summary = summaryOf.get(id);
      const last = summary?.last;
      const fromMe = last ? String(last.sender) !== id : false;
      const unread = (summary?.unread || 0) || (state.markedUnread ? 1 : 0);
      return {
        person: p,
        lastMessage: last ? {
          text: last.text || (last.attachments?.length
            ? (last.attachments.every((a) => a.kind === 'image') ? `📷 Photo${last.attachments.length > 1 ? `s (${last.attachments.length})` : ''}` : `📎 ${last.attachments[0].name || 'File'}${last.attachments.length > 1 ? ` +${last.attachments.length - 1}` : ''}`)
            : ''),
          fromMe,
          createdAt: last.createdAt,
          deliveredAt: fromMe ? last.deliveredAt || null : undefined,
          readAt: fromMe && seeReceipts ? last.readAt || null : undefined
        } : null,
        unread,
        markedUnread: !!state.markedUnread,
        starred: !!state.starred,
        archived: !!state.archived,
        deleted: !!state.deleted,
        jobs: jobs.has(id)
      };
    });

    const filter = String(req.query.filter || 'all');
    rows = rows.filter((r) => !r.deleted);
    const inbox = rows.filter((r) => !r.archived);
    const totals = {
      all: inbox.length,
      unread: inbox.filter((r) => r.unread > 0).length,
      starred: inbox.filter((r) => r.starred).length,
      jobs: inbox.filter((r) => r.jobs).length,
      archived: rows.filter((r) => r.archived).length,
      unreadMessages: inbox.reduce((n, r) => n + r.unread, 0)
    };
    if (filter === 'archived') rows = rows.filter((r) => r.archived);
    else {
      rows = rows.filter((r) => !r.archived);
      if (filter === 'unread') rows = rows.filter((r) => r.unread > 0);
      if (filter === 'starred') rows = rows.filter((r) => r.starred);
      if (filter === 'jobs') rows = rows.filter((r) => r.jobs);
    }
    const q = String(req.query.q || '').trim().toLowerCase();
    if (q) rows = rows.filter((r) => `${r.person.name} ${r.person.username}`.toLowerCase().includes(q));

    rows.sort((a, b) => (b.lastMessage?.createdAt || 0) - (a.lastMessage?.createdAt || 0) || a.person.name.localeCompare(b.person.name));

    res.json({ conversations: rows, totals });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load conversations', message: error.message });
  }
});

// Star, archive or restore a conversation: { starred?, archived? }
router.put('/conversations/:otherId', auth, async (req, res) => {
  try {
    if (!isId(req.params.otherId)) return res.status(400).json({ error: 'Invalid user' });
    const set = {};
    if (typeof req.body.starred === 'boolean') set.starred = req.body.starred;
    if (typeof req.body.archived === 'boolean') set.archived = req.body.archived;
    if (typeof req.body.markedUnread === 'boolean') set.markedUnread = req.body.markedUnread;
    const state = await ConversationState.findOneAndUpdate(
      { user: req.userId, other: req.params.otherId },
      { $set: set },
      { upsert: true, new: true }
    );
    res.json({ starred: state.starred, archived: state.archived, markedUnread: state.markedUnread });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update conversation', message: error.message });
  }
});

// Delete a conversation for yourself: earlier messages are hidden; new ones bring it back
router.delete('/conversations/:otherId', auth, async (req, res) => {
  try {
    if (!isId(req.params.otherId)) return res.status(400).json({ error: 'Invalid user' });
    await ConversationState.updateOne(
      { user: req.userId, other: req.params.otherId },
      { $set: { deleted: true, archived: false, starred: false, clearedAt: new Date() } },
      { upsert: true }
    );
    await Message.updateMany({ sender: req.params.otherId, receiver: req.userId, read: false }, { $set: { read: true } });
    res.json({ message: 'Conversation deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete conversation', message: error.message });
  }
});

// Mark everything they sent you as read
router.put('/conversations/:otherId/read', auth, async (req, res) => {
  try {
    if (!isId(req.params.otherId)) return res.status(400).json({ error: 'Invalid user' });
    await markRead({ readerId: req.userId, otherId: req.params.otherId, io: req.app.get('io'), connectedUsers: req.app.get('connectedUsers') });
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark as read', message: error.message });
  }
});

// Report someone (from a chat or their profile): { userId, reason, details, context, messageId, archive }
router.post('/report', auth, async (req, res) => {
  try {
    const { userId, reason, details, context, messageId } = req.body;
    if (!isId(userId) || String(userId) === String(req.userId)) return res.status(400).json({ error: 'Invalid user' });
    const reasons = ['spam', 'harassment', 'fake_profile', 'inappropriate', 'scam', 'other'];
    if (!reasons.includes(reason)) return res.status(400).json({ error: 'Choose a reason' });
    await Report.create({
      reporter: req.userId,
      reportedUser: userId,
      reason,
      details: String(details || '').slice(0, 1000),
      context: ['chat', 'profile', 'post'].includes(context) ? context : 'other',
      messageId: isId(messageId) ? messageId : undefined
    });
    // Reporting a chat as spam also moves it out of the inbox
    if (context === 'chat' && (reason === 'spam' || req.body.archive === true)) {
      await ConversationState.updateOne({ user: req.userId, other: userId }, { $set: { archived: true } }, { upsert: true });
    }
    res.status(201).json({ message: 'Thanks, we\'ll review this report' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send report', message: error.message });
  }
});

router.get('/:connectionId', auth, async (req, res) => {
  try {
    const { connectionId } = req.params;
    if (!isId(connectionId)) return res.status(400).json({ error: 'Invalid user' });

    const [user, other, state] = await Promise.all([
      User.findById(req.userId).select('connections blockedUsers settings.readReceipts').lean(),
      User.findById(connectionId).select('blockedUsers').lean(),
      ConversationState.findOne({ user: req.userId, other: connectionId }).lean()
    ]);
    if (!(user.connections || []).some((id) => String(id) === String(connectionId))) {
      return res.status(403).json({ error: 'Not connected with this user' });
    }

    const match = {
      $or: [
        { sender: req.userId, receiver: connectionId },
        { sender: connectionId, receiver: req.userId }
      ]
    };
    if (state?.clearedAt) match.createdAt = { $gt: state.clearedAt };

    // Opening the conversation reads it (and tells the sender, if receipts are on)
    await markRead({ readerId: req.userId, otherId: connectionId, io: req.app.get('io'), connectedUsers: req.app.get('connectedUsers') });

    // Latest 200, shown oldest first. With your receipts off you don't see theirs either.
    const seeReceipts = user.settings?.readReceipts !== false;
    const messages = (await Message.find(match).sort({ createdAt: -1 }).limit(200).lean()).reverse()
      .map((m) => {
        const data = toData(m);
        // Older messages were read before readAt existed
        if (!data.readAt && m.read && String(m.sender) === String(req.userId)) data.readAt = m.updatedAt;
        if (String(m.sender) === String(req.userId) && !data.deliveredAt && data.readAt) data.deliveredAt = data.readAt;
        if (!seeReceipts) data.readAt = null;
        return data;
      });

    res.json({ messages, blocked: isBlockedBetween(user, other || {}), readReceipts: seeReceipts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages', message: error.message });
  }
});

router.post('/send', auth, async (req, res) => {
  try {
    const { receiver, text, attachments } = req.body;
    if (!receiver || !isId(receiver)) {
      return res.status(400).json({ error: 'Receiver is required' });
    }
    const data = await sendDirectMessage({
      senderId: req.userId,
      receiverId: receiver,
      text,
      attachments,
      io: req.app.get('io'),
      connectedUsers: req.app.get('connectedUsers')
    });
    res.json({ message: 'Message sent', data });
  } catch (error) {
    const status = /Not connected|can't message|not available/.test(error.message) ? 403 : /empty|too long/.test(error.message) ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
});

module.exports = router;
