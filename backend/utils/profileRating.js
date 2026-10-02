const { askGroqForJson } = require('./groqClient');
const aiCache = require('./aiCache');

const RATING_TTL_MS = 24 * 60 * 60 * 1000;
const VIEWER = '{{VIEWER}}';

/**
 * A conversational AI take on a profile, shown to someone else viewing it —
 * "Hey {viewer}, I think this is 8/10...". Based only on what's actually
 * filled in; returns null (never throws) if Groq is unavailable.
 */
const rateProfile = async (profileUser, viewerName, portfolioCount) => {
  const facts = [
    `Role: ${profileUser.role || 'professional'}`,
    `Bio: ${profileUser.bio || '(none)'}`,
    `Industries: ${(profileUser.industries || []).join(', ') || '(none)'}`,
    `Skills: ${(profileUser.skills || []).slice(0, 15).join(', ') || '(none)'}`,
    `Experience entries: ${(profileUser.experience || []).length}`,
    `Portfolio entries: ${portfolioCount}`,
    `Connections: ${(profileUser.connections || []).length}`
  ].join('\n');

  // The answer is generated once per profile and saved; the viewer's name is
  // filled in afterwards, so every viewer gets a personal line without a new AI call.
  const key = `rating:${profileUser._id}:${aiCache.fingerprint(facts)}`;
  const cached = aiCache.get(key);
  if (cached) return personalise(cached.value, viewerName);

  const prompt = `You are a friendly AI assistant inside a professional networking app, talking
casually to "${VIEWER}" who is looking at someone else's profile. Based ONLY on these facts
about the profile — don't invent anything else — give a score out of 10 and one short, casual,
conversational line addressed directly to ${VIEWER} by name, as if chatting. Write ${VIEWER} literally; it is replaced with their name. Be honest: an
almost-empty profile should score low, a rich complete one should score high.

Profile facts:
${facts}

Respond ONLY with a JSON object in this exact shape:
{ "score": 8, "message": "Hey ${VIEWER}! I think this profile is 8/10 — [one specific reason]. What do you think?" }`;

  try {
    const result = await askGroqForJson(prompt, { light: true });
    if (typeof result.score !== 'number') return null;
    const rating = {
      score: Math.max(0, Math.min(10, Math.round(result.score))),
      message: typeof result.message === 'string' ? result.message : ''
    };
    aiCache.set(key, rating, RATING_TTL_MS);
    return personalise(rating, viewerName);
  } catch (error) {
    console.error('Profile rating error:', error.message);
    return null;
  }
};

const personalise = (rating, viewerName) => ({
  ...rating,
  message: rating.message.split(VIEWER).join(viewerName)
});

module.exports = { rateProfile };
