const mongoose = require('mongoose');
require('dotenv').config();
const Pickup = require('./models/Pickup');
const Collector = require('./models/Collector');
const User = require('./models/User');

async function debug() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const collectors = await Collector.find().populate('userId', 'name');
    console.log('\n--- Collectors in DB ---');
    collectors.forEach(c => {
        console.log(`ID: ${c._id}, Name: ${c.userId ? c.userId.name : 'N/A'}, CollectorId: ${c.collectorId}`);
    });

    const pickups = await Pickup.find().sort({ created_at: -1 }).limit(5);
    console.log('\n--- Recent Pickups ---');
    pickups.forEach(p => {
        console.log(`ID: ${p._id}, Status: ${p.status}, CollectorID (Ref): ${p.collectorId}`);
    });

    mongoose.disconnect();
}
debug();
