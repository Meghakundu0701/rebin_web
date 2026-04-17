const mongoose = require('mongoose');

const pickupItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  kg: { type: Number, required: true }
}, { _id: false });

const pickupSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  collectorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Collector', default: null },
  items: [pickupItemSchema],
  total_kg: { type: Number, default: 0 },
  estimated_value: { type: Number, default: 0 },
  pickup_date: { type: String, required: true },
  pickup_time: { type: String, required: true },
  pickup_location: {
    address: { type: String, default: '' },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    type: { type: String, enum: ['home', 'office', 'other', 'live'], default: 'home' }
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in_transit', 'completed', 'cancelled'],
    default: 'pending'
  },
  otp: { type: String, default: null },
  otp_verified: { type: Boolean, default: false },
  waste_image_url: { type: String, default: '' },
  actual_weight: { type: Number, default: null },
  money_paid: { type: Number, default: null },
  points_earned: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Generate a random 5-digit OTP
pickupSchema.statics.generateOTP = function () {
  return String(Math.floor(10000 + Math.random() * 90000));
};

// Estimate value based on items
pickupSchema.methods.calculateEstimate = function () {
  const rates = {
    'Paper': 12, 'Cardboard': 14, 'Plastic': 11, 'Copper': 900,
    'Glass': 5, 'Iron': 35, 'Aluminium': 190, 'E-Waste': 300
  };
  this.estimated_value = this.items.reduce((sum, item) => {
    return sum + (item.kg * (rates[item.name] || 10));
  }, 0);
  this.total_kg = this.items.reduce((sum, item) => sum + item.kg, 0);
};

module.exports = mongoose.model('Pickup', pickupSchema);
