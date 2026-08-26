const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmail(value) {
  return typeof value === 'string' && EMAIL.test(value.trim());
}

function isPassword(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128;
}

function text(value, max = 2000) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
}

module.exports = { isEmail, isPassword, text };
