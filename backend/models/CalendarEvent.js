const mongoose = require('mongoose');

// A personal calendar entry: meetings, interviews, deadlines, reminders
const calendarEventSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, maxlength: 200 },
  date: { type: String, required: true }, // "YYYY-MM-DD"
  startTime: { type: String, default: '' }, // "HH:MM"; empty = all day
  endTime: { type: String, default: '' },
  type: { type: String, enum: ['meeting', 'interview', 'deadline', 'site_visit', 'reminder', 'other'], default: 'other' },
  location: { type: String, default: '', maxlength: 200 },
  notes: { type: String, default: '', maxlength: 2000 }
}, { timestamps: true });

calendarEventSchema.index({ user: 1, date: 1 });

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);
