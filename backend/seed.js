const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Collector = require('./models/Collector');
const Activity = require('./models/Activity');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      family: 4
    });
    console.log('✅ Connected to MongoDB Atlas');

    // Clear existing data
    await User.deleteMany({});
    await Collector.deleteMany({});
    await Activity.deleteMany({});
    console.log('🗑️  Cleared existing data');

    const password = await bcrypt.hash('password123', 10);

    // ── Sample Users (matching frontend leaderboard) ──
    const usersData = [
      { name: 'Ananya', username: 'ananya25', email: 'ananya@rebin.in', phone: '+91 99001 11111', total_kg: 80.0, total_points: 800, level: 'Eco Champion' },
      { name: 'Rohit', username: 'rohit_r', email: 'rohit@rebin.in', phone: '+91 99001 22222', total_kg: 28.3, total_points: 283, level: 'Eco Starter' },
      { name: 'Priyanka', username: 'priyanka_p', email: 'priyanka@rebin.in', phone: '+91 99001 33333', total_kg: 25.0, total_points: 250, level: 'Eco Starter' },
      { name: 'Manish', username: 'manish_m', email: 'manish@rebin.in', phone: '+91 99001 44444', total_kg: 24.8, total_points: 248, level: 'Eco Starter' },
      { name: 'Riya', username: 'riya_eco', email: 'riya@rebin.in', phone: '+91 99001 55555', total_kg: 22.0, total_points: 220, level: 'Eco Starter' },
      { name: 'Tina', username: 'tina_green', email: 'tina@rebin.in', phone: '+91 99001 66666', total_kg: 19.8, total_points: 198, level: 'Eco Starter' },
      { name: 'Koustav', username: 'koustav', email: 'koustav@rebin.in', phone: '+91 98765 43210', total_kg: 18.0, total_points: 180, level: 'Eco Starter' },
      { name: 'Tanni', username: 'tanni_t', email: 'tanni@rebin.in', phone: '+91 99001 88888', total_kg: 15.0, total_points: 150, level: 'Eco Starter' }
    ];

    const users = [];
    for (const u of usersData) {
      const user = new User({
        ...u,
        password,
        role: 'user',
        member_since: new Date('2025-' + (Math.floor(Math.random() * 4) + 1).toString().padStart(2, '0') + '-01'),
        addresses: u.name === 'Koustav' ? [{
          street: 'Near Taj Mahal, Agra',
          city: 'Agra',
          pincode: '282001',
          is_default: true,
          lat: 27.1751,
          lng: 78.0421
        }] : []
      });
      await user.save();
      users.push(user);
    }
    console.log(`👤 Created ${users.length} sample users`);

    // ── Sample Collectors ──
    const collectorsData = [
      {
        name: 'Ajay Singh', username: 'ajay_collector', email: 'ajay@rebin.in',
        phone: '+91 123456789', collectorId: 'AJ482',
        address: { street: 'Near Taj Mahal', city: 'Agra', pincode: '282001', lat: 27.178, lng: 78.0465 },
        location: { lat: 27.178, lng: 78.0465 },
        total_pickups: 148, rating: 4.8, total_collected_kg: 1200, total_earnings: 30000
      },
      {
        name: 'Raju Kewat', username: 'raju_collector', email: 'raju_rebin.in',
        phone: '+91 94251 78632', collectorId: 'RK591',
        address: { street: 'Ward No. 12, Near Hanuman Mandir, Tilwara Ghat Road', city: 'Jabalpur', pincode: '482001', lat: 23.1815, lng: 79.9864 },
        location: { lat: 23.1815, lng: 79.9864 },
        total_pickups: 148, rating: 4.8, total_collected_kg: 1200, total_earnings: 24000
      }
    ];

    for (const cd of collectorsData) {
      const cUser = new User({
        name: cd.name,
        username: cd.username,
        email: cd.email,
        password,
        phone: cd.phone,
        role: 'collector',
        member_since: new Date('2024-06-01')
      });
      await cUser.save();

      const collector = new Collector({
        userId: cUser._id,
        collectorId: cd.collectorId,
        aadhaar_last4: '7821',
        address: cd.address,
        total_pickups: cd.total_pickups,
        rating: cd.rating,
        total_collected_kg: cd.total_collected_kg,
        total_earnings: cd.total_earnings,
        is_active: true,
        is_verified: true,
        location: { ...cd.location, updatedAt: new Date() }
      });
      await collector.save();
    }
    console.log(`👷 Created ${collectorsData.length} sample collectors`);

    // ── Sample Activity for Koustav ──
    const koustav = users.find(u => u.name === 'Koustav');
    if (koustav) {
      const activities = [
        { type: 'earn', description: 'Pickup: 5 kg Paper recycled', points: 50, created_at: new Date(Date.now() - 86400000) },
        { type: 'earn', description: 'Pickup: 3 kg Plastic recycled', points: 30, created_at: new Date(Date.now() - 86400000 * 3) },
        { type: 'earn', description: 'Pickup: 10 kg Mixed waste', points: 100, created_at: new Date(Date.now() - 86400000 * 7) }
      ];
      for (const a of activities) {
        await Activity.create({ userId: koustav._id, ...a });
      }
      console.log('📝 Created sample activity for Koustav');
    }

    console.log('\n🎉 Database seeded successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Login credentials for all users:');
    console.log('  Email: <name>@rebin.in');
    console.log('  Password: password123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
}

seed();
