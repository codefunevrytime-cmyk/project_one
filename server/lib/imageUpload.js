const fs = require('fs/promises');
const path = require('path');

const SIGNATURES = {
  jpeg: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  png:  (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  webp: (b) => b.length >= 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
};

const EXT_BY_TYPE = { jpeg: '.jpg', png: '.png', webp: '.webp' };

// Real type from magic bytes only — never trust file.originalname or
// file.mimetype (both attacker-controlled: mimetype is just the client's
// declared Content-Type header, and originalname is whatever filename the
// client sent).
function detectImageType(buffer) {
  for (const [type, check] of Object.entries(SIGNATURES)) {
    if (check(buffer)) return type;
  }
  return null;
}

function hasImageSignature(buffer) {
  return detectImageType(buffer) !== null;
}

async function readHeader(filePath) {
  const handle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(12);
    await handle.read(buffer, 0, buffer.length, 0);
    return buffer;
  } finally {
    await handle.close();
  }
}

// Kept for backward compatibility with any call site that only needs a
// boolean. Prefer finalizeImageUpload() in routes that write the file's
// URL/path to the DB or serve it back — see note below.
async function validateImageUpload(file) {
  if (!file?.path) return false;
  try {
    const buffer = await readHeader(file.path);
    if (hasImageSignature(buffer)) return true;
  } catch { /* Treat unreadable uploads as invalid. */ }
  await fs.unlink(file.path).catch(() => {});
  return false;
}

// Validates the file's REAL content via magic bytes, then renames it on
// disk to use the extension that matches the verified type (e.g. '.jpg')
// — never the extension from file.originalname.
//
// SECURITY: multer must save uploads under a neutral temp name (see the
// `filename` callback in each route's multer.diskStorage config — it
// should NOT use path.extname(file.originalname)) for this to actually
// close the gap. If the original extension is baked into the filename
// before this runs, an attacker can pair valid image magic bytes with
// embedded HTML/JS and name the file "x.html". Since static file servers
// (e.g. Express's express.static) set the response Content-Type from the
// file extension — not the real bytes — that file would then be served
// with a browser-trusted Content-Type, letting the embedded script run:
// stored XSS on your own origin, served from your own /uploads route.
//
// Returns the final filename (string) on success, or null if the content
// isn't a recognized image (the temp file is deleted in that case).
async function finalizeImageUpload(file) {
  if (!file?.path) return null;
  let type = null;
  try {
    const buffer = await readHeader(file.path);
    type = detectImageType(buffer);
  } catch { /* fall through to null */ }

  if (!type) {
    await fs.unlink(file.path).catch(() => {});
    return null;
  }

  const base = path.basename(file.filename, path.extname(file.filename));
  const finalFilename = base + EXT_BY_TYPE[type];
  await fs.rename(file.path, path.join(path.dirname(file.path), finalFilename));
  return finalFilename;
}

module.exports = {
  hasImageSignature,
  detectImageType,
  validateImageUpload,
  finalizeImageUpload,
  EXT_BY_TYPE,
};