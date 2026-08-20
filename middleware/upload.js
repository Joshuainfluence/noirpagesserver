// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');

// const uploadDir = path.join(__dirname, '..', 'uploads');
// if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, uploadDir),
//   filename: (req, file, cb) => {
//     const ext = path.extname(file.originalname);
//     cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
//   },
// });

// function fileFilter(req, file, cb) {
//   const allowed = ['image/jpeg', 'image/png', 'image/webp'];
//   if (allowed.includes(file.mimetype)) cb(null, true);
//   else cb(new Error('Only JPEG, PNG, or WEBP images are allowed'));
// }

// module.exports = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB







// server

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'noir-pages-covers',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

module.exports = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });