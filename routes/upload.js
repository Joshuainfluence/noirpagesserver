const express = require('express');
const upload = require('../middleware/upload');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/upload  (form-data field name: "image")  -> { url }
// router.post('/', requireAuth, requireAdmin, upload.single('image'), (req, res) => {
//   if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
//   const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
//   res.status(201).json({ url });
// });


router.post('/', requireAuth, requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
  res.status(201).json({ url: req.file.path }); // Cloudinary's hosted URL
});
module.exports = router;