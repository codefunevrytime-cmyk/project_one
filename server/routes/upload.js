const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const rateLimit = require('../middleware/rateLimit');
const { finalizeImageUpload } = require('../lib/imageUpload');
const clientAuth = require('../middleware/clientAuth');

const router = express.Router();
router.use(rateLimit({ max: 30 }));

const uploadDir = path.join(__dirname, "..", "uploads", "references");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// FIXED: filename no longer derives its extension from file.originalname
// (client-controlled) — same stored-XSS pattern already fixed in
// vendorAuth.js (profile photo) and vendors.js (portfolio / new-vendor
// photo). Write a temp name only; finalizeImageUpload() below sniffs the
// real magic bytes and renames to an extension it derives itself.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}.tmp`),
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB cap
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) return cb(new Error("Only JPEG, PNG, and WebP images are allowed"));
    cb(null, true);
  },
});

// FIXED (stored XSS): now calls finalizeImageUpload() instead of
// validateImageUpload() — the old version only checked the file's real
// type without renaming it, so a JPEG-bytes file uploaded as
// "payload.svg" or "payload.html" kept that extension on disk and was
// served by express.static with a matching (attacker-chosen)
// Content-Type. finalizeImageUpload() renames to an extension it derives
// itself from the verified file type, so req.file.filename is never
// trusted past this point.
router.post("/reference", clientAuth, upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image uploaded" });

  const finalFilename = await finalizeImageUpload(req.file);
  if (!finalFilename) return res.status(400).json({ error: "Uploaded file is not a valid JPEG, PNG, or WebP image" });

  res.json({ url: `/uploads/references/${finalFilename}` });
});

module.exports = router;