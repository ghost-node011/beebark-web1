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

module.exports = { analyzePortfolioItem };
