const axios = require('axios');
const { skillsDatabase } = require('./resumeParser');

// LLM-powered job matching
const matchCandidatesWithJobLLM = async (job, candidates) => {
  const LLM_KEY = process.env.OPENAI_API_KEY;

  // Without an LLM key, use deterministic keyword matching instead of failing requests
  if (!LLM_KEY) {
    return fallbackMatching(job, candidates);
  }

  try {
    const candidateSummaries = candidates.map((candidate, idx) => {
      const resume = candidate.resume || {};
      return `Candidate ${idx + 1}:
- Name: ${candidate.name}
- Skills: ${(resume.parsedData?.skills || resume.skills || []).join(', ')}
- Experience: ${JSON.stringify(resume.parsedData?.experience || resume.experience || 'Not specified')}
- Education: ${(resume.parsedData?.education || []).join(', ')}`;
    }).join('\n\n');

    const prompt = `You are an AI recruitment assistant. Analyze and match candidates with the job posting.

Job Details:
Title: ${job.title}
Company: ${job.company}
Description: ${job.description}
Location: ${job.location}
Salary: ${job.salary}

Candidates:
${candidateSummaries}

Task: Score each candidate from 0-100 based on:
1. Skills match (50%)
2. Experience relevance (30%)
3. Education fit (20%)

Respond ONLY with a JSON array in this exact format:
[
  {"candidateIndex": 0, "score": 85, "matchedSkills": ["skill1", "skill2"], "reason": "brief reason"},
  {"candidateIndex": 1, "score": 72, "matchedSkills": ["skill1"], "reason": "brief reason"}
]`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert recruitment AI. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${LLM_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content.trim();
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      console.error('LLM did not return valid JSON');
      return fallbackMatching(job, candidates);
    }

    const scores = JSON.parse(jsonMatch[0]);
    
    const scoredCandidates = candidates.map((candidate, idx) => {
      const scoreData = scores.find(s => s.candidateIndex === idx) || { score: 0, matchedSkills: [], reason: 'No match' };
      return {
        ...candidate.toObject(),
        matchScore: scoreData.score,
        matchedSkills: scoreData.matchedSkills,
        matchReason: scoreData.reason
      };
    });

    scoredCandidates.sort((a, b) => b.matchScore - a.matchScore);
    return scoredCandidates.slice(0, 10);

  } catch (error) {
    console.error('LLM matching error:', error.response?.data || error.message);
    return fallbackMatching(job, candidates);
  }
};

// LLM-powered job recommendations
const getJobRecommendationsLLM = async (user, allJobs) => {
  const LLM_KEY = process.env.OPENAI_API_KEY;

  // Without an LLM key, use deterministic keyword matching instead of failing requests
  if (!LLM_KEY) {
    return fallbackRecommendations(user, allJobs);
  }

  try {
    const userResume = user.resume || {};
    const userSkills = (userResume.parsedData?.skills || userResume.skills || user.skills || []).join(', ');
    const userExperience = JSON.stringify(userResume.parsedData?.experience || userResume.experience || user.experience || []);

    const jobSummaries = allJobs.map((job, idx) => {
      return `Job ${idx + 1}:
- Title: ${job.title}
- Company: ${job.company}
- Description: ${job.description.substring(0, 300)}...
- Location: ${job.location}
- Salary: ${job.salary}`;
    }).join('\n\n');

    const prompt = `You are an AI career advisor. Match the user with relevant job postings.

User Profile:
- Skills: ${userSkills}
- Experience: ${userExperience}

Available Jobs:
${jobSummaries}

Task: Score each job from 0-100 based on:
1. Skills match (50%)
2. Experience level fit (30%)
3. Career growth potential (20%)

Respond ONLY with a JSON array in this exact format:
[
  {"jobIndex": 0, "score": 92, "matchedSkills": ["skill1", "skill2"], "reason": "brief reason"},
  {"jobIndex": 1, "score": 78, "matchedSkills": ["skill1"], "reason": "brief reason"}
]`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert career advisor AI. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${LLM_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content.trim();
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      console.error('LLM did not return valid JSON for recommendations');
      return fallbackRecommendations(user, allJobs);
    }

    const scores = JSON.parse(jsonMatch[0]);
    
    const scoredJobs = allJobs.map((job, idx) => {
      const scoreData = scores.find(s => s.jobIndex === idx) || { score: 0, matchedSkills: [], reason: 'No match' };
      return {
        ...job.toObject(),
        matchScore: scoreData.score,
        matchedSkills: scoreData.matchedSkills,
        matchReason: scoreData.reason
      };
    });

    scoredJobs.sort((a, b) => b.matchScore - a.matchScore);
    return scoredJobs.filter(job => job.matchScore > 30).slice(0, 20);

  } catch (error) {
    console.error('LLM recommendations error:', error.response?.data || error.message);
    return fallbackRecommendations(user, allJobs);
  }
};

// Fallback to simple keyword matching if LLM fails
function fallbackMatching(job, candidates) {
  const jobKeywords = extractKeywords(job.description);
  
  const scored = candidates.map(candidate => {
    const resume = candidate.resume || {};
    const candidateSkills = resume.parsedData?.skills || resume.skills || [];
    const matched = candidateSkills.filter(skill => 
      jobKeywords.some(kw => skill.toLowerCase().includes(kw.toLowerCase()))
    );
    
    return {
      ...candidate.toObject(),
      matchScore: jobKeywords.length > 0 ? Math.round((matched.length / jobKeywords.length) * 100) : 0,
      matchedSkills: matched,
      matchReason: 'Keyword match (fallback)'
    };
  });
  
  scored.sort((a, b) => b.matchScore - a.matchScore);
  return scored.slice(0, 10);
}

// Without the AI: score jobs by how many of the job's skills appear anywhere in
// the person's profile (skills, résumé skills, headline, job titles,
// specialisation), plus a bonus for the same industry and a level that fits.
function fallbackRecommendations(user, allJobs) {
  const profileText = [
    ...(user.resume?.parsedData?.skills || []),
    ...(user.skills || []),
    ...(user.specialization || []),
    user.headline || '',
    ...(user.experience || []).map((e) => `${e.title || ''} ${e.company || ''}`)
  ].join(' | ').toLowerCase();
  const student = user.role === 'student' || ['studying', 'career_prep', 'fresher', 'intern'].includes(user.careerStage);

  const scored = allJobs.map((job) => {
    const terms = [...new Set([...(job.skills || []), ...extractKeywords(`${job.title} ${job.description}`)].map((t) => t.toLowerCase()))];
    const matched = terms.filter((t) => profileText.includes(t));
    const coverage = terms.length ? matched.length / Math.min(terms.length, 6) : 0;
    let score = matched.length ? 40 + Math.round(Math.min(coverage, 1) * 50) : 15;
    if (job.industry && (user.industries || []).includes(job.industry)) score += 10;
    if (student && ['internship', 'graduate'].includes(job.employmentType)) score += 5;
    if (student && ['fresher', 'junior'].includes(job.experienceLevel)) score += 5;
    const data = typeof job.toObject === 'function' ? job.toObject() : job;
    return {
      ...data,
      matchScore: Math.min(score, 97),
      matchedSkills: matched,
      matchReason: matched.length ? `Matches your ${matched.slice(0, 3).join(', ')}` : 'In your field'
    };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);
  return scored.filter(job => job.matchScore > 30).slice(0, 20);
}

function extractKeywords(text) {
  // Reuse the same skills list resumes are parsed against (resumeParser.js) —
  // covers this platform's actual domain (architecture/construction/real
  // estate) as well as tech, instead of a tech-only list that could never
  // match an AEC job description or resume.
  const lowerText = text.toLowerCase();
  return skillsDatabase.filter(skill => lowerText.includes(skill.toLowerCase()));
}

module.exports = {
  matchCandidatesWithJobLLM,
  getJobRecommendationsLLM
};
