const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const rateLimit = require('../middleware/rateLimit');
const { validateImageUpload } = require('../lib/imageUpload');
const clientAuth = require('../middleware/clientAuth');

const router = express.Router();
router.use(rateLimit({ max: 30 }));

const uploadDir = path.join(__dirname, "..", "uploads", "references");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB cap
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) return cb(new Error("Only JPEG, PNG, and WebP images are allowed"));
    cb(null, true);
  },
});

router.post("/reference", clientAuth, upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image uploaded" });
  if (!await validateImageUpload(req.file)) return res.status(400).json({ error: "Uploaded file is not a valid JPEG, PNG, or WebP image" });
  res.json({ url: `/uploads/references/${req.file.filename}` });
});

module.exports = router;
