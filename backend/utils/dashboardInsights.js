const Message = require('../models/Message');
const PortfolioItem = require('../models/PortfolioItem');
const { askGeminiForJson } = require('./geminiClient');

// Real, computed metrics — never invented. Gemini (or the fallback) only
// turns these numbers into readable coaching copy.
const computeMetrics = async (user) => {
  const connectionIds = (user.connections || []).map((id) => id.toString());
  const connectionCount = connectionIds.length;

  let messagedCount = 0;
  let noReplyCount = 0;

  for (const partnerId of connectionIds) {
    const sentByMe = await Message.countDocuments({ sender: user._id, receiver: partnerId });
    if (sentByMe === 0) continue;
    messagedCount += 1;
    const repliedByThem = await Message.countDocuments({ sender: partnerId, receiver: user._id });
    if (repliedByThem === 0) noReplyCount += 1;
  }

  const connectedNotMessagedCount = connectionCount - messagedCount;

  const portfolioItems = await PortfolioItem.find({ user: user._id });
  const portfolioCount = portfolioItems.length;
  const portfolioWithImages = portfolioItems.filter((i) => i.images?.length > 0).length;
  const portfolioWithoutImages = portfolioCount - portfolioWithImages;

  return {
    connectionCount,
    messagedCount,
    connectedNotMessagedCount,
    noReplyCount,
    portfolioCount,
    portfolioWithImages,
    portfolioWithoutImages,
    resumeScore: user.resume?.score ?? null
  };
};

// Deterministic, rule-based narrative — used if Gemini is unavailable so the
// dashboard always has something real to show, never a blank/broken panel.
const fallbackInsights = (m) => {
  const wins = [];
  const improvements = [];

  if (m.connectionCount === 0) {
    improvements.push('You have no connections yet — connecting with more people opens up more job opportunities.');
  } else {
    wins.push(`You're connected with ${m.connectionCount} ${m.connectionCount === 1 ? 'person' : 'people'} — good start on building your network.`);
    if (m.connectedNotMessagedCount > 0) {
      improvements.push(`${m.connectedNotMessagedCount} of your connections you've never messaged — a connection only helps if you actually engage with it.`);
    }
    if (m.noReplyCount > 0) {
      improvements.push(`${m.noReplyCount} ${m.noReplyCount === 1 ? 'person hasn\'t' : 'people haven\'t'} replied to your messages — try a more specific, personal opener instead of a generic one.`);
    }
    if (m.connectedNotMessagedCount === 0 && m.noReplyCount === 0 && m.messagedCount > 0) {
      wins.push('You\'re messaging your connections and getting responses — that\'s real engagement, not just adding names.');
    }
  }

  if (m.portfolioCount === 0) {
    improvements.push('Your portfolio is empty — add your first piece of work so recruiters and connections can actually see what you do.');
  } else {
    wins.push(`You have ${m.portfolioCount} ${m.portfolioCount === 1 ? 'entry' : 'entries'} in your portfolio.`);
    if (m.portfolioWithoutImages > 0) {
      improvements.push(`${m.portfolioWithoutImages} portfolio ${m.portfolioWithoutImages === 1 ? 'entry has' : 'entries have'} no photos — that's the fastest improvement: add images to what's already there (photo-wise).`);
    } else if (m.portfolioCount < 3) {
      improvements.push('Add a couple more pieces of work — a portfolio with 3+ entries reads as far more credible (work-wise).');
    }
  }

  if (typeof m.resumeScore === 'number' && m.resumeScore < 70) {
    improvements.push(`Your resume score is ${m.resumeScore}/100 — check the Jobs page for specific suggestions to raise it.`);
  }

  return {
    greeting: "Here's how things are going.",
    wins,
    improvements
  };
};

// Simple, transparent checklist — used for the "X% complete" indicator shown
// across the app so users always know what's left, and why.
const computeProfileCompletion = (user) => {
  const checks = [
    { key: 'profilePic', label: 'Add a profile photo', done: !!user.profilePic },
    { key: 'bio', label: 'Write a short bio', done: !!user.bio?.trim() },
    { key: 'location', label: 'Add your location', done: !!user.location?.trim() },
    { key: 'skills', label: 'Add at least one skill', done: (user.skills || []).length > 0 },
    { key: 'experience', label: 'Add work experience', done: (user.experience || []).length > 0 },
    { key: 'industries', label: 'Pick an industry focus', done: (user.industries || []).length > 0 },
    { key: 'resume', label: 'Upload your résumé', done: !!user.resume?.url }
  ];
  const doneCount = checks.filter((c) => c.done).length;
  return {
    percent: Math.round((doneCount / checks.length) * 100),
    missing: checks.filter((c) => !c.done).map((c) => c.label)
  };
};

const getDashboardInsights = async (user) => {
  const m = await computeMetrics(user);
  const profileCompletion = computeProfileCompletion(user);
  const fallback = fallbackInsights(m);

  const prompt = `You are a friendly career coach inside a professional networking app. Based ONLY on
these real, measured stats for this user — do not invent anything not listed here — write a short,
warm, specific analysis.

This user is a ${user.role || 'professional'}${(user.industries || []).length ? ` in ${user.industries.join('/')}` : ''}.
Use vocabulary that fits: e.g. a student's network is about mentors/internships/learning, a firm's is
about hiring/talent, a professional's is about clients/career growth. Reference their specific
domain (e.g. listings for real estate, projects for architecture/construction) instead of generic
"work" if their industry is known.

Stats:
- Connections: ${m.connectionCount}
- Connections they've messaged at least once: ${m.messagedCount}
- Connections they're connected to but have NEVER messaged: ${m.connectedNotMessagedCount}
- Connections they messaged where the other person never replied: ${m.noReplyCount}
- Portfolio entries: ${m.portfolioCount}
- Portfolio entries with photos: ${m.portfolioWithImages}
- Portfolio entries with NO photos: ${m.portfolioWithoutImages}
- Resume score (if any): ${m.resumeScore ?? 'not scored yet'}

Cover, where the data supports it: whether they're connecting well but not converting connections
into conversations, whether people are actually replying to them, and whether their portfolio needs
more work added or better photos of what's already there. Be encouraging but honest — do not praise
something the numbers don't support.

Respond ONLY with a JSON object in this exact shape:
{ "greeting": "one short warm sentence", "wins": ["short specific win", "..."], "improvements": ["short specific, actionable suggestion", "..."] }`;

  try {
    const result = await askGeminiForJson(prompt);
    if (!Array.isArray(result.wins) || !Array.isArray(result.improvements)) return { ...fallback, metrics: m, profileCompletion };
    return {
      greeting: typeof result.greeting === 'string' ? result.greeting : fallback.greeting,
      wins: result.wins,
      improvements: result.improvements,
      metrics: m,
      profileCompletion
    };
  } catch (error) {
    console.error('Dashboard insights error:', error.message);
    return { ...fallback, metrics: m, profileCompletion };
  }
};

module.exports = { getDashboardInsights, computeProfileCompletion };
