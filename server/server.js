const pool = require('./db');
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running' });
});

app.use('/api/reviews',      require('./routes/reviews'));
app.use('/api/availability', require('./routes/availability'));
app.use('/api/gallery',      require('./routes/gallery'));
app.use('/api/queries',      require('./routes/queries'));
app.use('/api/bookings',     require('./routes/bookings'));
app.use('/api/admin',        require('./routes/admin'));
app.use('/api/vendors',      require('./routes/vendors'));
app.use('/api/services',     require('./routes/services'));
app.use('/api/payments',     require('./routes/payments'));
app.use('/api/auth',         require('./routes/auth'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
