/* eslint-disable no-console */
// Demo accounts and sample data for showing BeeBark's industry dashboards.
//
//   node scripts/seedDemo.js           create (or recreate) all demo data
//   node scripts/seedDemo.js --remove  delete all demo data
//
// Everything created here is flagged isDemo: demo accounts only see each other,
// and real users never see demo people, jobs or projects.

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Job = require('../models/Job');
const PortfolioItem = require('../models/PortfolioItem');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

const DEMO_PASSWORD = 'BeeBark@Demo2026';
const img = (id, w = 1200) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;
const face = (id) => img(id, 300);

const PORTRAITS = {
  w1: '1494790108377-be9c29b29330', w2: '1544005313-94ddf0286df2', w3: '1534528741775-53994a69daeb',
  w4: '1531123897727-8f129e1688ce', w5: '1573496359142-b8d87734a5a2', w6: '1580489944761-15a19d654956',
  w7: '1517841905240-472988babdf9', w8: '1524504388940-b1c1722653e1',
  m1: '1507003211169-0a1dd7228f2d', m2: '1500648767791-00dcc994a43e', m3: '1506794778202-cad84cf45f1d',
  m4: '1519085360753-af0119f7cbe7', m5: '1560250097-0b93528c311a', m6: '1472099645785-5658abf4ff4e',
  m7: '1539571696357-5a69c17a67c6'
};

const IMAGES = {
  architecture: ['1487958449943-2429e8be8625', '1511818966892-d7d671e672a2', '1449157291145-7efd050a4d0e', '1479839672679-a46483c0e7c8', '1486325212027-8081e485255e', '1600585154340-be6161a56a0c', '1600596542815-ffad4c1539a9', '1580587771525-78b9dba3b914', '1503387762-592deb58ef4e', '1486718448742-163732cd1544'],
  interiors: ['1600607687939-ce8a6c25118c', '1600566753190-17f0baa2a6c3', '1618221195710-dd6b41faaea6', '1616486338812-3dadae4b4ace', '1586023492125-27b2c045efd7', '1505691938895-1758d7feb511', '1493809842364-78817add7ffb', '1502672260266-1c1ef2d93688', '1484154218962-a197022b5858', '1600210492486-724fe5c67fb0'],
  construction: ['1541888946425-d81bb19240f5', '1504307651254-35680f356dfd', '1581094794329-c8112a89af12', '1621905251189-08b45d6a269e', '1590725121839-892b458a74fe', '1517581177682-a085bb7ffb15', '1429497419816-9ca5cfb4571a', '1503387762-592deb58ef4e', '1486325212027-8081e485255e', '1449157291145-7efd050a4d0e'],
  real_estate: ['1545324418-cc1a3fa10c00', '1560518883-ce09059eeffa', '1564013799919-ab600027ffc6', '1512917774080-9991f1c4c750', '1570129477492-45c003edd2be', '1582407947304-fd86f028f716', '1494526585095-c41746248156', '1613490493576-7fde63acd811', '1431576901776-e539bd916ba2', '1449824913935-59a10b8d2000']
};

// One block per industry: the two demo logins, three people to connect with,
// a hiring firm, four jobs and the portfolio projects.
const INDUSTRIES = {
  architecture: {
    student: {
      name: 'Aarav Sharma', email: 'demo.architecture.student@thebeebark.com', pic: 'm7', location: 'Ahmedabad, India',
      bio: 'Fourth-year architecture student interested in public spaces and climate-responsive design.',
      skills: ['AutoCAD', 'Revit', 'SketchUp', 'Physical modelling'], careerStage: 'studying',
      education: [{ school: 'CEPT University', degree: 'B.Arch', field: 'Architecture', duration: '2022 – 2027' }],
      project: { title: 'Riverside Learning Centre', category: 'Academic project', projectStatus: '2026', location: 'Ahmedabad, India', tags: ['Architecture', 'Public space', 'Physical model'], images: [8, 0, 5, 9], description: 'A riverside library and learning centre designed around shaded courtyards and natural ventilation. Final-year studio project.' }
    },
    pro: {
      name: 'Meera Iyer', email: 'demo.architecture.pro@thebeebark.com', pic: 'w5', location: 'Mumbai, India',
      bio: 'Senior architect leading cultural and commercial projects. Passionate about timber and adaptive reuse.',
      skills: ['Revit', 'Rhino', 'Design development', 'Sustainable design'], careerStage: 'employed',
      experience: [{ title: 'Senior Architect', company: 'Studio Kaya', duration: '2019 – present', description: 'Leads cultural and commercial projects from concept to construction.' }],
      project: { title: 'Riverside Cultural Centre', category: 'Commercial', projectStatus: 'Built', location: 'Pune, India', tags: ['Cultural', 'Timber', 'Public space'], images: [0, 1, 3, 6, 7], description: 'A community hub that blends sustainable design with its natural surroundings, featuring timber structures and open public spaces.' }
    },
    people: [
      { name: 'Priya Menon', pic: 'w1', title: 'Architect', company: 'Studio North', location: 'Bengaluru, India', skills: ['Architecture', 'Sustainability', 'Housing'] },
      { name: 'Arjun Mehta', pic: 'm1', title: 'Founder', company: 'Field Collective', location: 'Bengaluru, India', skills: ['Urban design', 'Design research', 'Masterplanning'] },
      { name: 'Sophia Dsouza', pic: 'w2', title: 'Interior Designer', company: 'Layer Studio', location: 'Goa, India', skills: ['Interior design', 'Hospitality', 'Workplace'] }
    ],
    firm: { name: 'Form + Field Architects', location: 'Bengaluru, India' },
    jobs: [
      { title: 'Architecture Intern', company: 'Studio North', location: 'Bengaluru, India', employmentType: 'internship', tags: ['Architecture', 'Revit', 'Sustainable design'], image: 2, description: 'Join our housing team for six months: drawings, models and site visits on live residential projects.' },
      { title: 'Junior Architect (Graduate)', company: 'Form + Field Architects', location: 'Bengaluru, India', employmentType: 'graduate', tags: ['Design development', 'AutoCAD', '3D modelling'], image: 5, description: 'Graduate role supporting design development and working drawings for residential and commercial work.' },
      { title: 'Architect (Mid–Senior)', company: 'Form + Field Architects', location: 'Mumbai, India', employmentType: 'full_time', tags: ['Commercial', 'Revit', 'Client management'], image: 3, description: 'Lead commercial projects through design and construction, mentoring a team of three.' },
      { title: 'Project Architect', company: 'Harbour & Co.', location: 'Chennai, India', employmentType: 'full_time', tags: ['Hospitality', 'Coordination', 'Detailing'], image: 4, description: 'Coordinate consultants and contractors on a 120-key hospitality project.' }
    ]
  },
  interiors: {
    student: {
      name: 'Rhea Kapoor', email: 'demo.interiors.student@thebeebark.com', pic: 'w7', location: 'New Delhi, India',
      bio: 'Interior design student exploring co-living, material palettes and calm, light-filled spaces.',
      skills: ['Space planning', 'SketchUp', 'Moodboards', '3D visualisation'], careerStage: 'studying',
      education: [{ school: 'Pearl Academy', degree: 'B.Des', field: 'Interior Design', duration: '2023 – 2027' }],
      project: { title: 'Serene Co-Living Space', category: 'Academic project', projectStatus: '2026', location: 'New Delhi, India', tags: ['Interior design', 'Spatial planning', 'Moodboard'], images: [6, 4, 7, 9], description: 'A co-living floor for young professionals built around shared kitchens, quiet corners and natural materials.' }
    },
    pro: {
      name: 'Kabir Malhotra', email: 'demo.interiors.pro@thebeebark.com', pic: 'm2', location: 'New Delhi, India',
      bio: 'Interior designer creating warm, material-led homes and boutique hospitality spaces.',
      skills: ['Residential interiors', 'FF&E', 'Material sourcing', 'Lighting design'], careerStage: 'business_owner',
      experience: [{ title: 'Principal Designer', company: 'Lumen Interiors', duration: '2017 – present', description: 'Runs a studio of six designing homes and boutique hospitality spaces.' }],
      project: { title: 'Hillside Residence', category: 'Residential', projectStatus: 'Completed', location: 'Shimla, India', tags: ['Residential', 'Natural materials', 'Lighting'], images: [0, 1, 2, 5, 8], description: 'A hillside home with a focus on natural materials, light-filled open spaces and a warm, contemporary feel.' }
    },
    people: [
      { name: 'Isha Patel', pic: 'w6', title: 'Architect', company: 'Form & Field Architecture', location: 'Ahmedabad, India', skills: ['Architecture', 'Residential', 'Sustainable design'] },
      { name: 'Rohan Gupta', pic: 'm3', title: 'Material Supplier', company: 'StoneHaus Materials', location: 'Jaipur, India', skills: ['Natural stone', 'Tiles & surfaces', 'Interior finishes'] },
      { name: 'Tanvi Shah', pic: 'w3', title: 'Interior Designer', company: 'Atelier Collective', location: 'Mumbai, India', skills: ['Residential design', 'Sustainable interiors', 'Styling'] }
    ],
    firm: { name: 'Willow & Co. Interiors', location: 'Mumbai, India' },
    jobs: [
      { title: 'Interior Design Intern', company: 'Atelier Collective', location: 'Mumbai, India', employmentType: 'internship', tags: ['Interior design', 'Space planning', 'FF&E'], image: 3, description: 'Work alongside our residential team on concepts, mood boards and site measurements.' },
      { title: 'Junior Interior Designer (Graduate)', company: 'Lightspace Studio', location: 'Bengaluru, India', employmentType: 'graduate', tags: ['Residential design', '3D visualisation', 'Material sourcing'], image: 6, description: 'Graduate role producing layouts, 3D views and material schedules for apartments and villas.' },
      { title: 'Senior Interior Designer', company: 'Willow & Co. Interiors', location: 'Mumbai, India', employmentType: 'full_time', tags: ['Hospitality', 'Team lead', 'Client presentations'], image: 4, description: 'Lead hospitality interiors from concept through installation.' },
      { title: 'Interior Designer', company: 'Lumen Living', location: 'Pune, India', employmentType: 'full_time', tags: ['Residential', 'Detailing', 'Site coordination'], image: 7, description: 'Design and deliver premium apartment interiors with our site team.' }
    ]
  },
  real_estate: {
    student: {
      name: 'Ishaan Verma', email: 'demo.realestate.student@thebeebark.com', pic: 'm4', location: 'Hyderabad, India',
      bio: 'Real estate and urban infrastructure student keen on investment analysis and mixed-use development.',
      skills: ['Market research', 'Financial modelling', 'Excel', 'Site analysis'], careerStage: 'career_prep',
      education: [{ school: 'RICS School of Built Environment', degree: 'BBA', field: 'Real Estate and Urban Infrastructure', duration: '2023 – 2026' }],
      project: { title: 'Mixed-Use Feasibility Study', category: 'Academic project', projectStatus: '2026', location: 'Hyderabad, India', tags: ['Feasibility', 'Market research', 'Mixed-use'], images: [0, 8, 9], description: 'A feasibility and market study for a mixed-use development near a new metro line, with demand and return analysis.' }
    },
    pro: {
      name: 'Ananya Rao', email: 'demo.realestate.pro@thebeebark.com', pic: 'w8', location: 'Hyderabad, India',
      bio: 'Development manager delivering residential and mixed-use projects from land acquisition to handover.',
      skills: ['Development management', 'Mixed-use', 'Investment analysis', 'Stakeholder management'], careerStage: 'employed',
      experience: [{ title: 'Development Manager', company: 'Horizon Realty', duration: '2018 – present', description: 'Manages residential and mixed-use developments across Hyderabad and Bengaluru.' }],
      project: { title: 'Riverside Commons', category: 'Mixed-use development', projectStatus: 'Completed', location: 'Hyderabad, India', tags: ['Mixed-use', 'Residential', 'Green spaces'], images: [0, 2, 4, 7, 5], description: 'A 12-acre mixed-use development with homes, retail and green spaces, designed around a connected community.' }
    },
    people: [
      { name: 'Olivia Fernandes', pic: 'w4', title: 'Acquisitions Associate', company: 'Maple Real Estate', location: 'Mumbai, India', skills: ['Acquisitions', 'Investment', 'Due diligence'] },
      { name: 'James Thomas', pic: 'm5', title: 'Development Manager', company: 'Riverside Developments', location: 'Kochi, India', skills: ['Development', 'Site analysis', 'Approvals'] },
      { name: 'Daniel Kim', pic: 'm6', title: 'Architect', company: 'Park & Lane Architecture', location: 'Bengaluru, India', skills: ['Architecture', 'Urban design', 'Hospitality'] }
    ],
    firm: { name: 'Riverton Properties', location: 'Mumbai, India' },
    jobs: [
      { title: 'Real Estate Research Intern', company: 'Riverton Properties', location: 'Mumbai, India', employmentType: 'internship', tags: ['Research', 'Market analysis', 'Excel'], image: 8, description: 'Support our research team with market data, comparable analysis and investment memos.' },
      { title: 'Graduate Analyst (Residential)', company: 'Horizon Realty', location: 'Hyderabad, India', employmentType: 'graduate', tags: ['Residential', 'Financial modelling', 'Sales data'], image: 1, description: 'Graduate role analysing residential sales, pricing and absorption across our projects.' },
      { title: 'Project Manager – Development', company: 'Riverton Properties', location: 'Mumbai, India', employmentType: 'full_time', tags: ['Development', 'Approvals', 'Stakeholders'], image: 3, description: 'Manage residential developments from approvals through construction and handover.' },
      { title: 'Development Associate', company: 'Summit Real Estate Partners', location: 'Bengaluru, India', employmentType: 'full_time', tags: ['Feasibility', 'Land acquisition', 'Mixed-use'], image: 6, description: 'Run feasibility studies and support land acquisition for mixed-use projects.' }
    ]
  },
  construction: {
    student: {
      name: 'Siddharth Nair', email: 'demo.construction.student@thebeebark.com', pic: 'm1', location: 'Pune, India',
      bio: 'Civil engineering student focused on site engineering, BIM and construction planning.',
      skills: ['AutoCAD', 'Revit', 'Navisworks', 'Site surveying'], careerStage: 'intern',
      education: [{ school: 'College of Engineering Pune', degree: 'B.Tech', field: 'Civil Engineering', duration: '2022 – 2026' }],
      project: { title: 'Office Building BIM Model', category: 'Final-year project', projectStatus: '2026', location: 'Pune, India', tags: ['BIM', 'Revit', 'Construction design'], images: [7, 0, 2, 5], description: 'A Revit and Navisworks model of a multi-storey office building with structural and MEP coordination.' }
    },
    pro: {
      name: 'Vikram Singh', email: 'demo.construction.pro@thebeebark.com', pic: 'm3', location: 'Pune, India',
      bio: 'Construction project manager delivering commercial and infrastructure projects safely and on schedule.',
      skills: ['Project management', 'Site supervision', 'Planning', 'Safety'], careerStage: 'employed',
      experience: [{ title: 'Project Manager', company: 'BuildRight Infra', duration: '2016 – present', description: 'Delivers commercial and transit projects across Maharashtra.' }],
      project: { title: 'Metro Transit Hub', category: 'Commercial', projectStatus: 'Completed', location: 'Pune, India', tags: ['Transit', 'Mixed-use', 'Commercial'], images: [0, 1, 3, 6, 4], description: 'A transit-oriented mixed-use development with retail, offices and homes, coordinated with architects, engineers and trade contractors.' }
    },
    people: [
      { name: 'Neha Kulkarni', pic: 'w5', title: 'Senior Project Manager', company: 'BuildRight Construction', location: 'Mumbai, India', skills: ['General contracting', 'Commercial', 'Ground-up construction'] },
      { name: 'Marcus Pereira', pic: 'm2', title: 'Structural Engineer', company: 'Pinnacle Engineering Group', location: 'Pune, India', skills: ['Structural engineering', 'Civil', 'Mixed-use'] },
      { name: 'Emily Joseph', pic: 'w1', title: 'Graduate Engineer', company: 'Mace India', location: 'Bengaluru, India', skills: ['Site engineering', 'Project delivery', 'Graduates'] }
    ],
    firm: { name: 'Horizon Builders', location: 'Mumbai, India' },
    jobs: [
      { title: 'Site Engineering Intern', company: 'BuildRight Infra', location: 'Pune, India', employmentType: 'internship', tags: ['Internship', 'Site engineering', 'Construction'], image: 0, description: 'Support the site engineering team with setting out, progress monitoring and site reporting on a major residential development.' },
      { title: 'Quantity Surveying Intern', company: 'Horizon Builders', location: 'Mumbai, India', employmentType: 'internship', tags: ['Internship', 'Quantity surveying', 'Residential'], image: 1, description: 'Help prepare bills of quantities, measurements and cost reports.' },
      { title: 'Project Superintendent', company: 'Horizon Builders', location: 'Mumbai, India', employmentType: 'full_time', tags: ['Supervision', 'Safety', 'Scheduling'], image: 3, description: 'Run day-to-day site operations on a 30-storey residential tower.' },
      { title: 'Senior Construction Manager', company: 'Summit Development Group', location: 'Bengaluru, India', employmentType: 'full_time', tags: ['Commercial', 'Contracts', 'Team lead'], image: 6, description: 'Lead construction of a commercial campus from groundworks to handover.' }
    ]
  }
};

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const connectDb = async () => {
  const rawMongoUrl = (process.env.MONGO_URL || 'mongodb://localhost:27017').trim();
  const mongoUrl = rawMongoUrl.replace(/\/+(\?|$)/, '$1');
  const dbName = (process.env.DB_NAME || 'social_network_db').trim();
  await mongoose.connect(mongoUrl, { dbName, serverSelectionTimeoutMS: 15000 });
  return dbName;
};

const removeDemo = async () => {
  const demoUsers = await User.find({ isDemo: true }).select('_id').lean();
  const ids = demoUsers.map((u) => u._id);
  const [items, jobs, msgs, notes, users] = await Promise.all([
    PortfolioItem.deleteMany({ user: { $in: ids } }),
    Job.deleteMany({ isDemo: true }),
    Message.deleteMany({ $or: [{ sender: { $in: ids } }, { receiver: { $in: ids } }] }),
    Notification.deleteMany({ $or: [{ recipient: { $in: ids } }, { actor: { $in: ids } }] }),
    User.deleteMany({ isDemo: true })
  ]);
  console.log(`Removed demo data: ${users.deletedCount} users, ${jobs.deletedCount} jobs, ${items.deletedCount} portfolio items, ${msgs.deletedCount} messages, ${notes.deletedCount} notifications.`);
};

const createUser = async (fields) => {
  const user = new User({
    password: DEMO_PASSWORD,
    authProvider: 'local',
    isVerified: true,
    onboardingCompleted: true,
    isDemo: true,
    ...fields,
    username: `demo-${slug(fields.name)}`
  });
  await user.save();
  return user;
};

const seed = async () => {
  await removeDemo();
  const logins = [];

  for (const [industry, data] of Object.entries(INDUSTRIES)) {
    const images = IMAGES[industry];

    const firm = await createUser({
      name: data.firm.name, email: `demo.${slug(industry)}.firm@thebeebark.com`, role: 'firm',
      industries: [industry], location: data.firm.location, careerStage: 'business_owner',
      bio: `${data.firm.name} is hiring across ${data.firm.location.split(',')[0]}.`
    });

    const people = [];
    for (const p of data.people) {
      people.push(await createUser({
        name: p.name, email: `demo.${slug(industry)}.${slug(p.name)}@thebeebark.com`, role: 'professional',
        industries: [industry], location: p.location, skills: p.skills, profilePic: face(PORTRAITS[p.pic]),
        careerStage: 'employed', bio: `${p.title} at ${p.company}.`,
        experience: [{ title: p.title, company: p.company, duration: '2020 – present', description: '' }]
      }));
    }

    for (const [kind, account] of [['student', data.student], ['pro', data.pro]]) {
      const user = await createUser({
        name: account.name, email: account.email, role: kind === 'student' ? 'student' : 'professional',
        industries: [industry], location: account.location, bio: account.bio, skills: account.skills,
        profilePic: face(PORTRAITS[account.pic]), careerStage: account.careerStage,
        education: account.education || [], experience: account.experience || [],
        intent: kind === 'student' ? ['learn', 'get_hired'] : ['network', 'hire']
      });

      const proj = account.project;
      await PortfolioItem.create({
        user: user._id, title: proj.title, description: proj.description, category: proj.category,
        location: proj.location, projectStatus: proj.projectStatus, tags: proj.tags,
        images: proj.images.map((i) => img(images[i]))
      });

      // One existing connection, so the network isn't empty; the other people stay as suggestions
      user.connections.push(people[2]._id);
      people[2].connections.push(user._id);
      await user.save();
      await people[2].save();

      logins.push({ industry, audience: kind === 'student' ? 'Student' : 'Professional', email: account.email });
    }

    for (const j of data.jobs) {
      await Job.create({
        title: j.title, company: j.company, location: j.location, description: j.description,
        employmentType: j.employmentType, tags: j.tags, imageUrl: img(images[j.image], 800),
        industry, postedBy: firm._id, isDemo: true, status: 'active'
      });
    }
  }

  console.log('\nDemo accounts (password for all: ' + DEMO_PASSWORD + ')');
  console.table(logins);
};

(async () => {
  try {
    const dbName = await connectDb();
    console.log(`Connected to database "${dbName}"`);
    if (process.argv.includes('--remove')) await removeDemo();
    else await seed();
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
