const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const natural = require('natural');
const fs = require('fs');

const skillsDatabase = [
  // Built environment — design & software
  'AutoCAD', 'Revit', 'SketchUp', 'Rhino', 'Grasshopper', '3ds Max', 'Lumion',
  'V-Ray', 'Enscape', 'BIM', 'ArchiCAD', 'Civil 3D', 'Navisworks', 'Tekla',
  'STAAD Pro', 'ETABS', 'SAP2000', 'Photoshop', 'Illustrator', 'InDesign', 'Figma',
  // Built environment — disciplines & practice
  'Architecture', 'Interior Design', 'Urban Design', 'Urban Planning',
  'Landscape Architecture', 'Structural Engineering', 'MEP', 'HVAC',
  'Construction Management', 'Project Management', 'Cost Estimation',
  'Quantity Surveying', 'Site Supervision', 'Sustainability', 'LEED', 'IGBC',
  'Space Planning', 'Rendering', '3D Modeling', 'Drafting', 'Vastu',
  'Real Estate', 'Facade Design', 'Lighting Design', 'Furniture Design',
  // General professional
  'Leadership', 'Communication', 'Teamwork', 'Client Management', 'Agile', 'Scrum',
  // Tech (kept for cross-domain resumes)
  'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'AWS', 'Excel'
];

const parseResume = async (filePath, fileType) => {
  try {
    let text = '';

    if (fileType === 'pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const parser = new PDFParse({ data: dataBuffer });
      const data = await parser.getText();
      await parser.destroy();
      text = data.text;
    } else if (fileType === 'docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value;
    } else {
      throw new Error('Unsupported file type');
    }

    const skills = extractSkills(text);
    const experience = extractExperience(text);
    const education = extractEducation(text);
    const email = extractEmail(text);
    const phone = extractPhone(text);

    return {
      rawText: text,
      skills,
      experience,
      education,
      email,
      phone
    };
  } catch (error) {
    console.error('Resume parsing error:', error);
    throw error;
  }
};

const extractSkills = (text) => {
  const foundSkills = [];
  const lowerText = text.toLowerCase();

  skillsDatabase.forEach(skill => {
    if (lowerText.includes(skill.toLowerCase())) {
      foundSkills.push(skill);
    }
  });

  return foundSkills;
};

const extractExperience = (text) => {
  const experiencePattern = /(\d+)\s*(years?|yrs?)\s*(of)?\s*experience/gi;
  const matches = text.match(experiencePattern);
  
  if (matches && matches.length > 0) {
    const years = parseInt(matches[0].match(/\d+/)[0]);
    return { years, description: matches[0] };
  }

  const jobTitles = ['Developer', 'Engineer', 'Manager', 'Designer', 'Analyst', 'Consultant'];
  const foundPositions = [];
  
  jobTitles.forEach(title => {
    if (text.toLowerCase().includes(title.toLowerCase())) {
      foundPositions.push(title);
    }
  });

  return {
    years: foundPositions.length > 0 ? 2 : 0,
    positions: foundPositions
  };
};

const extractEducation = (text) => {
  const degrees = ['PhD', 'Masters', 'Bachelor', 'MBA', 'B.Tech', 'M.Tech', 'B.E', 'M.E'];
  const foundDegrees = [];

  degrees.forEach(degree => {
    if (text.includes(degree)) {
      foundDegrees.push(degree);
    }
  });

  return foundDegrees.length > 0 ? foundDegrees : ['Not specified'];
};

const extractEmail = (text) => {
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = text.match(emailPattern);
  return emails ? emails[0] : null;
};

const extractPhone = (text) => {
  const phonePattern = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phones = text.match(phonePattern);
  return phones ? phones[0] : null;
};

module.exports = { parseResume, extractSkills, skillsDatabase };