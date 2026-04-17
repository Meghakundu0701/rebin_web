const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Collector = require('../models/Collector');

const router = express.Router();

// ══════════════════════════════════════
//  REGISTER
// ══════════════════════════════════════
router.post('/register', async (req, res) => {
  try {
    const { name, username, email, password, phone, role } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Check duplicates
    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ error: 'Email already registered.' });

    const existingUsername = await User.findOne({ username });
    if (existingUsername) return res.status(400).json({ error: 'Username already taken.' });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      name,
      username,
      email,
      password: hashedPassword,
      phone: phone || '',
      role: role || 'user',
      member_since: new Date()
    });

    await user.save();

    // If collector role, create collector profile
    if (role === 'collector') {
      const collectorId = await Collector.generateCollectorId(name);
      const collector = new Collector({
        userId: user._id,
        collectorId,
        address: { street: '', city: '', pincode: '' }
      });
      await collector.save();
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      role: user.role,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// ══════════════════════════════════════
//  LOGIN
// ══════════════════════════════════════
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'No account found with this email.' });

    // Check role match if specified
    if (role && user.role !== role) {
      return res.status(400).json({ error: `This account is registered as a ${user.role}, not a ${role}.` });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Incorrect password.' });

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      role: user.role,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

module.exports = router;
