const Company = require('../models/Company');
const User = require('../models/User');

// Firm used to be an account type. Each old firm account becomes a personal
// (professional) profile that owns a company Page made from its business details.
// Safe to call on every sign-in: it only acts on accounts still marked as firms.
const TYPE_FROM_BUSINESS = [
  [/real\s*estate|realty|developer|broker/i, 'real_estate'],
  [/interior/i, 'interior_firm'],
  [/architect/i, 'architecture_firm'],
  [/supplier|manufactur|material|dealer|trader/i, 'supplier'],
  [/construct|contract|builder|infra/i, 'construction'],
  [/consult/i, 'consultancy']
];

async function firmToPage(user) {
  if (!user || !['firm', 'company'].includes(user.role)) return null;
  const { slugify, freeSlug } = require('../routes/company');
  const b = user.business || {};
  const name = (b.name || user.name || '').trim().slice(0, 120) || 'My company';
  const typeText = `${b.type || ''} ${(b.services || []).join(' ')} ${(user.industries || []).join(' ')}`;
  const type = (TYPE_FROM_BUSINESS.find(([re]) => re.test(typeText)) || [null, 'other'])[1];
  let page = await Company.findOne({ owner: user._id, migratedFrom: 'firm_account' });
  if (!page) {
    const teamSizes = Company.TEAM_SIZES;
    page = await Company.create({
      name,
      slug: await freeSlug(slugify(name) || user.username),
      type,
      tagline: (user.headline || '').slice(0, 160),
      about: (b.about || user.bio || '').slice(0, 3000),
      logo: user.profilePic || '',
      cover: user.coverPhoto || '',
      website: b.website || user.contact?.website || '',
      email: user.contact?.email || '',
      phone: user.contact?.phone || '',
      locations: [b.address || user.location].filter(Boolean).slice(0, 10),
      teamSize: teamSizes.includes(b.teamSize) ? b.teamSize : '',
      founded: /^\d{4}$/.test(b.founded || '') ? b.founded : '',
      specialties: (b.services || []).slice(0, 20),
      owner: user._id,
      followers: [...new Set([String(user._id), ...(user.followers || []).map(String)])],
      migratedFrom: 'firm_account'
    });
  }
  const linked = (user.experience || []).some((e) => String(e.companyPage) === String(page._id));
  const update = { $set: { role: 'professional', careerStage: user.careerStage || 'business_owner' } };
  if (!linked) update.$push = { experience: { title: 'Owner', company: page.name, companyPage: page._id, current: true, startDate: page.founded ? `${page.founded}-01` : '' } };
  await User.updateOne({ _id: user._id }, update);
  return page;
}

module.exports = { firmToPage };
