const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const fs = require('fs');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || ''
});

const uploadDir = '/tmp/uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 18 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Separate uploader for résumé/CV documents (PDF / DOCX)
const uploadDocument = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf' || ext === '.docx') {
      return cb(null, true);
    }
    cb(new Error('Only PDF or DOCX files are allowed'));
  }
});

// Chat attachments: photos and everyday work files (drawings, documents, sheets)
const CHAT_FILE_TYPES = /\.(jpe?g|png|gif|webp|heic|pdf|docx?|xlsx?|pptx?|txt|csv|zip|dwg|dxf|skp|rvt)$/i;
const uploadChatFile = multer({
  storage: storage,
  limits: { fileSize: 18 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    if (CHAT_FILE_TYPES.test(file.originalname)) return cb(null, true);
    cb(new Error('This file type can\'t be sent. Try a photo, PDF, Office document, ZIP or CAD file.'));
  }
});

const uploadToCloudinary = async (filePath, folder = 'social-network') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: 'auto'
    });
    
    fs.unlinkSync(filePath);
    
    // Photos are delivered as JPEG/WebP (f_auto) at a sensible size: iPhone
    // HEIC files otherwise show as broken images in most browsers
    const url = result.resource_type === 'image'
      ? result.secure_url.replace('/image/upload/', '/image/upload/f_auto,q_auto,c_limit,w_2400/').replace(/\.(heic|heif)$/i, '.jpg')
      : result.secure_url;
    return {
      url,
      publicId: result.public_id
    };
  } catch (error) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw error;
  }
};

module.exports = { cloudinary, upload, uploadDocument, uploadChatFile, uploadToCloudinary };