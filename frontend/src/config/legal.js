// BeeBark's policies (text in content/legal/*.json, converted from the .docx files in docs/).
// `updated` is shown when the document itself leaves its date blank.
export const LEGAL_DOCS = [
  { slug: 'user-agreement', path: '/terms', label: 'User Agreement', load: () => import('../content/legal/user-agreement.json') },
  { slug: 'privacy', path: '/privacy', label: 'Privacy Policy', updated: '11 October 2026', load: () => import('../content/legal/privacy.json') },
  { slug: 'community-standards', path: '/community-standards', label: 'Community Standards', load: () => import('../content/legal/community-standards.json') },
  { slug: 'business-and-hiring', path: '/business-and-hiring', label: 'Business Accounts & Hiring', updated: '11 October 2026', load: () => import('../content/legal/business-and-hiring.json') },
  { slug: 'ai-policy', path: '/ai-policy', label: 'AI Policy', updated: '11 October 2026', load: () => import('../content/legal/ai-policy.json') }
];

export const legalDoc = (slug) => LEGAL_DOCS.find((d) => d.slug === slug);
export const legalPath = (slug) => legalDoc(slug)?.path || '/terms';

export const LEGAL_CONTACT = {
  entity: 'Beebark Tech LLP',
  address: '249, First Floor, Kandle Kashan Fatehpuri, Chandni Chowk, Chandni Chowk Police Station, Delhi, North Delhi – 110006, India',
  general: 'info@thebeebark.com',
  grievance: 'help@thebeebark.com'
};

// Names of other policies as the documents mention them, linked in the text
export const LEGAL_MENTIONS = [
  [/\b(?:BeeBark )?User Agreement\b/, 'user-agreement'],
  [/\b(?:BeeBark )?Privacy Policy\b/, 'privacy'],
  [/\bCommunity Standards\b/, 'community-standards'],
  [/\bSchedule on Business Accounts, Authorised Hirers and Recruitment\b|\bBusiness Accounts and Hiring Schedule\b/, 'business-and-hiring'],
  [/\bAI Policy\b|\bAI Terms\b/, 'ai-policy']
];
