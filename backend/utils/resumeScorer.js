const { askGroqForJson } = require('./groqClient');

/**
 * AI resume review: a 0-100 score, a breakdown, and concrete improvement tips.
 * Returns null (never throws) if Groq is unavailable or misbehaves — resume
 * upload must succeed regardless of whether scoring works.
 */
const analyzeResume = async (rawText) => {
  if (!rawText || !rawText.trim()) return null;

  const prompt = `You are an expert resume reviewer for the architecture, real estate, and
construction industry (also handle general/tech resumes if that's what's given).

Resume text:
"""
${rawText.slice(0, 8000)}
"""

Score this resume from 0-100 and give specific, actionable feedback.

Respond ONLY with a single JSON object in this exact shape:
{
  "score": 78,
  "breakdown": { "skills": 80, "experience": 75, "education": 70, "presentation": 85 },
  "strengths": ["short specific strength", "..."],
  "improvements": ["short specific, actionable improvement", "..."],
  "suggestedRoles": ["role title this resume is well-suited for", "..."]
}`;

  try {
    const result = await askGroqForJson(prompt);
    if (typeof result.score !== 'number') return null;
    return {
      score: Math.max(0, Math.min(100, Math.round(result.score))),
      breakdown: result.breakdown || {},
      strengths: Array.isArray(result.strengths) ? result.strengths : [],
      improvements: Array.isArray(result.improvements) ? result.improvements : [],
      suggestedRoles: Array.isArray(result.suggestedRoles) ? result.suggestedRoles : []
    };
  } catch (error) {
    console.error('Resume scoring error:', error.message);
    return null;
  }
};

module.exports = { analyzeResume };
