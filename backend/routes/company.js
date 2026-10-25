const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const Company = require('../models/Company');
const User = require('../models/User');
const Job = require('../models/Job');
const Notification = require('../models/Notification');
const CompanyConnection = require('../models/CompanyConnection');
const { isAllowedImageUrl } = require('../utils/imageUrls');
const { LEGAL_VERSION } = require('../utils/legal');
const { PAGE_TYPES, TEAM_SIZES } = Company;

// Company Pages: anyone can create one, follow one, or list one in Experience
const router = express.Router();

const RESERVED = new Set(['new', 'mine', 'search', 'admin', 'edit', 'settings', 'beebark', 'official']);
const MAX_OWNED = 5;
const CARD = '_id name slug logo type tagline verified locations';
const PERSON = 'name username profilePic headline role careerStage experience';

const clip = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const list = (v, maxItems, maxLen) => [...new Set((Array.isArray(v) ? v : []).map((x) => clip(x, maxLen)).filter(Boolean))].slice(0, maxItems);
const withHttps = (v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v);
const validUrl = (v) => { try { const u = new URL(v); return /^https?:$/.test(u.protocol) && u.hostname.includes('.'); } catch { return false; } };
// Only images uploaded through BeeBark (checked on upload)
const imageUrl = (v) => {
  const s = clip(v, 500);
  return isAllowedImageUrl(s) ? s : '';
};
const slugify = (v) => String(v || '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim()
  .replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

// Optional sign-in for public reads
const viewerOf = (req) => {
  try {
    const token = (req.get('Authorization') || '').replace('Bearer ', '');
    return token ? String(jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this').userId) : null;
  } catch {
    return null;
  }
};

const isAdmin = (page, userId) => !!userId && (String(page.owner) === String(userId) || (page.admins || []).some((a) => String(a) === String(userId)));

async function freeSlug(base, exceptId) {
  const root = slugify(base) || 'company';
  for (let i = 0; i < 50; i += 1) {
    const slug = i ? `${root}-${i + 1}` : root;
    if (RESERVED.has(slug)) continue;
    const taken = await Company.exists({ slug, ...(exceptId ? { _id: { $ne: exceptId } } : {}) });
    if (!taken) return slug;
  }
  return `${root}-${Date.now().toString(36)}`;
}

// Editable fields from a request body; returns { fields } or { error }
function pageFields(body = {}, partial = false) {
  const has = (k) => !partial || Object.prototype.hasOwnProperty.call(body, k);
  const out = {};
  if (has('name')) {
    out.name = clip(body.name, 120);
    if (out.name.length < 2) return { error: 'Add the company name' };
  }
  if (has('type')) out.type = PAGE_TYPES.includes(body.type) ? body.type : 'other';
  if (has('tagline')) out.tagline = clip(body.tagline, 160);
  if (has('about')) out.about = clip(body.about, 3000);
  if (has('logo')) out.logo = imageUrl(body.logo);
  if (has('cover')) out.cover = imageUrl(body.cover);
  if (has('coverPosition')) {
    const pos = Number(body.coverPosition);
    out.coverPosition = Number.isFinite(pos) ? Math.min(100, Math.max(0, Math.round(pos))) : 50;
  }
  if (has('typeOther')) out.typeOther = clip(body.typeOther, 60);
  if (has('website')) {
    const w = withHttps(clip(body.website, 200));
    if (w && !validUrl(w)) return { error: 'Enter a valid website, e.g. yourstudio.com' };
    out.website = w;
  }
  if (has('email')) {
    const e = clip(body.email, 120).toLowerCase();
    if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { error: 'Enter a valid email' };
    out.email = e;
  }
  if (has('phone')) {
    const text = clip(body.phone, 30);
    let digits = text.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    if (text && (digits.length !== 10 || /[^\d+\-\s().]/.test(text))) return { error: 'Phone number must have 10 digits' };
    out.phone = text ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : '';
  }
  if (has('locations')) out.locations = list(body.locations, 10, 120);
  if (has('teamSize')) out.teamSize = TEAM_SIZES.includes(body.teamSize) ? body.teamSize : '';
  if (has('founded')) {
    const y = clip(String(body.founded ?? ''), 4);
    if (y && (!/^\d{4}$/.test(y) || Number(y) < 1800 || Number(y) > new Date().getFullYear())) return { error: 'Enter the year founded, e.g. 2012' };
    out.founded = y;
  }
  if (has('specialties')) out.specialties = list(body.specialties, 20, 60);
  return { fields: out };
}

const pagePublic = (p) => ({
  _id: p._id, name: p.name, slug: p.slug, type: p.type, tagline: p.tagline, about: p.about,
  logo: p.logo, cover: p.cover, coverPosition: p.coverPosition ?? 50, typeOther: p.type === 'other' ? (p.typeOther || '') : '', website: p.website, email: p.email, phone: p.phone,
  locations: p.locations || [], teamSize: p.teamSize, founded: p.founded, specialties: p.specialties || [],
  verified: !!p.verified, followerCount: (p.followers || []).length, owner: p.owner, createdAt: p.createdAt
});

// Pages you own or manage (for the "Acting as" switch)
router.get('/mine', auth, async (req, res) => {
  try {
    const pages = await Company.find({ $or: [{ owner: req.userId }, { admins: req.userId }] }).sort({ createdAt: 1 }).lean();
    res.json({ pages: pages.map((p) => ({ ...pagePublic(p), role: String(p.owner) === String(req.userId) ? 'owner' : 'admin' })) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load your pages' });
  }
});

// Search by name (Experience company field, people search)
router.get('/search', async (req, res) => {
  try {
    const q = clip(String(req.query.q || ''), 60);
    if (!q) return res.json({ pages: [] });
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const pages = await Company.find({ name: re }).select(CARD).limit(8).lean();
    const lower = q.toLowerCase();
    pages.sort((a, b) => Number(b.name.toLowerCase().startsWith(lower)) - Number(a.name.toLowerCase().startsWith(lower)));
    res.json({ pages });
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// ---- A page's own connections (separate from its admins' personal networks) ----

// Where things stand between a page and a person, seen from one side:
// none | sent (this side asked) | received (the other side asked) | connected
const connectionStatus = (row, side) => (!row ? 'none' : row.status === 'connected' ? 'connected' : row.requestedBy === side ? 'sent' : 'received');
const isObjectId = (v) => mongoose.Types.ObjectId.isValid(String(v || ''));
const notifyPage = (recipient, actor, type, page, link) => Notification.create({
  recipient, actor, type, meta: { pageId: String(page._id), pageName: page.name, slug: page.slug, link }
}).catch((e) => console.error('Page connection notification:', e.message));
const notifyPageAdmins = (page, actor, type) => Promise.all([...new Set([String(page.owner), ...(page.admins || []).map(String)])]
  .map((a) => notifyPage(a, actor, type, page, `/company/${page.slug}/admin?tab=connections`)));
const loadPage = async (req, res) => {
  if (!isObjectId(req.params.id)) { res.status(400).json({ error: 'Invalid page' }); return null; }
  const page = await Company.findById(req.params.id).lean();
  if (!page) { res.status(404).json({ error: 'Page not found' }); return null; }
  return page;
};
const personCard = (u) => ({ _id: String(u._id), name: u.name, username: u.username, profilePic: u.profilePic || '', headline: u.headline || '' });

// Pages that invited me to connect
router.get('/connection-invites', auth, async (req, res) => {
  try {
    const rows = await CompanyConnection.find({ user: req.userId, status: 'pending', requestedBy: 'page' }).sort({ createdAt: -1 })
      .populate('page', 'name slug logo tagline').lean();
    res.json({ invites: rows.filter((r) => r.page).map((r) => ({ page: { _id: String(r.page._id), name: r.page.name, slug: r.page.slug, logo: r.page.logo || '', tagline: r.page.tagline || '' }, createdAt: r.createdAt })) });
  } catch (error) {
    res.status(500).json({ error: 'Could not load page invitations' });
  }
});

// Connect with a page as yourself (or accept its invitation)
router.post('/:id/connect', auth, async (req, res) => {
  try {
    const page = await loadPage(req, res);
    if (!page) return;
    if (isAdmin(page, req.userId)) return res.status(400).json({ error: "You manage this page, so you can't connect with it as yourself" });
    const row = await CompanyConnection.findOne({ page: page._id, user: req.userId });
    if (row?.status === 'connected') return res.json({ status: 'connected' });
    if (row?.requestedBy === 'page') {
      row.status = 'connected'; row.connectedAt = new Date(); await row.save();
      notifyPageAdmins(page, req.userId, 'page_connection_accepted');
      return res.json({ status: 'connected' });
    }
    if (!row) {
      await CompanyConnection.create({ page: page._id, user: req.userId, requestedBy: 'user' });
      notifyPageAdmins(page, req.userId, 'page_connection_request');
    }
    res.json({ status: 'sent' });
  } catch (error) {
    res.status(500).json({ error: 'Could not connect with this page' });
  }
});

// Withdraw a request, decline an invitation, or disconnect
router.delete('/:id/connect', auth, async (req, res) => {
  try {
    const page = await loadPage(req, res);
    if (!page) return;
    await CompanyConnection.deleteOne({ page: page._id, user: req.userId });
    res.json({ status: 'none' });
  } catch (error) {
    res.status(500).json({ error: 'Could not update the connection' });
  }
});

// The page's connections, requests waiting for an answer, and invitations it sent (admins)
router.get('/:id/connections', auth, async (req, res) => {
  try {
    const page = await loadPage(req, res);
    if (!page) return;
    if (!isAdmin(page, req.userId)) return res.status(403).json({ error: 'Only page admins can see this' });
    const rows = (await CompanyConnection.find({ page: page._id }).sort({ updatedAt: -1 }).populate('user', 'name username profilePic headline').lean())
      .filter((r) => r.user).map((r) => ({ status: r.status, requestedBy: r.requestedBy, createdAt: r.createdAt, connectedAt: r.connectedAt, person: personCard(r.user) }));
    res.json({
      connections: rows.filter((r) => r.status === 'connected'),
      requests: rows.filter((r) => r.status === 'pending' && r.requestedBy === 'user'),
      sent: rows.filter((r) => r.status === 'pending' && r.requestedBy === 'page')
    });
  } catch (error) {
    res.status(500).json({ error: 'Could not load the page connections' });
  }
});

// Where the page stands with one person (admins)
router.get('/:id/connections/:userId', auth, async (req, res) => {
  try {
    const page = await loadPage(req, res);
    if (!page) return;
    if (!isAdmin(page, req.userId)) return res.status(403).json({ error: 'Only page admins can see this' });
    if (!isObjectId(req.params.userId)) return res.status(400).json({ error: 'Invalid user' });
    res.json({ status: connectionStatus(await CompanyConnection.findOne({ page: page._id, user: req.params.userId }).lean(), 'page') });
  } catch (error) {
    res.status(500).json({ error: 'Could not load the connection' });
  }
});

// Invite a person to connect with the page, or accept their request (admins)
router.post('/:id/connections/:userId', auth, async (req, res) => {
  try {
    const page = await loadPage(req, res);
    if (!page) return;
    if (!isAdmin(page, req.userId)) return res.status(403).json({ error: 'Only page admins can do this' });
    const { userId } = req.params;
    if (!isObjectId(userId) || isAdmin(page, userId)) return res.status(400).json({ error: "This person manages the page, so they can't connect with it" });
    const person = await User.findById(userId).select('accountStatus').lean();
    if (!person || person.accountStatus === 'deactivated') return res.status(404).json({ error: 'User not found' });
    const row = await CompanyConnection.findOne({ page: page._id, user: userId });
    if (row?.status === 'connected') return res.json({ status: 'connected' });
    if (row?.requestedBy === 'user') {
      row.status = 'connected'; row.connectedAt = new Date(); await row.save();
      notifyPage(userId, req.userId, 'page_connection_accepted', page, `/company/${page.slug}`);
      return res.json({ status: 'connected' });
    }
    if (!row) {
      await CompanyConnection.create({ page: page._id, user: userId, requestedBy: 'page', requestedByUser: req.userId });
      notifyPage(userId, req.userId, 'page_connection_invite', page, '/connections?tab=pages');
    }
    res.json({ status: 'sent' });
  } catch (error) {
    res.status(500).json({ error: 'Could not send the request' });
  }
});

// Decline a request, withdraw an invitation, or remove a connection (admins)
router.delete('/:id/connections/:userId', auth, async (req, res) => {
  try {
    const page = await loadPage(req, res);
    if (!page) return;
    if (!isAdmin(page, req.userId)) return res.status(403).json({ error: 'Only page admins can do this' });
    if (!isObjectId(req.params.userId)) return res.status(400).json({ error: 'Invalid user' });
    await CompanyConnection.deleteOne({ page: page._id, user: req.params.userId });
    res.json({ status: 'none' });
  } catch (error) {
    res.status(500).json({ error: 'Could not update the connection' });
  }
});

router.get('/check-slug', auth, async (req, res) => {
  const slug = slugify(req.query.slug);
  if (!slug || slug.length < 2) return res.json({ slug, available: false });
  const taken = RESERVED.has(slug) || await Company.exists({ slug, ...(mongoose.isValidObjectId(req.query.except) ? { _id: { $ne: req.query.except } } : {}) });
  res.json({ slug, available: !taken });
});

router.post('/', auth, async (req, res) => {
  try {
    if (req.user?.role === 'student') return res.status(403).json({ error: 'Company pages are for professionals and businesses' });
    const owned = await Company.countDocuments({ owner: req.userId });
    if (owned >= MAX_OWNED) return res.status(400).json({ error: `You can create up to ${MAX_OWNED} pages` });
    const { fields, error } = pageFields(req.body);
    if (error) return res.status(400).json({ error });
    let slug = slugify(req.body.slug || fields.name);
    if (!slug || slug.length < 2) return res.status(400).json({ error: 'Choose a page address' });
    if (RESERVED.has(slug) || await Company.exists({ slug })) {
      if (req.body.slug) return res.status(400).json({ error: 'That page address is taken' });
      slug = await freeSlug(fields.name);
    }
    if (!req.body.confirmed) return res.status(400).json({ error: 'Please confirm you can act for this company and accept the Business Accounts & Hiring terms' });
    const page = await Company.create({ ...fields, slug, owner: req.userId, admins: [], followers: [req.userId], termsAcceptance: { by: req.userId, version: LEGAL_VERSION, acceptedAt: new Date() } });
    res.status(201).json({ page: { ...pagePublic(page), role: 'owner' } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create the page' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const page = await Company.findOne({ slug: String(req.params.slug).toLowerCase() }).lean();
    if (!page) return res.status(404).json({ error: 'Page not found' });
    const viewerId = viewerOf(req);
    const admin = isAdmin(page, viewerId);
    if (!admin && req.query.preview !== '1') Company.updateOne({ _id: page._id }, { $inc: { views: 1 } }).catch(() => {});

    // People who list this page in their Experience (current first)
    const people = await User.find({ 'experience.companyPage': page._id, accountStatus: { $ne: 'deactivated' } })
      .select(PERSON).limit(60).lean();
    const employees = people.map((p) => {
      const exp = (p.experience || []).find((e) => String(e.companyPage) === String(page._id));
      return { _id: p._id, name: p.name, username: p.username, profilePic: p.profilePic, headline: p.headline, title: exp?.title || '', current: !!exp?.current };
    }).sort((a, b) => Number(b.current) - Number(a.current));

    const jobs = await Job.find({ companyPage: page._id, status: 'active' })
      .select('title location employmentType workplace salary createdAt').sort({ createdAt: -1 }).limit(20).lean();

    let admins = [];
    if (admin) {
      admins = await User.find({ _id: { $in: [page.owner, ...(page.admins || [])] } }).select('name username profilePic headline').lean();
      admins = admins.map((a) => ({ ...a, role: String(a._id) === String(page.owner) ? 'owner' : 'admin' }));
    }

    const [connectionCount, myConnection] = await Promise.all([
      CompanyConnection.countDocuments({ page: page._id, status: 'connected' }),
      viewerId && !admin ? CompanyConnection.findOne({ page: page._id, user: viewerId }).lean() : null
    ]);
    res.json({
      page: pagePublic(page),
      isFollowing: !!viewerId && (page.followers || []).some((f) => String(f) === viewerId),
      // The page's own connections; the viewer's status with the page (none | sent | received | connected)
      connectionCount,
      connection: viewerId && !admin ? connectionStatus(myConnection, 'user') : null,
      isAdmin: admin,
      isOwner: !!viewerId && String(page.owner) === viewerId,
      employees,
      employeeCount: employees.length,
      jobs,
      admins
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load the page' });
  }
});

// Page dashboard numbers (admins only)
router.get('/:id/stats', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid page' });
    const page = await Company.findById(req.params.id).lean();
    if (!page) return res.status(404).json({ error: 'Page not found' });
    if (!isAdmin(page, req.userId)) return res.status(403).json({ error: 'Only page admins can see this' });
    const jobs = await Job.find({ companyPage: page._id }).select('title status applicants createdAt').lean();
    const applicants = jobs.reduce((n, j) => n + (j.applicants || []).length, 0);
    const recentFollowers = await User.find({ _id: { $in: (page.followers || []).slice(-6) } }).select('name username profilePic headline').lean();
    const recentApplicants = [];
    for (const j of jobs) {
      for (const a of (j.applicants || [])) recentApplicants.push({ user: a.user, job: j.title, jobId: j._id, at: a.appliedAt || j.createdAt });
    }
    recentApplicants.sort((a, b) => new Date(b.at) - new Date(a.at));
    const top = recentApplicants.slice(0, 5);
    const people = await User.find({ _id: { $in: top.map((a) => a.user) } }).select('name username profilePic headline').lean();
    const byId = new Map(people.map((p) => [String(p._id), p]));
    res.json({
      views: page.views || 0,
      followers: (page.followers || []).length,
      jobs: jobs.filter((j) => j.status === 'active').length,
      applicants,
      recentFollowers: recentFollowers.reverse(),
      recentApplicants: top.map((a) => ({ ...a, person: byId.get(String(a.user)) || null })).filter((a) => a.person)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid page' });
    const page = await Company.findById(req.params.id);
    if (!page) return res.status(404).json({ error: 'Page not found' });
    if (!isAdmin(page, req.userId)) return res.status(403).json({ error: 'Only page admins can edit this page' });
    const { fields, error } = pageFields(req.body, true);
    if (error) return res.status(400).json({ error });
    if (req.body.slug !== undefined) {
      const slug = slugify(req.body.slug);
      if (!slug || slug.length < 2 || RESERVED.has(slug)) return res.status(400).json({ error: 'Choose a different page address' });
      if (slug !== page.slug && await Company.exists({ slug })) return res.status(400).json({ error: 'That page address is taken' });
      fields.slug = slug;
    }
    Object.assign(page, fields);
    await page.save();
    if (fields.name) {
      // Keep the company name in people's Experience in step with the page
      await User.updateMany({ 'experience.companyPage': page._id }, { $set: { 'experience.$[e].company': page.name } }, { arrayFilters: [{ 'e.companyPage': page._id }] });
    }
    res.json({ page: pagePublic(page) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save the page' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid page' });
    const page = await Company.findById(req.params.id);
    if (!page) return res.status(404).json({ error: 'Page not found' });
    if (String(page.owner) !== String(req.userId)) return res.status(403).json({ error: 'Only the page owner can delete it' });
    await User.updateMany({ 'experience.companyPage': page._id }, { $unset: { 'experience.$[e].companyPage': 1 } }, { arrayFilters: [{ 'e.companyPage': page._id }] });
    await Job.updateMany({ companyPage: page._id }, { $unset: { companyPage: 1 } });
    await page.deleteOne();
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete the page' });
  }
});

router.post('/:id/follow', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid page' });
    const page = await Company.findByIdAndUpdate(req.params.id, { $addToSet: { followers: req.userId } }, { new: true }).select('followers owner').lean();
    if (!page) return res.status(404).json({ error: 'Page not found' });
    res.json({ following: true, followerCount: page.followers.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to follow' });
  }
});

router.delete('/:id/follow', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid page' });
    const page = await Company.findByIdAndUpdate(req.params.id, { $pull: { followers: req.userId } }, { new: true }).select('followers').lean();
    if (!page) return res.status(404).json({ error: 'Page not found' });
    res.json({ following: false, followerCount: page.followers.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unfollow' });
  }
});

// Add a page admin by username (owner only)
router.post('/:id/admins', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid page' });
    const page = await Company.findById(req.params.id);
    if (!page) return res.status(404).json({ error: 'Page not found' });
    if (String(page.owner) !== String(req.userId)) return res.status(403).json({ error: 'Only the page owner can add admins' });
    const username = clip(String(req.body.username || ''), 60).replace(/^@/, '').toLowerCase();
    const person = await User.findOne({ username }).select('name username profilePic headline').lean();
    if (!person) return res.status(404).json({ error: 'No member with that username' });
    if (String(person._id) === String(page.owner)) return res.status(400).json({ error: 'The owner is already an admin' });
    if ((page.admins || []).length >= 10) return res.status(400).json({ error: 'A page can have up to 10 admins' });
    page.admins.addToSet(person._id);
    await page.save();
    Notification.create({ recipient: person._id, actor: req.userId, type: 'page_admin', meta: { pageName: page.name, slug: page.slug } }).catch(() => {});
    res.json({ admin: { ...person, role: 'admin' } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add the admin' });
  }
});

router.delete('/:id/admins/:userId', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid page' });
    const page = await Company.findById(req.params.id);
    if (!page) return res.status(404).json({ error: 'Page not found' });
    const self = String(req.params.userId) === String(req.userId);
    if (String(page.owner) !== String(req.userId) && !self) return res.status(403).json({ error: 'Only the page owner can remove admins' });
    page.admins.pull(req.params.userId);
    await page.save();
    res.json({ removed: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove the admin' });
  }
});

module.exports = router;
module.exports.slugify = slugify;
module.exports.freeSlug = freeSlug;
module.exports.isAdmin = isAdmin;
