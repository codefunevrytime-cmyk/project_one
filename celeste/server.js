const express = require('express');
const session = require('express-session');
const path = require('path');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'celeste-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

app.use('/', authRoutes);

// ─────────────────────────────────────────────────
// HOW TO CHANGE THE REDIRECT AFTER LOGIN / SIGNUP:
//
// Open your routes/auth.js file and find the login
// and signup POST handlers. Look for the line:
//
//   redirect: '/landing.html'
//
// Change '/landing.html' to wherever you want:
//   redirect: '/dashboard.html'   → goes to dashboard
//   redirect: '/home.html'        → goes to home
//   redirect: '/'                 → goes to root
//
// Do this for BOTH the login and signup routes.
// ─────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).redirect('/login');
});

app.listen(PORT, () => {
  console.log(`\n✨ Céleste is running at http://localhost:${PORT}\n`);
});