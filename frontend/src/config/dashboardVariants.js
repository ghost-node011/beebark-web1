// Dashboard wording per industry and audience. The layout is shared; these
// strings, chips, calls to action and editorial tips change per variant.
// News items are BeeBark's own guidance, not third-party articles.

export const STAGES = {
  student: [
    { id: 'studying', label: 'Studying', icon: 'GraduationCap' },
    { id: 'career_prep', label: 'Career preparation', icon: 'Users' },
    { id: 'fresher', label: 'Fresher', icon: 'BriefcaseBusiness' },
    { id: 'intern', label: 'Intern', icon: 'Building2' }
  ],
  professional: [
    { id: 'employed', label: 'Employed', icon: 'Briefcase' },
    { id: 'freelance', label: 'Freelance', icon: 'UserRound' },
    { id: 'business_owner', label: 'Business owner', icon: 'Store' }
  ]
};

export const INDUSTRY_LABEL = {
  architecture: 'Architecture',
  interiors: 'Interior Design',
  real_estate: 'Real Estate',
  construction: 'Construction',
  general: 'Built Environment'
};

const VARIANTS = {
  architecture: {
    student: {
      title: 'Build your architecture career.',
      subtitle: 'Discover opportunities, showcase your work and connect with architects, studios and peers.',
      nextStep: 'Add a studio project to showcase your work and get noticed by studios and recruiters.',
      primary: { label: 'Add a studio project', to: '/portfolio' },
      secondary: { label: 'Find internships', to: '/jobs' },
      opportunitiesTitle: 'Recommended Opportunities',
      peopleTitle: 'People to Connect With',
      official: 'Welcome to BeeBark! A community for the next generation of architects. Share your work, find opportunities and connect with inspiring people and studios.'
    },
    professional: {
      title: 'Grow your architecture network.',
      subtitle: 'Showcase your work, connect with industry professionals and find new clients and opportunities.',
      nextStep: 'Showcase a project to highlight your expertise and attract new clients and connections.',
      primary: { label: 'Showcase a project', to: '/portfolio' },
      secondary: { label: 'Find connections', to: '/connections' },
      opportunitiesTitle: 'Architecture Jobs',
      peopleTitle: 'Recommended Connections',
      official: 'Welcome to the Architecture community on BeeBark! Connect with fellow professionals, showcase your projects and explore new opportunities across the industry.'
    },
    news: [
      { title: 'Five things studios look for in a graduate portfolio', tag: 'Careers', image: '1503387762-592deb58ef4e' },
      { title: 'Presenting sustainability decisions clearly to clients', tag: 'Practice', image: '1600596542815-ffad4c1539a9' }
    ]
  },
  interiors: {
    student: {
      title: 'Start your interior design journey.',
      subtitle: 'Discover opportunities, showcase your work and connect with interior designers, studios and peers.',
      nextStep: 'Add a design project to showcase your work and get noticed by interior design studios and recruiters.',
      primary: { label: 'Add a design project', to: '/portfolio' },
      secondary: { label: 'Find internships', to: '/jobs' },
      opportunitiesTitle: 'Recommended Opportunities',
      peopleTitle: 'People to Connect With',
      official: 'Welcome to BeeBark! A community for the next generation of interior designers. Share your work, find opportunities and connect with inspiring people and studios.'
    },
    professional: {
      title: 'Connect around great spaces.',
      subtitle: 'Showcase your work, connect with architects, material suppliers and contractors, and win new clients.',
      nextStep: 'Showcase an interior project to highlight your style and attract new clients and connections.',
      primary: { label: 'Showcase your work', to: '/portfolio' },
      secondary: { label: 'Find connections', to: '/connections' },
      opportunitiesTitle: 'Interior Design Opportunities',
      peopleTitle: 'Recommended Connections',
      official: 'Welcome to the Interior Design community on BeeBark! Connect with architects, suppliers and contractors, showcase your projects and discover new opportunities.'
    },
    news: [
      { title: 'Photographing finished interiors for your portfolio', tag: 'Portfolio', image: '1616486338812-3dadae4b4ace' },
      { title: 'Writing a clear brief for material suppliers', tag: 'Practice', image: '1600566753190-17f0baa2a6c3' }
    ]
  },
  real_estate: {
    student: {
      title: 'Build your future in real estate.',
      subtitle: 'Explore opportunities, connect with industry professionals and showcase your potential.',
      nextStep: 'Complete your profile to showcase your real estate interests and get matched with relevant opportunities and professionals.',
      primary: { label: 'Complete your profile', to: '/profile' },
      secondary: { label: 'Explore opportunities', to: '/jobs' },
      opportunitiesTitle: 'Latest Opportunities',
      peopleTitle: 'Recommended Connections',
      official: 'Welcome to the Real Estate community on BeeBark! Connect with developers, investors and industry professionals, explore opportunities and take the next step in your career.'
    },
    professional: {
      title: 'Grow your real estate network.',
      subtitle: 'Showcase your work, connect with developers, brokers, architects and contractors, and reach new clients.',
      nextStep: 'Update your profile to highlight your real estate experience and connect with the right clients and partners.',
      primary: { label: 'Update your profile', to: '/profile' },
      secondary: { label: 'Find connections', to: '/connections' },
      opportunitiesTitle: 'Real Estate Opportunities',
      peopleTitle: 'Recommended Connections',
      official: 'Welcome to the Real Estate community on BeeBark! Connect with developers, brokers, architects, contractors and other professionals, and discover new opportunities.'
    },
    news: [
      { title: 'How to present a project so buyers and partners trust it', tag: 'Listings', image: '1545324418-cc1a3fa10c00' },
      { title: 'Building a referral network with architects and builders', tag: 'Networking', image: '1449824913935-59a10b8d2000' }
    ]
  },
  construction: {
    student: {
      title: 'Take your first step into construction.',
      subtitle: 'Explore internships and entry-level roles, connect with construction professionals and showcase your potential.',
      nextStep: 'Add your skills to get matched with construction internships and entry-level opportunities from leading employers.',
      primary: { label: 'Add your skills', to: '/profile' },
      secondary: { label: 'Find internships', to: '/jobs' },
      opportunitiesTitle: 'Latest Opportunities',
      peopleTitle: 'Recommended Connections',
      official: 'Welcome to the Construction community on BeeBark! Connect with construction firms, engineers and industry professionals, explore opportunities and take the next step in your career.'
    },
    professional: {
      title: 'Build your industry connections.',
      subtitle: 'Showcase your projects, connect with contractors, engineers, architects, developers and suppliers, and win new work.',
      nextStep: 'Showcase your construction experience to get noticed by the right clients, partners and opportunities.',
      primary: { label: 'Showcase your experience', to: '/portfolio' },
      secondary: { label: 'Find connections', to: '/connections' },
      opportunitiesTitle: 'Construction Opportunities',
      peopleTitle: 'Recommended Connections',
      official: 'Welcome to the Construction community on BeeBark! Connect with contractors, engineers, architects, suppliers and other professionals, and discover new opportunities.'
    },
    news: [
      { title: 'Documenting site work so clients can see your track record', tag: 'Portfolio', image: '1541888946425-d81bb19240f5' },
      { title: 'Skills graduates should list for site engineering roles', tag: 'Careers', image: '1504307651254-35680f356dfd' }
    ]
  },
  general: {
    student: {
      title: 'Start your career in the built environment.',
      subtitle: 'Explore opportunities, connect with professionals and showcase your potential.',
      nextStep: 'Pick your industry focus so we can tailor opportunities and connections to you.',
      primary: { label: 'Complete your profile', to: '/profile' },
      secondary: { label: 'Explore opportunities', to: '/jobs' },
      opportunitiesTitle: 'Latest Opportunities',
      peopleTitle: 'Recommended Connections',
      official: 'Welcome to BeeBark! Connect with architects, designers, builders and real estate professionals, and take the next step in your career.'
    },
    professional: {
      title: 'Grow your professional network.',
      subtitle: 'Showcase your work, connect with professionals across the industry and find new clients and opportunities.',
      nextStep: 'Pick your industry focus so we can tailor clients, connections and opportunities to you.',
      primary: { label: 'Complete your profile', to: '/profile' },
      secondary: { label: 'Find connections', to: '/connections' },
      opportunitiesTitle: 'Latest Opportunities',
      peopleTitle: 'Recommended Connections',
      official: 'Welcome to BeeBark! Connect with architects, designers, builders and real estate professionals, and discover new opportunities.'
    },
    news: [
      { title: 'Five profile details that help clients find you', tag: 'Profile', image: '1487958449943-2429e8be8625' },
      { title: 'Turning a connection into a conversation', tag: 'Networking', image: '1497366216548-37526070297c' }
    ]
  }
};

export const unsplash = (id, w = 600) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

export const getVariant = (industry, audience) => {
  const block = VARIANTS[industry] || VARIANTS.general;
  return { ...(block[audience] || block.professional), news: block.news, industry: VARIANTS[industry] ? industry : 'general' };
};

export const ALL_NEWS = Object.entries(VARIANTS)
  .filter(([key]) => key !== 'general')
  .flatMap(([industry, v]) => v.news.map((n) => ({ ...n, industry })));
