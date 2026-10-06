const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const auth = require('../middleware/auth');
const CalendarEvent = require('../models/CalendarEvent');

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const TYPES = ['meeting', 'interview', 'deadline', 'site_visit', 'reminder', 'other'];

function clean(body) {
  const out = {};
  if (body.title !== undefined) out.title = String(body.title).trim().slice(0, 200);
  if (body.date !== undefined) out.date = String(body.date);
  if (body.startTime !== undefined) out.startTime = String(body.startTime || '');
  if (body.endTime !== undefined) out.endTime = String(body.endTime || '');
  if (body.type !== undefined) out.type = TYPES.includes(body.type) ? body.type : 'other';
  if (body.location !== undefined) out.location = String(body.location).slice(0, 200);
  if (body.notes !== undefined) out.notes = String(body.notes).slice(0, 2000);
  return out;
}

function invalid(e) {
  if (e.title !== undefined && !e.title) return 'Give it a title';
  if (e.date !== undefined && !DATE.test(e.date)) return 'Pick a date';
  if (e.startTime && !TIME.test(e.startTime)) return 'Start time should look like 09:30';
  if (e.endTime && !TIME.test(e.endTime)) return 'End time should look like 10:30';
  if (e.startTime && e.endTime && e.endTime <= e.startTime) return 'End time must be after the start time';
  return null;
}

// ?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive)
router.get('/', auth, async (req, res) => {
  try {
    const filter = { user: req.userId };
    if (DATE.test(req.query.from || '') || DATE.test(req.query.to || '')) {
      filter.date = {};
      if (DATE.test(req.query.from || '')) filter.date.$gte = req.query.from;
      if (DATE.test(req.query.to || '')) filter.date.$lte = req.query.to;
    }
    const events = await CalendarEvent.find(filter).sort({ date: 1, startTime: 1 }).limit(500).lean();
    res.json({ events });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load calendar', message: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const e = clean(req.body);
    const err = invalid({ title: e.title ?? '', date: e.date ?? '', ...e });
    if (err) return res.status(400).json({ error: err });
    const event = await CalendarEvent.create({ ...e, user: req.userId });
    res.status(201).json({ event });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add event', message: error.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Event not found' });
    const e = clean(req.body);
    const err = invalid(e);
    if (err) return res.status(400).json({ error: err });
    const event = await CalendarEvent.findOneAndUpdate({ _id: req.params.id, user: req.userId }, { $set: e }, { new: true });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json({ event });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update event', message: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Event not found' });
    const r = await CalendarEvent.deleteOne({ _id: req.params.id, user: req.userId });
    if (!r.deletedCount) return res.status(404).json({ error: 'Event not found' });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete event', message: error.message });
  }
});

module.exports = router;
