const User = require('../models/User');

// LinkedIn-style people search: every word typed must match something about
// the person (name, headline, job title, company, skills, specialisation,
// place, industry); results are ranked by how strongly and where they match.

const CARD_FIELDS = 'name username profilePic headline role careerStage specialization industries location experience skills availability business.name connections followers';
const INDUSTRY_WORDS = { architecture: 'architecture architect', interiors: 'interiors interior design designer', construction: 'construction contractor', real_estate: 'real estate realtor property', related: 'related' };

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordsOf = (q) => String(q || '').toLowerCase().replace(/[^\p{L}\p{N}@.+#&\s-]/gu, ' ').split(/\s+/).filter(Boolean).slice(0, 6);

// Mongo condition: this word appears at the start of a word in one of the fields
function wordCondition(word) {
  const re = new RegExp(`(^|[\\s,/&(|.-])${escape(word)}`, 'i');
  const industries = Object.entries(INDUSTRY_WORDS).filter(([, w]) => w.includes(word)).map(([k]) => k);
  return {
    $or: [
      { name: re }, { username: new RegExp(`^${escape(word)}`, 'i') }, { headline: re }, { location: re },
      { 'experience.title': re }, { 'experience.company': re }, { specialization: re }, { skills: re },
      { 'business.name': re }, { projectTypeFocus: re }, { markets: re },
      ...(industries.length ? [{ industries: { $in: industries } }] : [])
    ]
  };
}

const currentJob = (u) => (u.experience || []).find((e) => e.current) || (u.experience || [])[0] || null;

// Where the words matched, for "Skills: Revit"-style hints under a result
function matchInfo(u, words) {
  const has = (v) => words.some((w) => new RegExp(`(^|[\\s,/&(|.-])${escape(w)}`, 'i').test(v || ''));
  const job = currentJob(u);
  if (words.every((w) => new RegExp(`(^|\\s)${escape(w)}`, 'i').test(u.name || ''))) return null;
  if (has(u.headline)) return null; // already visible
  const skill = (u.skills || []).find(has);
  if (skill) return `Skills: ${skill}`;
  const spec = (u.specialization || []).find(has);
  if (spec) return `Specialises in ${spec}`;
  const pastJob = (u.experience || []).find((e) => e !== job && (has(e.title) || has(e.company)));
  if (pastJob) return `Past: ${[pastJob.title, pastJob.company].filter(Boolean).join(' at ')}`;
  if (has(u.business?.name)) return `Runs ${u.business.name}`;
  return null;
}

function score(u, words, q, me, myConnections) {
  const name = (u.name || '').toLowerCase();
  const job = currentJob(u);
  const headline = `${u.headline || ''} ${job?.title || ''} ${job?.company || ''}`.toLowerCase();
  let s = 0;
  if (name === q) s += 200;
  else if (name.startsWith(q)) s += 120;
  for (const w of words) {
    if (name.split(/\s+/).some((p) => p.startsWith(w))) s += 40;
    if (headline.includes(w)) s += 15;
    if ((u.location || '').toLowerCase().includes(w)) s += 8;
  }
  const id = String(u._id);
  if (myConnections.has(id)) s += 25;
  const mutual = (u.connections || []).filter((c) => myConnections.has(String(c))).length;
  s += Math.min(mutual, 10) * 4;
  if (me.location && u.location && u.location.split(',')[0].trim().toLowerCase() === me.location.split(',')[0].trim().toLowerCase()) s += 5;
  return { s, mutual };
}

/**
 * Search people for the signed-in user.
 * params: q, role (student|professional), industry, location, network (connected|not),
 * open (hiring|open_to_work|internship|freelance), page, limit
 */
async function searchPeople(userId, params = {}) {
  const me = await User.findById(userId).select('connections sentRequests pendingRequests blockedUsers isDemo location').lean();
  const q = String(params.q || '').trim().toLowerCase().slice(0, 80);
  const words = wordsOf(q);
  const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 50);
  const page = Math.max(Number(params.page) || 1, 1);
  const myConnections = new Set((me.connections || []).map(String));
  const sent = new Set((me.sentRequests || []).map(String));
  const received = new Set((me.pendingRequests || []).map(String));

  const and = [
    { _id: { $ne: me._id, $nin: me.blockedUsers || [] } },
    { isDemo: me.isDemo ? true : { $ne: true } },
    { accountStatus: { $ne: 'deactivated' } },
    { blockedUsers: { $ne: me._id } },
    { onboardingCompleted: { $ne: false } }
  ];
  // An exact email finds that person, but partial emails never match (privacy)
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q)) and.push({ email: q });
  else words.forEach((w) => and.push(wordCondition(w)));
  if (['student', 'professional'].includes(params.role)) and.push({ role: params.role });
  if (params.industry) and.push({ industries: String(params.industry) });
  if (params.location) and.push({ location: new RegExp(escape(String(params.location).split(',')[0].trim().slice(0, 60)), 'i') });
  if (params.open) and.push({ availability: String(params.open) });
  if (params.network === 'connected') and.push({ _id: { $in: me.connections || [] } });
  if (params.network === 'not') and.push({ _id: { $nin: me.connections || [] } });

  if (!words.length && !params.role && !params.industry && !params.location && !params.open && !params.network) {
    return { people: [], total: 0, page, pages: 1 };
  }

  // Rank a generous candidate set, then page through it
  const candidates = await User.find({ $and: and }).select(CARD_FIELDS).limit(400).lean();
  const ranked = candidates
    .map((u) => ({ u, ...score(u, words, q, me, myConnections) }))
    .sort((a, b) => b.s - a.s || (a.u.name || '').localeCompare(b.u.name || ''));
  const slice = ranked.slice((page - 1) * limit, page * limit);
  const people = slice.map(({ u, mutual }) => {
    const id = String(u._id);
    const { connections, followers, ...rest } = u;
    return {
      ...rest,
      isFollowing: (followers || []).some((f) => String(f) === String(userId)),
      followerCount: (followers || []).length,
      status: myConnections.has(id) ? 'connected' : sent.has(id) ? 'sent' : received.has(id) ? 'received' : 'none',
      isConnected: myConnections.has(id),
      requestSent: sent.has(id),
      requestReceived: received.has(id),
      mutualConnectionsCount: mutual,
      connectionCount: (connections || []).length,
      matchedOn: matchInfo(u, words)
    };
  });
  return { people, total: ranked.length, page, pages: Math.max(1, Math.ceil(ranked.length / limit)), capped: candidates.length === 400 };
}

module.exports = { searchPeople };
