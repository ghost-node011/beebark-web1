const User = require('../models/User');
const { askGroqForJson } = require('./groqClient');

// Screening questions on jobs: checking answers, the student's answer bank
// (answer once, reused when the same question comes up), and AI filling.

const TYPES = ['yes_no', 'number', 'short_text', 'long_text', 'single_choice'];
const MAX_QUESTIONS = 10;

const clip = (v, n) => String(v ?? '').trim().slice(0, n);

// Lowercase words only, so "Years of experience with AutoCAD?" and
// "years of experience with autocad" are the same question
const normalise = (text) => String(text || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set(['a', 'an', 'the', 'do', 'you', 'your', 'have', 'are', 'is', 'of', 'in', 'to', 'with', 'for', 'how', 'what', 'many', 'much', 'please', 'any', 'on', 'at', 'this', 'role', 'job']);
const words = (text) => new Set(normalise(text).split(' ').filter((w) => w && !STOP.has(w)));

// Share of meaningful words two questions have in common (0–1)
const similarity = (a, b) => {
  const A = words(a); const B = words(b);
  if (!A.size || !B.size) return 0;
  let both = 0;
  A.forEach((w) => { if (B.has(w)) both += 1; });
  return both / Math.max(A.size, B.size);
};

/** Clean the questions a poster sends. */
function cleanQuestions(list) {
  return (Array.isArray(list) ? list : []).slice(0, MAX_QUESTIONS).map((q) => {
    const type = TYPES.includes(q?.type) ? q.type : 'short_text';
    const options = type === 'single_choice'
      ? [...new Set((Array.isArray(q?.options) ? q.options : []).map((o) => clip(o, 80)).filter(Boolean))].slice(0, 10)
      : [];
    return {
      ...(q?._id && /^[a-f0-9]{24}$/.test(String(q._id)) ? { _id: q._id } : {}),
      text: clip(q?.text, 300),
      type,
      options,
      required: q?.required !== false,
      idealAnswer: clip(q?.idealAnswer, 100)
    };
  }).filter((q) => q.text && (q.type !== 'single_choice' || q.options.length >= 2));
}

/** Is `answer` a valid reply to `question`? Returns the cleaned answer or null. */
function cleanAnswer(question, answer) {
  const a = clip(answer, question.type === 'long_text' ? 3000 : 300);
  if (!a) return '';
  switch (question.type) {
    case 'yes_no': return /^(yes|no)$/i.test(a) ? (a[0].toLowerCase() === 'y' ? 'Yes' : 'No') : null;
    case 'number': return /^\d+(\.\d+)?$/.test(a) && Number(a) <= 100000 ? String(Number(a)) : null;
    case 'single_choice': return question.options.find((o) => o.toLowerCase() === a.toLowerCase()) || null;
    default: return a;
  }
}

/**
 * Check a set of answers against a job's questions.
 * Returns { answers: [{ questionId, question, answer }], missing: [ids], invalid: [ids] }.
 */
function checkAnswers(questions, given) {
  const byId = new Map((Array.isArray(given) ? given : []).map((g) => [String(g?.questionId), g?.answer]));
  const answers = []; const missing = []; const invalid = [];
  for (const q of questions) {
    const raw = byId.get(String(q._id));
    const value = raw === undefined ? '' : cleanAnswer(q, raw);
    if (value === null) { invalid.push(String(q._id)); continue; }
    if (!value) { if (q.required) missing.push(String(q._id)); continue; }
    answers.push({ questionId: q._id, question: q.text, answer: value });
  }
  return { answers, missing, invalid };
}

/** The student's earlier answer to this (or a near-identical) question, if any. */
function savedAnswerFor(bank, question) {
  const key = normalise(question.text);
  const exact = (bank || []).find((b) => b.key === key && (b.type === question.type || !b.type));
  const best = exact || (bank || [])
    .filter((b) => b.type === question.type)
    .map((b) => ({ b, score: similarity(b.question, question.text) }))
    .filter((x) => x.score >= 0.8)
    .sort((x, y) => y.score - x.score)[0]?.b;
  if (!best) return null;
  return cleanAnswer(question, best.answer) || null;
}

/** Remember the student's answers for next time (newest answer wins). */
async function saveToBank(userId, questions, answers) {
  const user = await User.findById(userId).select('answerBank');
  if (!user) return;
  const byId = new Map(questions.map((q) => [String(q._id), q]));
  for (const a of answers) {
    const q = byId.get(String(a.questionId));
    if (!q || !a.answer) continue;
    const key = normalise(q.text);
    const existing = user.answerBank.find((b) => b.key === key);
    if (existing) {
      existing.answer = a.answer;
      existing.type = q.type;
      existing.updatedAt = new Date();
    } else {
      user.answerBank.push({ key, question: q.text, type: q.type, answer: a.answer, updatedAt: new Date() });
    }
  }
  user.answerBank = user.answerBank.slice(-200);
  await user.save();
}

// What the AI may use about the student
const profileFacts = (user) => ({
  name: user.name,
  role: user.role,
  careerStage: user.careerStage,
  location: user.location,
  headline: user.headline,
  skills: (user.skills || []).slice(0, 40),
  specialization: user.specialization,
  experience: (user.experience || []).map((e) => ({ title: e.title, company: e.company, start: e.startDate, end: e.current ? 'present' : e.endDate, duration: e.duration, location: e.location })),
  education: (user.education || []).map((e) => ({ school: e.school, degree: e.degree, field: e.field, years: e.duration })),
  languages: (user.languages || []).map((l) => l.name),
  portfolioUrl: user.username ? `${process.env.APP_URL || ''}/portfolio/${user.username}` : '',
  resumeText: String(user.resume?.parsedData?.rawText || '').slice(0, 3500)
});

/**
 * Fill a job's questions for a student: saved answers first, then the AI from
 * their profile and résumé. Personal decisions (salary, notice period,
 * relocation, motivation...) are left for the student.
 * Returns [{ questionId, answer, source: 'saved'|'ai'|'', needsYou, reason }].
 */
async function fillForStudent(user, job) {
  const results = [];
  const forAi = [];
  for (const q of job.questions) {
    const saved = savedAnswerFor(user.answerBank, q);
    if (saved) results.push({ questionId: q._id, answer: saved, source: 'saved', needsYou: false, reason: '' });
    else forAi.push(q);
  }
  if (!forAi.length) return results;

  let aiAnswers = [];
  try {
    const prompt = `You fill job screening questions for a student on BeeBark (an architecture, interiors, construction and real-estate network), using ONLY the facts below.

Rules:
- Answer only what the facts clearly support (years of experience with a tool or field, skills, education, city, languages, portfolio link).
- Set "confident": false for anything that is the student's own decision or not in the facts: expected or current salary, notice period, availability or joining date, willingness to relocate or travel, work authorisation, motivation ("why do you want..."), references, or any number you would have to guess.
- yes_no answers must be "Yes" or "No". number answers must be digits only (years: whole years, round down). single_choice answers must be exactly one of the options. Keep text answers short and factual, first person.
- "reason" (for confident:false) is one short sentence telling the student why they need to answer, e.g. "Only you can decide your expected salary."

Student facts (JSON): ${JSON.stringify(profileFacts(user))}

Job: ${job.title} at ${job.company}${job.location ? `, ${job.location}` : ''}

Questions (JSON): ${JSON.stringify(forAi.map((q) => ({ id: String(q._id), text: q.text, type: q.type, options: q.options })))}

Respond ONLY with JSON: {"answers":[{"id":"...","answer":"...","confident":true,"reason":""}]}`;
    const out = await askGroqForJson(prompt, { light: false });
    aiAnswers = Array.isArray(out?.answers) ? out.answers : [];
  } catch (err) {
    console.error('Screening AI error:', err.message);
  }

  for (const q of forAi) {
    const ai = aiAnswers.find((a) => String(a?.id) === String(q._id));
    const answer = ai && ai.confident === true ? cleanAnswer(q, ai.answer) : null;
    if (answer) results.push({ questionId: q._id, answer, source: 'ai', needsYou: false, reason: '' });
    else results.push({ questionId: q._id, answer: '', source: '', needsYou: true, reason: clip(ai?.reason, 160) || 'We need your own answer to this one.' });
  }
  // Optional questions the AI couldn't answer don't block the application
  return results.map((r) => {
    const q = job.questions.find((x) => String(x._id) === String(r.questionId));
    return r.needsYou && q && !q.required ? { ...r, needsYou: false } : r;
  });
}

module.exports = { cleanQuestions, cleanAnswer, checkAnswers, savedAnswerFor, saveToBank, fillForStudent, normalise, similarity, MAX_QUESTIONS };
