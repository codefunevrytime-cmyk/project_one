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

app.use((req, res) => {
  res.status(404).redirect('/login');
});

app.listen(PORT, () => {
  console.log(`\n✨ Céleste is running at http://localhost:${PORT}\n`);
});