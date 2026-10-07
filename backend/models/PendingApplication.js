const mongoose = require('mongoose');

// An application the AI started for a student but couldn't finish: some
// screening question needs the student's own answer. It's sent once they answer.
const pendingApplicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  answers: [{
    _id: false,
    questionId: { type: mongoose.Schema.Types.ObjectId },
    answer: { type: String, default: '' },
    source: { type: String, enum: ['saved', 'ai', ''], default: '' },
    needsYou: { type: Boolean, default: false },
    reason: { type: String, default: '' }
  }],
  status: { type: String, enum: ['needs_answers', 'submitted', 'dismissed'], default: 'needs_answers', index: true },
  emailedAt: Date
}, { timestamps: true });

pendingApplicationSchema.index({ user: 1, job: 1 }, { unique: true });

module.exports = mongoose.model('PendingApplication', pendingApplicationSchema);
