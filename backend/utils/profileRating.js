const { askGroqForJson } = require('./groqClient');

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

  const prompt = `You are a friendly AI assistant inside a professional networking app, talking
casually to "${viewerName}" who is looking at someone else's profile. Based ONLY on these facts
about the profile — don't invent anything else — give a score out of 10 and one short, casual,
conversational line addressed directly to ${viewerName} by name, as if chatting. Be honest: an
almost-empty profile should score low, a rich complete one should score high.

Profile facts:
${facts}

Respond ONLY with a JSON object in this exact shape:
{ "score": 8, "message": "Hey ${viewerName}! I think this profile is 8/10 — [one specific reason]. What do you think?" }`;

  try {
    const result = await askGroqForJson(prompt);
    if (typeof result.score !== 'number') return null;
    return {
      score: Math.max(0, Math.min(10, Math.round(result.score))),
      message: typeof result.message === 'string' ? result.message : ''
    };
  } catch (error) {
    console.error('Profile rating error:', error.message);
    return null;
  }
};

module.exports = { rateProfile };
