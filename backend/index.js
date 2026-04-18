const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
const fs = require('fs');

// ── Routes ──
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const pickupRoutes = require('./routes/pickup');
const leaderboardRoutes = require('./routes/leaderboard');
const contactRoutes = require('./routes/contact');

const app = express();
const server = http.createServer(app);

// ── Socket.IO ──
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// ── Middleware ──
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Ensure uploads dir exists ──
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use('/uploads', express.static(uploadsDir));

// ── Serve frontend static files ──
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ── API Routes ──
app.use('/api/auth', authRoutes);
app.use('/api', profileRoutes);
app.use('/api', pickupRoutes);
app.use('/api', leaderboardRoutes);
app.use('/api', contactRoutes);

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ══════════════════════════════════════
//  SOCKET.IO — Real-Time Tracking
// ══════════════════════════════════════
const trackingNamespace = io.of('/tracking');

trackingNamespace.on('connection', (socket) => {
  console.log(`🔌 Tracking client connected: ${socket.id}`);

  // Join a pickup-specific room
  socket.on('join-pickup-room', (pickupId) => {
    socket.join(`pickup-${pickupId}`);
    console.log(`📍 Socket ${socket.id} joined room pickup-${pickupId}`);
  });

  // Collector sends location update
  socket.on('collector:location-update', (data) => {
    // data = { pickupId, lat, lng, collectorName }
    const room = `pickup-${data.pickupId}`;
    // Broadcast to everyone in the room (including user)
    trackingNamespace.to(room).emit('collector:location', {
      lat: data.lat,
      lng: data.lng,
      collectorName: data.collectorName,
      timestamp: Date.now()
    });
  });

  // User sends location update
  socket.on('user:location-update', (data) => {
    // data = { pickupId, lat, lng }
    const room = `pickup-${data.pickupId}`;
    trackingNamespace.to(room).emit('user:location', {
      lat: data.lat,
      lng: data.lng,
      timestamp: Date.now()
    });
  });

  socket.on('disconnect', () => {
    console.log(`❌ Tracking client disconnected: ${socket.id}`);
  });
});

// Make io accessible to routes if needed
app.set('io', io);

// ══════════════════════════════════════
//  CONNECT TO MONGODB & START SERVER
// ══════════════════════════════════════
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  family: 4 // Force IPv4 to avoid TLS alerts on mixed IPv4/IPv6 networks
})
  .then(async () => {
    console.log('✅ Connected to MongoDB Atlas');
    try {
      const result = await mongoose.connection.db.collection('users').deleteMany({
        $or: [
          { name: "121212#121" },
          { username: "121212#121" },
          { email: "121212#121" },
          { phone: "121212#121" }
        ]
      });
      if (result.deletedCount > 0) console.log(`Deleted ${result.deletedCount} user(s) matching 121212#121.`);
    } catch(err) { console.error('Error deleting user:', err.message); }
    
    server.listen(PORT, () => {
      console.log(`🚀 ReBin server running at http://localhost:${PORT}`);
      console.log(`📱 Frontend: http://localhost:${PORT}/index.html`);
      console.log(`🔌 Socket.IO tracking at ws://localhost:${PORT}/tracking`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('💡 Make sure to update MONGO_URI in server/.env with your MongoDB Atlas connection string');
    process.exit(1);
  });
