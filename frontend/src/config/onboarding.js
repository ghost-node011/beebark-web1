import { FaBookOpen, FaUsers, FaUserPlus, FaBriefcase } from 'react-icons/fa';

// Onboarding step 2 — what the user wants to do (multi-select)
export const INTENTS = [
  { value: 'learn', label: 'Learn', tagline: 'Grow skills & knowledge', icon: FaBookOpen },
  { value: 'network', label: 'Network', tagline: 'Meet peers & build connections', icon: FaUsers },
  { value: 'hire', label: 'Hire', tagline: 'Find and recruit talent', icon: FaUserPlus },
  { value: 'get_hired', label: 'Get Hired', tagline: 'Discover roles & opportunities', icon: FaBriefcase }
];

// Goals differ by who you are: students don't hire, business owners rarely want to be hired
export const intentsFor = (user) => {
  if (user?.role === 'student') {
    return INTENTS.filter((i) => i.value !== 'hire')
      .map((i) => (i.value === 'get_hired' ? { ...i, label: 'Get Hired', tagline: 'Internships & first jobs' } : i));
  }
  if (user?.careerStage === 'business_owner') {
    return INTENTS.filter((i) => i.value !== 'get_hired')
      .map((i) => (i.value === 'hire' ? { ...i, tagline: 'Build your team, find freelancers' } : i));
  }
  if (['fresher', 'intern'].includes(user?.careerStage)) {
    return INTENTS.filter((i) => i.value !== 'hire');
  }
  return INTENTS;
};

// Onboarding step 3 — industry focus (multi-select)
export const INDUSTRIES = [
  { value: 'architecture', label: 'Architecture' },
  { value: 'interiors', label: 'Interiors' },
  { value: 'construction', label: 'Construction' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'related', label: 'Related Fields' }
];
