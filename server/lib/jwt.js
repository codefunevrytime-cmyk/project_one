// server/lib/jwt.js
//
// Centralized JWT configuration and utilities with safe fallback handling
// This ensures JWT_SECRET is always available and provides consistent error handling

const jwt = require('jsonwebtoken');

/**
 * Safely get JWT_SECRET with validation and fallback
 * @returns {string} The JWT secret to use
 * @throws {Error} If JWT_SECRET is not properly configured
 */
function getJWTSecret() {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET is not configured in environment variables');
  }
  
  if (secret.length < 32) {
    console.warn('⚠️  WARNING: JWT_SECRET is too short (< 32 characters). This is a security risk.');
  }
  
  // Check for placeholder values that shouldn't be used in production
  const placeholders = [
    'your_super_secret_jwt_key_change_this_in_production',
    'your_jwt_secret_here',
    'change_this_secret',
    'secret'
  ];
  
  if (placeholders.some(placeholder => secret.toLowerCase().includes(placeholder.toLowerCase()))) {
    console.warn('⚠️  WARNING: JWT_SECRET appears to be a placeholder value. This is a security risk.');
  }
  
  return secret;
}

/**
 * Safely get JWT_REFRESH_SECRET with fallback to JWT_SECRET
 * @returns {string} The refresh token secret to use
 */
function getRefreshSecret() {
  return process.env.JWT_REFRESH_SECRET || getJWTSecret();
}

/**
 * Safe JWT verification with consistent error handling
 * @param {string} token - The JWT token to verify
 * @param {string} [secret] - Optional secret (uses default if not provided)
 * @returns {object} The decoded payload
 * @throws {Error} If verification fails
 */
function safeVerify(token, secret) {
  try {
    const jwtSecret = secret || getJWTSecret();
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    } else if (error.message.includes('JWT_SECRET')) {
      throw new Error('Server configuration error: JWT secret not properly configured');
    }
    throw error;
  }
}

/**
 * Safe JWT signing with error handling
 * @param {object} payload - The payload to sign
 * @param {string} [secret] - Optional secret (uses default if not provided)
 * @param {object} [options] - JWT sign options
 * @returns {string} The signed token
 * @throws {Error} If signing fails
 */
function safeSign(payload, secret, options) {
  try {
    const jwtSecret = secret || getJWTSecret();
    return jwt.sign(payload, jwtSecret, options);
  } catch (error) {
    if (error.message.includes('JWT_SECRET')) {
      throw new Error('Server configuration error: JWT secret not properly configured');
    }
    throw new Error('Failed to generate token');
  }
}

module.exports = {
  getJWTSecret,
  getRefreshSecret,
  safeVerify,
  safeSign
};