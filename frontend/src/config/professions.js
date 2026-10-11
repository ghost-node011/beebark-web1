// Professions BeeBark is for, grouped by field, for the "Select profession" picker.
// `industry` is the BeeBark industry a group belongs to (used in onboarding).
export const PROFESSION_GROUPS = [
  {
    id: 'architecture', label: 'Architecture', industry: 'architecture',
    items: [
      'Architect', 'Landscape Architect', 'Urban Designer', 'Conservation Architect', '3D Visualizer', 'BIM Specialist',
      'CAD Draftsman', 'Revit Modeller', 'Facade Designer', 'Green Building Consultant', 'Vastu Consultant'
    ]
  },
  {
    id: 'interiors', label: 'Interiors', industry: 'interiors',
    items: [
      'Interior Designer', 'Interior Architect', 'Kitchen Designer', 'Furniture Designer', 'Lighting Designer',
      'Interior Decorator / Stylist', 'Modular Furniture Specialist', 'Turnkey Interior Contractor'
    ]
  },
  {
    id: 'construction', label: 'Construction', industry: 'construction',
    items: [
      'Contractor', 'Construction Manager', 'Project Manager', 'Site Engineer', 'Site Supervisor', 'Civil Engineer',
      'Structural Engineer', 'Quantity Surveyor (QS)', 'Estimator', 'Land Surveyor', 'Safety Officer', 'Building Consultant'
    ]
  },
  {
    id: 'real_estate', label: 'Real Estate', industry: 'real_estate',
    items: [
      'Builder / Developer', 'Real Estate Agent / Broker', 'Property Consultant', 'Property Manager', 'Property Valuer',
      'Leasing Manager', 'Sales Manager (Real Estate)'
    ]
  }
];

// "All / General" choice for each group, e.g. "Construction (All / General)"
export const generalOf = (group) => `${group.label} (All / General)`;

// The group a chosen profession belongs to (or undefined)
export const groupOfProfession = (value) => PROFESSION_GROUPS.find((g) => g.items.includes(value) || generalOf(g) === value);
