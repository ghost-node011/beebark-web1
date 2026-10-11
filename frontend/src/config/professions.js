// Professions grouped by field, for the "Select profession" picker.
// `industry` is the BeeBark industry a group belongs to (used in onboarding).
export const PROFESSION_GROUPS = [
  {
    id: 'architecture_design', label: 'Architecture & Design', industry: 'architecture',
    items: [
      '3D Visualizer', 'AEC Software Trainer', 'Architect', 'BIM Specialist', 'CAD Draftsman', 'Facade Designer',
      'Furniture Designer', 'Graphic Designer (AEC)', 'Green Building Consultant', 'Interior Designer', 'Kitchen Designer',
      'Landscape Architect', 'Lighting Designer', 'Revit Modeller', 'Urban Designer', 'VR/AR Specialist', 'Vastu Consultant'
    ]
  },
  {
    id: 'construction', label: 'Construction & Execution', industry: 'construction',
    items: [
      'Building Consultant', 'Construction Manager', 'Contractor', 'Estimator', 'Land Surveyor', 'Project Manager',
      'Quantity Surveyor (QS)', 'Safety Officer', 'Site Engineer', 'Site Supervisor'
    ]
  },
  {
    id: 'engineering', label: 'Engineering', industry: 'construction',
    items: [
      'Acoustic Engineer', 'Automation Engineer', 'Civil Engineer', 'Electrical Engineer', 'Environmental Engineer',
      'Facade Engineer', 'Fire & Safety Engineer', 'Geotechnical Engineer', 'HVAC Engineer', 'MEP Engineer',
      'Mechanical Engineer', 'Plumbing Engineer', 'Structural Engineer'
    ]
  },
  {
    id: 'media', label: 'Media & Creative', industry: 'related',
    items: [
      'Architectural / Interior Photographer', 'Architecture / Construction Influencer', 'Content Creator',
      'Drone Operator', 'Videographer'
    ]
  },
  {
    id: 'real_estate', label: 'Real Estate & Property', industry: 'real_estate',
    items: ['Builder / Developer', 'Property Consultant', 'Property Manager', 'Real Estate Agent']
  },
  {
    id: 'skilled', label: 'Skilled Professionals', industry: 'construction',
    items: [
      'CCTV Technician', 'Carpenter', 'Electrician', 'Fabricator', 'False Ceiling Installer', 'Glass / Facade Installer',
      'HVAC Technician', 'Lift Technician', 'Mason', 'Painter', 'Plumber', 'Tile Installer', 'Welder'
    ]
  }
];

// "All / General" choice for each group, e.g. "Engineering (All / General)"
export const generalOf = (group) => `${group.label} (All / General)`;

// The group a chosen profession belongs to (or undefined for something typed in)
export const groupOfProfession = (value) => PROFESSION_GROUPS.find((g) => g.items.includes(value) || generalOf(g) === value);
