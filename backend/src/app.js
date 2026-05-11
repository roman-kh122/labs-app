const express = require('express');
const cors = require('cors');
require('dotenv').config();

const initDB = require('./db/init');
const authRouter = require('./routes/auth');
const regionsRouter = require('./routes/regions');
const pollutionRouter = require('./routes/pollution');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Healthcheck для GCP Cloud Run
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/regions', regionsRouter);
app.use('/api/pollution', pollutionRouter);

// Initialize database and start server
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

module.exports = app;