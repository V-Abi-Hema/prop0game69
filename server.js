// server.js
// Run with: node server.js
// Ensure MongoDB server (mongod) is running locally on 127.0.0.1:27017

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://Shek720:cvM09vsaxEGWHEUP@propgamecluster.vr1391c.mongodb.net/MONGO_URI?retryWrites=true&w=majority&appName=PropGameCluster';
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB:', MONGO_URI);
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error at startup:', err.message);
  });

mongoose.connection.on('error', (err) => {
  console.error('MongoDB runtime connection error:', err.message);
});
mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected. Make sure mongod is running.');
});

// Schema and Model
const PlayerSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  password: {
    type: String,
    required: true,
    minlength: 4
  },
  gmail: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@gmail\.com$/
  },
  wins: { type: Number, default: 0, min: 0 },
  losses: { type: Number, default: 0, min: 0 },
  activeSessions: [{
    deviceId: { type: String, required: true },
    loginTime: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

const Player = mongoose.model('Player', PlayerSchema);

// Helpers
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// Endpoints

// Save player (register)
app.post('/savePlayer', asyncHandler(async (req, res) => {
  const { username, password, gmail, wins, losses } = req.body;

  if (!username || !password || !gmail) {
    return res.status(400).json({ error: 'Username, password, and gmail are required.' });
  }
  if (username.trim().length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
  }
  if (!/^[^\s@]+@gmail\.com$/.test(gmail.toLowerCase().trim())) {
    return res.status(400).json({ error: 'Email must end with @gmail.com' });
  }

  try {
    const player = new Player({
      username: username.trim(),
      password,
      gmail: gmail.toLowerCase().trim(),
      wins: Number.isFinite(wins) ? wins : 0,
      losses: Number.isFinite(losses) ? losses : 0,
      activeSessions: []
    });
    await player.save();
    return res.json({ message: 'Player registered successfully!' });
  } catch (error) {
    if (error && error.code === 11000) {
      const dupField = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(400).json({ error: `${dupField} already exists.` });
    }
    console.error('Error saving player:', error);
    return res.status(500).json({ error: 'Failed to save player.' });
  }
}));

// Login with 3-device limit
app.post('/login', asyncHandler(async (req, res) => {
  const { username, password, deviceId } = req.body;

  if (!username || !password || !deviceId) {
    return res.status(400).json({ error: 'Username, password, and deviceId are required.' });
  }

  const player = await Player.findOne({ username: username.trim() });
  if (!player || player.password !== password) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  player.activeSessions = (player.activeSessions || []).filter(s => s.lastActivity > cutoff);

  const existing = player.activeSessions.find(s => s.deviceId === deviceId);
  if (existing) {
    existing.lastActivity = new Date();
  } else {
    if (player.activeSessions.length >= 3) {
      return res.status(403).json({
        error: 'Maximum 3 devices allowed. Reset password to log in on this device.',
        requirePasswordReset: true
      });
    }
    player.activeSessions.push({ deviceId, loginTime: new Date(), lastActivity: new Date() });
  }

  await player.save();
  return res.json({
    message: 'Login successful!',
    player: { username: player.username, wins: player.wins, losses: player.losses }
  });
}));

// Reset password: clears all sessions and logs in this device
app.post('/resetPassword', asyncHandler(async (req, res) => {
  const { gmail, newPassword, deviceId } = req.body;

  if (!gmail || !newPassword || !deviceId) {
    return res.status(400).json({ error: 'gmail, newPassword, and deviceId are required.' });
  }
  if (newPassword.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
  }

  const player = await Player.findOne({ gmail: gmail.toLowerCase().trim() });
  if (!player) {
    return res.status(404).json({ error: 'No user with that gmail.' });
  }

  player.password = newPassword;
  player.activeSessions = [{ deviceId, loginTime: new Date(), lastActivity: new Date() }];
  await player.save();

  return res.json({
    message: 'Password reset successful! You are now logged in.',
    player: { username: player.username, wins: player.wins, losses: player.losses }
  });
}));

// Get players for ranking
app.get('/players', asyncHandler(async (req, res) => {
  const players = await Player.find({}, { password: 0 }).sort({ wins: -1, createdAt: -1 });
  return res.json(players);
}));

// Password recovery (demo only; returns username/password)
app.post('/recover', asyncHandler(async (req, res) => {
  const { gmail } = req.body;
  if (!gmail) {
    return res.status(400).json({ error: 'Gmail is required.' });
  }
  const player = await Player.findOne({ gmail: gmail.toLowerCase().trim() });
  if (!player) {
    return res.status(404).json({ error: 'No user found with this gmail.' });
  }
  return res.json({
    message: 'Recovery email sent (simulated).',
    loginDetails: { username: player.username, password: player.password }
  });
}));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal server error. Please try again later.' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});



