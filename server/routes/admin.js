const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('../middleware/rateLimit');
const { isEmail } = require('../lib/validation');
const { setSession } = require('../lib/session');
router.use(rateLimit({ max: 10 }));

// POST /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!isEmail(email) || typeof password !== 'string') return res.status(400).json({ error: 'Invalid credentials' });
    const result = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = result.rows[0];
    const valid = await bcrypt.compare(password, admin.password);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // NOTE: role: 'admin' added here — the admin token used to be
    // identical in shape to a client token ({ id }), so there was no way
    // for anything reading the token (e.g. the Socket.IO auth layer) to
    // tell an admin apart from a regular client with the same numeric id
    // in a different table. This claim is what makes that distinction
    // possible without an extra DB lookup on every socket connection.
    const token = jwt.sign({ id: admin.id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    setSession(res, token);
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
