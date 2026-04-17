const express = require('express');
const ContactMessage = require('../models/ContactMessage');
const router = express.Router();

// ══════════════════════════════════════
//  SUBMIT CONTACT FORM
// ══════════════════════════════════════
router.post('/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const msg = new ContactMessage({ name, email, subject, message });
    await msg.save();

    res.json({ success: true, message: 'Message saved! We will reply within 24 hours.' });
  } catch (err) {
    console.error('Contact error:', err);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

module.exports = router;
