const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

const users = new Map();

function requireGuest(req, res, next) {
  if (req.session.user) return res.redirect('http://localhost:5500/landing.html');
  next();
}

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

router.get('/', (req, res) => res.redirect('/login'));
router.get('/login', requireGuest, (req, res) => {
  res.sendFile(require('path').join(__dirname, '../public', 'login.html'));
});
router.get('/signup', requireGuest, (req, res) => {
  res.sendFile(require('path').join(__dirname, '../public', 'signup.html'));
});
router.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(require('path').join(__dirname, '../public', 'dashboard.html'));
});

router.post('/api/login', [
  body('email').trim().isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  const { email, password, remember } = req.body;
  const user = users.get(email.toLowerCase());
  if (!user) {
    return res.status(401).json({ success: false, errors: [{ path: 'email', msg: 'No account found with this email' }] });
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ success: false, errors: [{ path: 'password', msg: 'Incorrect password' }] });
  }
  req.session.user = { id: user.id, email: user.email, name: user.firstName };
  if (remember) req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
res.json({ success: true, redirect: 'http://localhost:5500/landing.html?user=' + user.firstName, name: user.firstName });});

router.post('/api/signup', [
  body('firstName').trim().notEmpty().withMessage('First name is required')
    .isLength({ min: 2 }).withMessage('First name too short')
    .matches(/^[A-Za-z]+$/).withMessage('First name must contain letters only'),
  body('lastName').trim().notEmpty().withMessage('Last name is required')
    .matches(/^[A-Za-z]+$/).withMessage('Last name must contain letters only'),
  body('email').trim().isEmail().withMessage('Please enter a valid email'),
  body('phone').optional({ checkFalsy: true })
    .matches(/^[\+]?[\d\s\-\(\)]{8,15}$/).withMessage('Invalid phone number'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
  body('confirmPassword').custom((val, { req }) => {
    if (val !== req.body.password) throw new Error('Passwords do not match');
    return true;
  }),
  body('terms').equals('true').withMessage('You must accept the terms')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  const { firstName, lastName, email, phone, password } = req.body;
  const key = email.toLowerCase();
  if (users.has(key)) {
    return res.status(409).json({ success: false, errors: [{ path: 'email', msg: 'An account with this email already exists' }] });
  }
  const hashed = await bcrypt.hash(password, 12);
  const user = {
    id: Date.now().toString(),
    firstName, lastName,
    email: key, phone,
    password: hashed,
    createdAt: new Date()
  };
  users.set(key, user);
  req.session.user = { id: user.id, email: user.email, name: user.firstName };
res.json({ success: true, redirect: 'http://localhost:5500/landing.html?user=' + user.firstName, name: user.firstName });});

router.get('/api/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
  res.json({ name: req.session.user.name, email: req.session.user.email });
});

router.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true, redirect: '/login' }));
});

module.exports = router;
