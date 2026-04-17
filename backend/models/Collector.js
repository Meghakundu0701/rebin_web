const mongoose = require('mongoose');

const collectorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  collectorId: { type: String, required: true, unique: true },  // e.g. "AJ482"
  aadhaar_last4: { type: String, default: '0000' },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    pincode: { type: String, default: '' },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  total_pickups: { type: Number, default: 0 },
  rating: { type: Number, default: 4.5 },
  total_collected_kg: { type: Number, default: 0 },
  total_earnings: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  is_verified: { type: Boolean, default: true },
  location: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    updatedAt: { type: Date, default: null }
  }
}, { timestamps: true });

// Generate a random collector ID like "AJ482"
collectorSchema.statics.generateCollectorId = function (name) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const num = Math.floor(100 + Math.random() * 900);
  return initials + num;
};

module.exports = mongoose.model('Collector', collectorSchema);
