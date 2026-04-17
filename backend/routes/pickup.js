const express = require('express');
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Collector = require('../models/Collector');
const Pickup = require('../models/Pickup');
const Activity = require('../models/Activity');
const { geocodeAddress } = require('../utils/geocode');

const router = express.Router();

// Multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// ══════════════════════════════════════
//  CREATE PICKUP REQUEST
// ══════════════════════════════════════
router.post('/pickup', auth, async (req, res) => {
  try {
    const { items, pickup_date, pickup_time, pickup_location, locationAddress, lat, lng } = req.body;

    console.log('📦 New pickup request from userId:', req.userId);
    console.log('   Items:', items);
    console.log('   Date:', pickup_date, 'Time:', pickup_time);
    console.log('   Location:', locationAddress || pickup_location, 'Lat:', lat, 'Lng:', lng);

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Resolve location
    let resolvedLat = lat ? parseFloat(lat) : null;
    let resolvedLng = lng ? parseFloat(lng) : null;
    let resolvedAddress = locationAddress || pickup_location || '';

    // If no GPS coords but have address, geocode it
    if (!resolvedLat && resolvedAddress) {
      try {
        const geo = await geocodeAddress(resolvedAddress + ', India');
        if (geo) {
          resolvedLat = geo.lat;
          resolvedLng = geo.lng;
          console.log('   Geocoded to:', resolvedLat, resolvedLng);
        }
      } catch (geoErr) {
        // Geocoding failed — not a blocker, continue saving pickup without coords
        console.warn('   Geocoding skipped:', geoErr.message);
      }
    }

    const pickup = new Pickup({
      userId: req.userId,
      items,
      pickup_date: pickup_date || new Date().toISOString().split('T')[0],
      pickup_time: pickup_time || '10:00',
      pickup_location: {
        address: resolvedAddress,
        lat: resolvedLat,
        lng: resolvedLng,
        type: resolvedLat ? 'live' : 'home'
      },
      status: 'pending'
    });

    pickup.calculateEstimate();
    await pickup.save();
    console.log('✅ Pickup saved with id:', pickup._id, 'status:', pickup.status);

    // Log activity (non-blocking)
    Activity.create({
      userId: req.userId,
      type: 'pickup',
      description: `Pickup request: ${pickup.total_kg} kg (${items.map(i => i.name).join(', ')})`,
      points: 0
    }).catch(e => console.warn('Activity log failed:', e.message));

    res.json({
      success: true,
      pickupId: pickup._id,
      status: pickup.status,
      total_kg: pickup.total_kg,
      estimated_value: pickup.estimated_value,
      message: 'Pickup scheduled! A collector will accept your request shortly.'
    });
  } catch (err) {
    console.error('❌ Create pickup error:', err);
    res.status(500).json({ error: 'Failed to create pickup: ' + err.message });
  }
});


// ══════════════════════════════════════
//  GET PICKUP BY ID
// ══════════════════════════════════════
router.get('/pickup/:id', auth, async (req, res) => {
  try {
    const pickup = await Pickup.findById(req.params.id)
      .populate('userId', 'name phone email location addresses');

    if (!pickup) return res.status(404).json({ error: 'Pickup not found' });

    let responseData = {
      pickup: {
        id: pickup._id,
        items: pickup.items,
        total_kg: pickup.total_kg,
        estimated_value: pickup.estimated_value,
        pickup_date: pickup.pickup_date,
        pickup_time: pickup.pickup_time,
        pickup_location: pickup.pickup_location,
        status: pickup.status,
        otp: pickup.otp,
        otp_verified: pickup.otp_verified,
        waste_image_url: pickup.waste_image_url,
        actual_weight: pickup.actual_weight,
        money_paid: pickup.money_paid,
        points_earned: pickup.points_earned,
        created_at: pickup.created_at
      },
      user: pickup.userId ? {
        name: pickup.userId.name,
        phone: pickup.userId.phone,
        location: pickup.userId.location,
        address: pickup.userId.addresses && pickup.userId.addresses.length > 0
          ? pickup.userId.addresses.find(a => a.is_default) || pickup.userId.addresses[0]
          : null
      } : null,
      collector: null
    };

    if (pickup.collectorId) {
      const collector = await Collector.findById(pickup.collectorId).populate('userId', 'name phone');
      if (collector) {
        responseData.collector = {
          name: collector.userId.name,
          phone: collector.userId.phone,
          collectorId: collector.collectorId,
          age: 32,
          rating: collector.rating,
          total_pickups: collector.total_pickups,
          is_active: collector.is_active,
          location: collector.location,
          address: collector.address,
          photo: `https://randomuser.me/api/portraits/men/75.jpg`
        };
      }
    }

    res.json(responseData);
  } catch (err) {
    console.error('Get pickup error:', err);
    res.status(500).json({ error: 'Failed to get pickup' });
  }
});

// ══════════════════════════════════════
//  GET ALL PICKUPS FOR USER
// ══════════════════════════════════════
router.get('/pickups/user', auth, async (req, res) => {
  try {
    const pickups = await Pickup.find({ userId: req.userId })
      .sort({ created_at: -1 })
      .limit(50);

    const enriched = [];
    for (const p of pickups) {
      let collectorData = null;
      if (p.collectorId) {
        const c = await Collector.findById(p.collectorId).populate('userId', 'name phone');
        if (c) {
          collectorData = {
            name: c.userId.name,
            phone: c.userId.phone,
            collectorId: c.collectorId
          };
        }
      }
      enriched.push({
        id: p._id,
        items: p.items,
        total_kg: p.total_kg,
        status: p.status,
        pickup_date: p.pickup_date,
        pickup_time: p.pickup_time,
        otp: p.otp,
        collector: collectorData,
        created_at: p.created_at
      });
    }

    res.json({ pickups: enriched });
  } catch (err) {
    console.error('User pickups error:', err);
    res.status(500).json({ error: 'Failed to get pickups' });
  }
});

// ══════════════════════════════════════
//  GET ALL PICKUPS FOR COLLECTOR
// ══════════════════════════════════════
router.get('/pickups/collector', auth, async (req, res) => {
  try {
    const collector = await Collector.findOne({ userId: req.userId });
    if (!collector) return res.status(404).json({ error: 'Collector not found' });

    const statusFilter = req.query.status;
    const filter = { collectorId: collector._id };
    if (statusFilter) filter.status = statusFilter;

    const pickups = await Pickup.find(filter)
      .populate('userId', 'name phone email location addresses')
      .sort({ created_at: -1 });

    // Also get UNASSIGNED pending pickups (for new requests)
    let pendingUnassigned = [];
    if (!statusFilter || statusFilter === 'pending') {
      pendingUnassigned = await Pickup.find({ status: 'pending', collectorId: null })
        .populate('userId', 'name phone email location addresses')
        .sort({ created_at: -1 });
    }

    const formatPickup = (p) => ({
      id: p._id,
      items: p.items,
      total_kg: p.total_kg,
      estimated_value: p.estimated_value,
      status: p.status,
      pickup_date: p.pickup_date,
      pickup_time: p.pickup_time,
      pickup_location: p.pickup_location,
      otp: p.otp,
      otp_verified: p.otp_verified,
      actual_weight: p.actual_weight,
      money_paid: p.money_paid,
      created_at: p.created_at,
      user: p.userId ? {
        name: p.userId.name,
        phone: p.userId.phone,
        location: p.userId.location,
        address: p.userId.addresses && p.userId.addresses.length > 0
          ? p.userId.addresses[0]
          : null
      } : null
    });

    res.json({
      assigned: pickups.map(formatPickup),
      newRequests: pendingUnassigned.map(formatPickup)
    });
  } catch (err) {
    console.error('Collector pickups error:', err);
    res.status(500).json({ error: 'Failed to get pickups' });
  }
});

// ══════════════════════════════════════
//  VERIFY OTP
// ══════════════════════════════════════
router.post('/pickup/:id/verify-otp', auth, async (req, res) => {
  try {
    const { otp } = req.body;
    const pickup = await Pickup.findById(req.params.id);
    if (!pickup) return res.status(404).json({ error: 'Pickup not found' });

    if (pickup.otp === otp) {
      pickup.otp_verified = true;
      pickup.status = 'in_transit';
      pickup.updated_at = new Date();
      await pickup.save();
      res.json({ success: true, message: 'OTP verified! Collector identity confirmed.' });
    } else {
      res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// ══════════════════════════════════════
//  ACCEPT PICKUP (collector)
// ══════════════════════════════════════
router.post('/pickup/:id/accept', auth, async (req, res) => {
  try {
    const collector = await Collector.findOne({ userId: req.userId });
    if (!collector) return res.status(404).json({ error: 'Collector not found' });

    const pickup = await Pickup.findById(req.params.id);
    if (!pickup) return res.status(404).json({ error: 'Pickup not found' });

    pickup.collectorId = collector._id;
    pickup.status = 'assigned';
    pickup.otp = Pickup.generateOTP();
    pickup.updated_at = new Date();
    await pickup.save();
    
    // Broadcast live event to user's place-request page
    const io = req.app.get('io');
    if (io) {
        io.of('/tracking').to(`pickup-${pickup._id}`).emit('pickup:assigned');
    }

    res.json({
      success: true,
      otp: pickup.otp,
      message: 'Pickup accepted! OTP has been generated.'
    });
  } catch (err) {
    console.error('Accept pickup error:', err);
    res.status(500).json({ error: 'Failed to accept pickup' });
  }
});

// ══════════════════════════════════════
//  DECLINE PICKUP (collector)
// ══════════════════════════════════════
router.post('/pickup/:id/decline', auth, async (req, res) => {
  try {
    const pickup = await Pickup.findById(req.params.id);
    if (!pickup) return res.status(404).json({ error: 'Pickup not found' });

    // If this collector was assigned, unassign
    const collector = await Collector.findOne({ userId: req.userId });
    if (collector && pickup.collectorId && pickup.collectorId.toString() === collector._id.toString()) {
      pickup.collectorId = null;
      pickup.otp = null;
      pickup.status = 'pending';
      pickup.updated_at = new Date();
      await pickup.save();
    }

    res.json({ success: true, message: 'Pickup declined.' });
  } catch (err) {
    console.error('Decline pickup error:', err);
    res.status(500).json({ error: 'Failed to decline pickup' });
  }
});

// ══════════════════════════════════════
//  COMPLETE PICKUP
// ══════════════════════════════════════
router.post('/pickup/:id/complete', auth, upload.single('waste_image'), async (req, res) => {
  try {
    const { actual_weight, money_paid } = req.body;
    const pickup = await Pickup.findById(req.params.id);
    if (!pickup) return res.status(404).json({ error: 'Pickup not found' });

    pickup.status = 'completed';
    pickup.actual_weight = parseFloat(actual_weight) || pickup.total_kg;
    pickup.money_paid = parseFloat(money_paid) || 0;
    pickup.updated_at = new Date();

    if (req.file) {
      pickup.waste_image_url = '/uploads/' + req.file.filename;
    }

    // Calculate points: 10 points per kg
    const pts = Math.round(pickup.actual_weight * 10);
    pickup.points_earned = pts;
    await pickup.save();

    // Update user points and kg
    const user = await User.findById(pickup.userId);
    if (user) {
      user.total_points += pts;
      user.total_kg += pickup.actual_weight;
      user.computeLevel();
      await user.save();

      // Log activity
      await Activity.create({
        userId: user._id,
        type: 'earn',
        description: `Pickup completed: ${pickup.actual_weight} kg recycled`,
        points: pts
      });
    }

    // Update collector stats
    if (pickup.collectorId) {
      const collector = await Collector.findById(pickup.collectorId);
      if (collector) {
        collector.total_pickups += 1;
        collector.total_collected_kg += pickup.actual_weight;
        collector.total_earnings += pickup.money_paid;
        await collector.save();
      }
    }

    res.json({
      success: true,
      points_earned: pts,
      message: `Pickup completed! +${pts} points earned.`
    });
  } catch (err) {
    console.error('Complete pickup error:', err);
    res.status(500).json({ error: 'Failed to complete pickup' });
  }
});

module.exports = router;
