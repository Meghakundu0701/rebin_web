const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Collector = require('../models/Collector');
const Activity = require('../models/Activity');
const Pickup = require('../models/Pickup');
const { geocodeAddress } = require('../utils/geocode');

const router = express.Router();

// ══════════════════════════════════════
//  GET PROFILE (full data for profile page)
// ══════════════════════════════════════
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Get stats
    const pickups = await Pickup.find({ userId: req.userId, status: 'completed' });
    const totalWaste = pickups.reduce((s, p) => s + p.total_kg, 0);
    const totalEarned = pickups.reduce((s, p) => s + (p.money_paid || 0), 0);

    // Get rank
    const allUsers = await User.find({ role: 'user' }).sort({ total_kg: -1 });
    const rank = allUsers.findIndex(u => u._id.toString() === req.userId) + 1;

    // Get activity dynamically so Pickup statuses change from "Pending" to "Assigned" automatically
    const allPickupsForActivity = await Pickup.find({ userId: req.userId }).sort({ created_at: -1 }).limit(20);
    const redeems = await Activity.find({ userId: req.userId, type: 'redeem' }).sort({ created_at: -1 }).limit(20);
    
    let combinedActivity = [];
    allPickupsForActivity.forEach(p => {
      if (p.status === 'completed') {
        combinedActivity.push({
          type: 'earn',
          description: `Pickup completed: ${p.actual_weight || p.total_kg} kg recycled`,
          points: p.points_earned || Math.round((p.actual_weight || p.total_kg) * 10),
          created_at: p.updated_at || p.created_at
        });
      } else {
        const statuses = {
          'pending': 'Pending',
          'assigned': 'Assigned',
          'in_transit': 'In Transit'
        };
        combinedActivity.push({
          type: 'pickup',
          description: `Pickup request: ${p.total_kg} kg (${p.items.map(i => i.name).join(', ')})`,
          points: 0,
          created_at: p.created_at,
          customStatus: statuses[p.status] || 'Pending'
        });
      }
    });
    
    redeems.forEach(r => combinedActivity.push(r.toObject()));
    combinedActivity.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const activity = combinedActivity.slice(0, 20);

    // Badges
    const badges = [];
    const badgeDefs = [
      { id: 'first_pickup', name: 'First Pickup', icon: '📦', description: 'Complete your first pickup', check: pickups.length >= 1 },
      { id: 'recycler_5', name: '5 Pickups', icon: '♻️', description: 'Complete 5 pickups', check: pickups.length >= 5 },
      { id: 'recycler_10', name: '10 Pickups', icon: '🏆', description: 'Complete 10 pickups', check: pickups.length >= 10 },
      { id: 'kg_10', name: '10 KG Club', icon: '⚖️', description: 'Recycle 10+ kg total', check: totalWaste >= 10 },
      { id: 'kg_50', name: '50 KG Club', icon: '💪', description: 'Recycle 50+ kg total', check: totalWaste >= 50 },
      { id: 'points_500', name: 'Points Pro', icon: '💰', description: 'Earn 500+ points', check: user.total_points >= 500 },
      { id: 'eco_warrior', name: 'Eco Warrior', icon: '🌿', description: 'Reach Eco Warrior level', check: user.total_points >= 500 },
      { id: 'eco_champion', name: 'Eco Champion', icon: '🌍', description: 'Reach Eco Champion level', check: user.total_points >= 2000 }
    ];
    badgeDefs.forEach(b => {
      badges.push({ ...b, earned: b.check });
    });

    // Next level info
    const pts = user.total_points;
    let nextLevel = { name: 'Eco Warrior', threshold: 500 };
    if (pts >= 10000) nextLevel = { name: 'Eco Legend', threshold: 10000 };
    else if (pts >= 5000) nextLevel = { name: 'Eco Legend', threshold: 10000 };
    else if (pts >= 2000) nextLevel = { name: 'Eco Master', threshold: 5000 };
    else if (pts >= 500) nextLevel = { name: 'Eco Champion', threshold: 2000 };

    // Collector info if role is collector
    let collectorInfo = null;
    if (user.role === 'collector') {
      collectorInfo = await Collector.findOne({ userId: req.userId });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        total_points: user.total_points,
        total_kg: user.total_kg,
        level: user.level,
        member_since: user.member_since,
        profile_initial: (user.name && user.name.length > 0) ? user.name[0].toUpperCase() : '?',
        redeemed_rewards: user.redeemed_rewards || []
      },
      addresses: user.addresses,
      stats: {
        pickupCount: pickups.length,
        totalWaste: Math.round(totalWaste * 10) / 10,
        totalEarned: Math.round(totalEarned),
        rank: rank || 'N/A'
      },
      activity,
      badges,
      nextLevel,
      collectorInfo
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// ══════════════════════════════════════
//  ADD ADDRESS
// ══════════════════════════════════════
router.post('/address', auth, async (req, res) => {
  try {
    const { street, city, pincode, is_default } = req.body;
    if (!street || !city || !pincode) {
      return res.status(400).json({ error: 'Street, city, and pincode are required' });
    }

    // Geocode the address
    const fullAddr = `${street}, ${city}, ${pincode}, India`;
    const geo = await geocodeAddress(fullAddr);

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // If is_default, unset existing defaults
    if (is_default) {
      user.addresses.forEach(a => { a.is_default = false; });
    }

    user.addresses.push({
      street,
      city,
      pincode,
      is_default: is_default || user.addresses.length === 0,
      lat: geo ? geo.lat : null,
      lng: geo ? geo.lng : null
    });

    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (err) {
    console.error('Address error:', err);
    res.status(500).json({ error: 'Failed to save address' });
  }
});

// ══════════════════════════════════════
//  SET COLLECTOR ADDRESS (Specific for Collector Profile)
// ══════════════════════════════════════
router.post('/collector-address', auth, async (req, res) => {
  try {
    const { street, city, pincode } = req.body;
    if (!street || !city || !pincode) {
      return res.status(400).json({ error: 'Street, city, and pincode are required' });
    }

    // Geocode the address to get lat/lng for the map
    const fullAddr = `${street}, ${city}, ${pincode}, India`;
    const geo = await geocodeAddress(fullAddr);

    const collector = await Collector.findOne({ userId: req.userId });
    if (!collector) return res.status(404).json({ error: 'Collector info not found' });

    collector.address = {
      street,
      city,
      pincode,
      lat: geo ? geo.lat : null,
      lng: geo ? geo.lng : null
    };

    await collector.save();
    res.json({ success: true, address: collector.address });
  } catch (err) {
    console.error('Collector address error:', err);
    res.status(500).json({ error: 'Failed to save collector address' });
  }
});

// ══════════════════════════════════════
//  UPDATE LIVE LOCATION
// ══════════════════════════════════════
router.post('/location', auth, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (lat == null || lng == null) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    await User.findByIdAndUpdate(req.userId, {
      'location.lat': lat,
      'location.lng': lng,
      'location.updatedAt': new Date()
    });

    // If collector, also update collector location
    const user = await User.findById(req.userId);
    if (user.role === 'collector') {
      await Collector.findOneAndUpdate(
        { userId: req.userId },
        { 'location.lat': lat, 'location.lng': lng, 'location.updatedAt': new Date() }
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Location error:', err);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// ══════════════════════════════════════
//  REDEEM REWARD
// ══════════════════════════════════════
router.post('/profile/redeem', auth, async (req, res) => {
  try {
    const { rewardId, pointsCost } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.total_points < pointsCost) {
      return res.status(400).json({ error: 'Not enough points' });
    }

    if (user.redeemed_rewards && user.redeemed_rewards.includes(rewardId)) {
      return res.status(400).json({ error: 'Already redeemed' });
    }

    user.total_points -= pointsCost;
    if (!user.redeemed_rewards) user.redeemed_rewards = [];
    user.redeemed_rewards.push(rewardId);
    user.computeLevel();
    await user.save();

    // Log activity
    await Activity.create({
      userId: req.userId,
      type: 'redeem',
      description: `Redeemed reward: ${rewardId}`,
      points: -pointsCost
    });

    res.json({ success: true, total_points: user.total_points, redeemed_rewards: user.redeemed_rewards });
  } catch (err) {
    console.error('Redeem error:', err);
    res.status(500).json({ error: 'Failed to redeem' });
  }
});

module.exports = router;
