const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['earn', 'redeem', 'pickup'], default: 'earn' },
  description: { type: String, required: true },
  points: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Activity', activitySchema);
