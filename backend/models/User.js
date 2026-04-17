const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  pincode: { type: String, required: true },
  is_default: { type: Boolean, default: false },
  lat: { type: Number, default: null },
  lng: { type: Number, default: null }
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },
  role: { type: String, enum: ['user', 'collector'], default: 'user' },
  total_points: { type: Number, default: 0 },
  total_kg: { type: Number, default: 0 },
  addresses: [addressSchema],
  location: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    updatedAt: { type: Date, default: null }
  },
  redeemed_rewards: [{ type: String }],
  member_since: { type: Date, default: Date.now },
  level: { type: String, default: 'Eco Starter' }
}, { timestamps: true });

// Virtual: profile initial
userSchema.virtual('profile_initial').get(function () {
  return this.name ? this.name[0].toUpperCase() : '?';
});

// Compute level based on points
userSchema.methods.computeLevel = function () {
  const pts = this.total_points;
  if (pts >= 10000) this.level = 'Eco Legend';
  else if (pts >= 5000) this.level = 'Eco Master';
  else if (pts >= 2000) this.level = 'Eco Champion';
  else if (pts >= 500) this.level = 'Eco Warrior';
  else this.level = 'Eco Starter';
};

module.exports = mongoose.model('User', userSchema);
