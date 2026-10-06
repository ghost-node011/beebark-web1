// One line describing who someone is, e.g. "Junior Architect at Studio Lotus",
// built from what they've actually filled in rather than a fixed role label.
const STAGE_LABELS = {
  studying: 'Student',
  career_prep: 'Student',
  fresher: 'Fresher',
  intern: 'Intern',
  freelance: 'Freelancer',
  business_owner: 'Business owner'
};

const INDUSTRY_LABELS = {
  architecture: 'Architecture',
  interiors: 'Interior design',
  construction: 'Construction',
  real_estate: 'Real estate',
  related: 'Built environment'
};

export const personHeadline = (p) => {
  if (!p) return '';
  if (p.headline) return p.headline; // written by the person themselves
  const experience = p.experience || [];
  const current = experience.find((e) => e.current) || experience[0];
  if (current?.title) return current.company ? `${current.title} at ${current.company}` : current.title;
  if (p.specialization?.[0]) return p.specialization[0];
  const stage = STAGE_LABELS[p.careerStage] || (p.role === 'student' ? 'Student' : '');
  const industry = INDUSTRY_LABELS[p.industries?.[0]];
  if (stage && industry) return `${stage} · ${industry}`;
  if (stage) return stage;
  if (industry) return `${industry} professional`;
  return p.role === 'student' ? 'Student' : 'Professional';
};

export default personHeadline;
