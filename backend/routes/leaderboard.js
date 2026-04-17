const express = require('express');
const User = require('../models/User');
const router = express.Router();

// ══════════════════════════════════════
//  GET LEADERBOARD
// ══════════════════════════════════════
router.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.find({ role: 'user' })
      .select('name total_kg member_since')
      .sort({ total_kg: -1 })
      .limit(50);

    const leaderboard = users.map(u => ({
      name: u.name,
      kg: Math.round(u.total_kg * 10) / 10,
      joinDate: u.member_since ? u.member_since.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A',
      loggedIn: true
    }));

    res.json({ leaderboard });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

module.exports = router;
