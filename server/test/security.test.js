const test = require('node:test');
const assert = require('node:assert/strict');
const rateLimit = require('../middleware/rateLimit');
const { isEmail, isPassword, text } = require('../lib/validation');
const { hasImageSignature } = require('../lib/imageUpload');

test('validation accepts valid values and rejects malformed or oversized input', () => {
  assert.equal(isEmail('client@example.com'), true);
  assert.equal(isEmail('not-an-email'), false);
  assert.equal(isPassword('eightChars'), true);
  assert.equal(isPassword('short'), false);
  assert.equal(text('  enquiry  ', 20), true);
  assert.equal(text('', 20), false);
  assert.equal(text('x'.repeat(21), 20), false);
});

test('rate limiter rejects requests beyond its configured window limit', () => {
  const limit = rateLimit({ windowMs: 60_000, max: 2 });
  const req = { ip: '127.0.0.1', socket: {} };
  const accepted = { count: 0 };
  const response = {
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };

  limit(req, response, () => { accepted.count += 1; });
  limit(req, response, () => { accepted.count += 1; });
  limit(req, response, () => { accepted.count += 1; });

  assert.equal(accepted.count, 2);
  assert.equal(response.statusCode, 429);
  assert.match(response.payload.error, /Too many requests/);
  assert.ok(response.headers['Retry-After'] >= 1);
});

test('image signature detection rejects files that merely claim to be images', () => {
  assert.equal(hasImageSignature(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), true);
  assert.equal(hasImageSignature(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), true);
  assert.equal(hasImageSignature(Buffer.from('RIFF1234WEBP', 'ascii')), true);
  assert.equal(hasImageSignature(Buffer.from('<script>alert(1)</script>')), false);
});
