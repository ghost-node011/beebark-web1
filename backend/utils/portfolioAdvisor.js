const { askGeminiForJson } = require('./geminiClient');

/**
 * Quick AI take on a portfolio work item: a short piece of feedback and a
 * few suggested tags, so the user doesn't have to categorize it by hand.
 * Returns null (never throws) if Gemini is unavailable — saving the item
 * must succeed regardless.
 */
const analyzePortfolioItem = async (title, description) => {
  if (!title?.trim()) return null;

  const prompt = `You are reviewing one work item in a professional portfolio (architecture, real
estate, construction, or general professional/creative work).

Title: ${title}
Description: ${description || '(no description given)'}

Respond ONLY with a single JSON object in this exact shape:
{
  "feedback": "one or two encouraging, specific sentences about this piece, or a concrete suggestion to make it stronger",
  "suggestedTags": ["short tag", "short tag", "short tag"]
}`;

  try {
    const result = await askGeminiForJson(prompt);
    return {
      feedback: typeof result.feedback === 'string' ? result.feedback : '',
      suggestedTags: Array.isArray(result.suggestedTags) ? result.suggestedTags.slice(0, 6) : []
    };
  } catch (error) {
    console.error('Portfolio item analysis error:', error.message);
    return null;
  }
};

const VALID_FONTS = ['playfair', 'space', 'mono', 'classic'];
const FONT_DESCRIPTIONS = {
  playfair: 'Playfair Display — elegant serif, editorial/luxury feel',
  space: 'Space Grotesk — modern geometric sans, clean/tech feel',
  mono: 'JetBrains Mono — technical monospace, precise/architectural feel',
  classic: 'Libre Baskerville — classic book serif, traditional/scholarly feel'
};

/**
 * AI-suggested visual style (font pairing + accent color + layout) for a
 * user's portfolio, based on what's actually in it. Returns null (never
 * throws) if Gemini is unavailable — the user can still pick manually.
 */
const suggestPortfolioStyle = async (items, role) => {
  const summary = items.slice(0, 8).map((i) => `- ${i.title}: ${i.description || ''} [${(i.tags || []).join(', ')}]`).join('\n') || '(no items yet)';

  const prompt = `You are a design advisor for a professional portfolio website. Based on the work
below, suggest a visual style that fits.

Role: ${role || 'professional'}
Portfolio items:
${summary}

Available fonts (pick exactly one key):
${Object.entries(FONT_DESCRIPTIONS).map(([k, v]) => `- "${k}": ${v}`).join('\n')}

Also suggest one accent color as a hex code that fits the mood of this work (not necessarily bright —
consider muted/earthy tones for architecture, bold colors for creative/design work, etc).

Respond ONLY with a JSON object in this exact shape:
{ "font": "one of the keys above", "accentColor": "#RRGGBB", "reason": "one short sentence explaining the choice" }`;

  try {
    const result = await askGeminiForJson(prompt);
    if (!VALID_FONTS.includes(result.font) || !/^#[0-9a-fA-F]{6}$/.test(result.accentColor || '')) {
      console.error('Portfolio style suggestion: Gemini returned an unusable shape:', JSON.stringify(result));
      return { error: 'Gemini returned an unexpected format' };
    }
    return {
      font: result.font,
      accentColor: result.accentColor,
      reason: typeof result.reason === 'string' ? result.reason : ''
    };
  } catch (error) {
    console.error('Portfolio style suggestion error:', error.message);
    return { error: error.message };
  }
};

module.exports = { analyzePortfolioItem, suggestPortfolioStyle };
