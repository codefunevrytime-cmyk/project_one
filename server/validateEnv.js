// server/validateEnv.js
//
// Validates that all required environment variables are set before starting the server.
// Run this before server.js or import it at the top of server.js.

require('dotenv').config();

const REQUIRED_VARS = [
  'DB_HOST',
  'DB_PORT', 
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'FRONTEND_ORIGINS'
];

const OPTIONAL_VARS = [
  'JWT_REFRESH_SECRET',
  'PORT',
  'NODE_ENV'
];

function validateEnv() {
  console.log('🔍 Validating environment variables...\n');

  const missing = [];
  const empty = [];

  for (const varName of REQUIRED_VARS) {
    const value = process.env[varName];
    if (value === undefined) {
      missing.push(varName);
    } else if (value === '' || value === 'your_' + varName.toLowerCase() + '_here' ||
               value === 'your_super_secret_jwt_key_change_this_in_production' ||
               value === 'your_razorpay_key_id' ||
               value === 'your_razorpay_key_secret') {
      // Special case: FRONTEND_ORIGINS being empty is critical, not just a placeholder issue
      if (varName === 'FRONTEND_ORIGINS' && value === '') {
        console.error('❌ FRONTEND_ORIGINS is empty — this is a critical configuration error.');
        console.error('   The server cannot start without valid CORS origins.');
        console.error('   Please set FRONTEND_ORIGINS in your .env file.');
        console.error('   Example: FRONTEND_ORIGINS=http://localhost:5173,http://localhost:5174');
        console.error('   For production: FRONTEND_ORIGINS=https://yourdomain.com');
        process.exit(1);
      }
      empty.push(varName);
    }
  }

  // Special validation for FRONTEND_ORIGINS - must not be empty or just whitespace
  if (process.env.FRONTEND_ORIGINS) {
    const origins = process.env.FRONTEND_ORIGINS.split(',').map(o => o.trim()).filter(Boolean);
    if (origins.length === 0) {
      console.error('❌ FRONTEND_ORIGINS is set but contains no valid origins.');
      console.error('   Please provide at least one valid origin (comma-separated).');
      console.error('   Example: FRONTEND_ORIGINS=http://localhost:5173,http://localhost:5174');
      process.exit(1);
    }
  }
  
  if (missing.length > 0) {
    console.error('❌ MISSING REQUIRED ENVIRONMENT VARIABLES:');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('\nPlease copy .env.example to .env and fill in the required values.');
    console.error('Run: cp .env.example .env');
    process.exit(1);
  }
  
  if (empty.length > 0) {
    console.error('⚠️  ENVIRONMENT VARIABLES WITH DEFAULT/PLACEHOLDER VALUES:');
    empty.forEach(v => console.error(`   - ${v}`));
    console.error('\nPlease update these with real values in your .env file.');
    console.error('The server will start, but functionality may be limited.\n');
  }
  
  // Check for weak JWT secret
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  WARNING: JWT_SECRET should be at least 32 characters for security.');
  }
  
  // Set defaults for optional vars
  if (!process.env.JWT_REFRESH_SECRET) {
    process.env.JWT_REFRESH_SECRET = process.env.JWT_SECRET;
    console.log('ℹ️  JWT_REFRESH_SECRET not set, using JWT_SECRET as fallback');
  }
  
  if (!process.env.PORT) {
    process.env.PORT = '5000';
  }
  
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
  }
  
  console.log('✅ Environment validation passed.\n');
  console.log('Configuration:');
  console.log(`   Database: ${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
  console.log(`   Server Port: ${process.env.PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV}`);

  // Display parsed origins for clarity
  const parsedOrigins = process.env.FRONTEND_ORIGINS
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
  console.log(`   Frontend Origins (${parsedOrigins.length}):`);
  parsedOrigins.forEach(origin => console.log(`     - ${origin}`));
  console.log(`   Razorpay: ${process.env.RAZORPAY_KEY_ID ? 'Configured' : 'Not configured'}`);
  console.log('');
  
  return true;
}

// Run validation if this file is executed directly
if (require.main === module) {
  validateEnv();
}

module.exports = validateEnv;