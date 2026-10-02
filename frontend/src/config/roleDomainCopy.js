// Central place for role/domain-aware copy so wording adapts across the app
// (sidebar labels, page headers, empty states) without scattering
// role-checks through every component. Structural change only — same tabs,
// same layout, everywhere; the words change.

const ROLE_COPY = {
  student: {
    jobsLabel: 'Jobs',
    jobsSubtitle: 'AI-matched internships and entry roles to help you learn on the job',
    connectionsLabel: 'Mentors & Peers',
    connectionsSubtitle: 'Find mentors and classmates. Every connection is a step toward your first role.',
    portfolioSubtitle: 'Show what you\'ve built — coursework, personal projects, competition entries',
    portfolioAddLabel: 'Add Project',
    dashboardSubtitle: 'Here\'s how your internship search and network are going.'
  },
  firm: {
    jobsLabel: 'Hiring',
    jobsSubtitle: 'Post roles and let AI match you with strong candidates',
    connectionsLabel: 'Talent Network',
    connectionsSubtitle: 'Build relationships with the professionals and firms you work with',
    portfolioSubtitle: 'Showcase your firm\'s work to attract talent and clients',
    portfolioAddLabel: 'Add Work',
    dashboardSubtitle: 'Here\'s how your hiring pipeline and network are going.'
  },
  professional: {
    jobsLabel: 'Jobs',
    jobsSubtitle: 'AI-powered job matching for professionals',
    connectionsLabel: 'Connections',
    connectionsSubtitle: 'Grow your professional network — quality connections open more doors than quantity.',
    portfolioSubtitle: 'Add your work — it updates here automatically',
    portfolioAddLabel: 'Add Work',
    dashboardSubtitle: 'Here\'s what\'s happening with your network today.'
  }
};

const DOMAIN_COPY = {
  real_estate: { workNoun: 'listing', workNounPlural: 'listings' },
  architecture: { workNoun: 'project', workNounPlural: 'projects' },
  interiors: { workNoun: 'project', workNounPlural: 'projects' },
  construction: { workNoun: 'project', workNounPlural: 'projects' },
  related: { workNoun: 'work', workNounPlural: 'work' },
  general: { workNoun: 'work', workNounPlural: 'work' }
};

const normalizeRole = (role) => (ROLE_COPY[role] ? role : 'professional');
const primaryDomain = (industries) => (industries?.[0] && DOMAIN_COPY[industries[0]] ? industries[0] : 'general');

export const getCopy = (user) => {
  const role = normalizeRole(user?.role);
  const domain = primaryDomain(user?.industries);
  const roleCopy = ROLE_COPY[role];
  const domainCopy = DOMAIN_COPY[domain];

  // Domain vocabulary wins for the portfolio "add" action's noun (e.g. "Add Listing"
  // for real estate) except firms, who keep "Add Work" regardless of domain.
  const portfolioAddLabel = role !== 'firm' && domain !== 'general'
    ? `Add ${domainCopy.workNoun.charAt(0).toUpperCase()}${domainCopy.workNoun.slice(1)}`
    : roleCopy.portfolioAddLabel;

  return { ...roleCopy, ...domainCopy, portfolioAddLabel, role, domain };
};
