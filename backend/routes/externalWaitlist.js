const crypto = require('crypto');
const express = require('express');

const Waitlist = require('../models/Waitlist');

// Read-only waitlist access for trusted outside systems (the Aurigin admin
// portal). Authenticated with a shared key in the `x-api-key` header —
// WAITLIST_EXTERNAL_API_KEY — and served with its own CORS allowlist
// (WAITLIST_EXTERNAL_CORS_ORIGINS, see server.js), independent of the main
// app's and the marketing site's.
const router = express.Router();

function keysMatch(given, expected) {
  const a = Buffer.from(String(given || ''));
  const b = Buffer.from(String(expected));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

router.use((req, res, next) => {
  const expected = process.env.WAITLIST_EXTERNAL_API_KEY;
  if (!expected) return res.status(503).json({ error: 'External waitlist access is not configured.' });
  if (!keysMatch(req.get('x-api-key'), expected)) return res.status(401).json({ error: 'Invalid API key.' });
  next();
});

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function filterFrom(q) {
  const filter = {};
  if (q.role) filter.role = String(q.role);
  if (q.careerStage) filter.careerStage = String(q.careerStage);
  if (q.interest) filter.interest = String(q.interest);
  if (q.source) filter.source = String(q.source);
  const created = {};
  if (q.from && /^\d{4}-\d{2}-\d{2}$/.test(q.from)) created.$gte = new Date(`${q.from}T00:00:00Z`);
  if (q.to && /^\d{4}-\d{2}-\d{2}$/.test(q.to)) created.$lt = new Date(new Date(`${q.to}T00:00:00Z`).getTime() + 86400000);
  if (Object.keys(created).length) filter.createdAt = created;
  const text = String(q.q || '').trim().slice(0, 80);
  if (text) {
    const re = new RegExp(escapeRegex(text), 'i');
    filter.$or = [{ name: re }, { email: re }, { roleOther: re }];
  }
  return filter;
}

const FIELDS = 'name email role roleOther careerStage interest interests source confirmationSentAt createdAt';

// GET /api/external/waitlist?page&limit&q&role&careerStage&interest&source&from&to
router.get('/', async (req, res) => {
  try {
    const filter = filterFrom(req.query);
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const [items, total, all, byRole, byStage, byInterest, last7] = await Promise.all([
      Waitlist.find(filter).select(FIELDS).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Waitlist.countDocuments(filter),
      Waitlist.estimatedDocumentCount(),
      Waitlist.aggregate([{ $group: { _id: '$role', n: { $sum: 1 } } }, { $sort: { n: -1 } }]),
      Waitlist.aggregate([{ $group: { _id: '$careerStage', n: { $sum: 1 } } }, { $sort: { n: -1 } }]),
      Waitlist.aggregate([{ $group: { _id: '$interest', n: { $sum: 1 } } }, { $sort: { n: -1 } }]),
      Waitlist.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 86400000) } })
    ]);
    const facet = (rows) => rows.map((r) => ({ value: r._id || null, count: r.n }));
    res.json({
      items: items.map(({ _id, ...rest }) => ({ id: String(_id), ...rest })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      stats: { total: all, last7Days: last7, byRole: facet(byRole), byCareerStage: facet(byStage), byInterest: facet(byInterest) }
    });
  } catch (error) {
    console.error('External waitlist error:', error.message);
    res.status(500).json({ error: "Couldn't load the waitlist." });
  }
});

const CSV_COLUMNS = ['name', 'email', 'role', 'roleOther', 'careerStage', 'interest', 'interests', 'source', 'createdAt'];
const csvCell = (v) => {
  const s = Array.isArray(v) ? v.join('; ') : v instanceof Date ? v.toISOString() : String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// GET /api/external/waitlist/export — the same filters, as CSV.
router.get('/export', async (req, res) => {
  try {
    const items = await Waitlist.find(filterFrom(req.query)).select(FIELDS).sort({ createdAt: -1 }).lean();
    const lines = [CSV_COLUMNS.join(','), ...items.map((i) => CSV_COLUMNS.map((c) => csvCell(i[c])).join(','))];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="beebark-waitlist.csv"');
    res.send('﻿' + lines.join('\n'));
  } catch (error) {
    console.error('External waitlist export error:', error.message);
    res.status(500).json({ error: "Couldn't export the waitlist." });
  }
});

module.exports = router;
