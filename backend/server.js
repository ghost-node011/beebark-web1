const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

// Only emit verbose, per-request/per-socket logs outside production
const debug = process.env.NODE_ENV === 'production' ? () => {} : console.log;

// Parse allowed CORS origins from a comma-separated env var. "*" allows all (dev default).
const corsOrigins = process.env.CORS_ORIGINS || '*';
const allowedOrigins = corsOrigins === '*'
  ? '*'
  : corsOrigins.split(',').map((o) => o.trim()).filter(Boolean);

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true
};

const app = express();
// Behind one proxy (Nginx on EC2, Render's router): use the visitor's real IP for rate limits
app.set('trust proxy', 1);
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const { sanitizeRequest, securityHeaders } = require('./middleware/security');

// Pre-launch waitlist is called from the marketing site, so it has its own
// fixed CORS allowlist (independent of CORS_ORIGINS in .env).
const waitlistCorsOptions = {
  origin: [
    'https://www.thebeebark.com',
    'https://thebeebark.com',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
};
// Read-only waitlist access for outside systems (the Aurigin admin portal):
// its own CORS allowlist from WAITLIST_EXTERNAL_CORS_ORIGINS (comma-separated),
// separate from CORS_ORIGINS and the marketing site's list above. Unset means
// no browser origin is allowed — server-to-server calls don't need CORS.
const externalCorsOrigins = (process.env.WAITLIST_EXTERNAL_CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const externalCorsOptions = {
  origin: externalCorsOrigins.length ? externalCorsOrigins : false,
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key']
};
const isWaitlistPath = (req) => req.path === '/api/waitlist' || req.path.startsWith('/api/waitlist/');
const isExternalPath = (req) => req.path.startsWith('/api/external/');
const appCors = cors(corsOptions);

app.use(securityHeaders);
app.use('/api/waitlist', cors(waitlistCorsOptions));
app.use('/api/external', cors(externalCorsOptions));
app.use((req, res, next) => (isWaitlistPath(req) || isExternalPath(req) ? next() : appCors(req, res, next)));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(sanitizeRequest);

// Use the raw MONGO_URL as-is and pass the database via the `dbName` option.
// (Concatenating "/DB_NAME" breaks strings that contain a query like "/?appName=...".)
const rawMongoUrl = (process.env.MONGO_URL || 'mongodb://localhost:27017').trim();
// Strip any trailing slash / path before the query so SRV strings stay valid
const mongoUrl = rawMongoUrl.replace(/\/+(\?|$)/, '$1');
const dbName = (process.env.DB_NAME || 'social_network_db').trim();

if (!process.env.MONGO_URL) {
  console.error('⚠️  MONGO_URL is not set — falling back to localhost, which will fail in the cloud.');
}

mongoose
  .connect(mongoUrl, {
    dbName,
    serverSelectionTimeoutMS: 8000 // fail fast with a clear error instead of buffering for 10s
  })
  .then(() => console.log(`✅ MongoDB connected successfully (db: ${dbName})`))
  .catch((err) => {
    // Surface the real reason (bad host / auth / IP allowlist) in the logs
    console.error('❌ MongoDB connection error:', err.message);
  });

mongoose.connection.on('error', (err) => console.error('❌ MongoDB error:', err.message));
mongoose.connection.on('disconnected', () => console.error('⚠️  MongoDB disconnected'));

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to BeeBark! The server is up and running.' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const postRoutes = require('./routes/post');
const connectionRoutes = require('./routes/connection');
const notificationRoutes = require('./routes/notification');
const jobRoutes = require('./routes/job');
const messageRoutes = require('./routes/message');
const uploadRoutes = require('./routes/upload');
const meetingRoutes = require('./routes/meeting');
const storyRoutes = require('./routes/story');
const portfolioRoutes = require('./routes/portfolio');
const aiRoutes = require('./routes/ai');
const waitlistRoutes = require('./routes/waitlist');

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);
// Files stored locally when Cloudinary isn't configured (local development)
app.use('/uploads', express.static('/tmp/uploads', { fallthrough: false, maxAge: '7d' }));
app.use('/api/meetings', meetingRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/account', require('./routes/account'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/listings', require('./routes/listing'));
app.use('/api/people', require('./routes/people'));
app.use('/api/follow', require('./routes/follow'));
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/external/waitlist', require('./routes/externalWaitlist'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

// FIX: Declare the Maps BEFORE setting them in the app
const connectedUsers = new Map();
// Meeting rooms Map - shared across all socket connections
const meetingRooms = new Map(); // meetingId -> Set of {socketId, userId, userName}

app.set('io', io);
app.set('connectedUsers', connectedUsers);
app.set('meetingRooms', meetingRooms);

// Sockets act as the signed-in user: the token from the client's handshake is
// verified once, and its user id is used for presence and messages (never an
// id the client sends).
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    const payload = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    socket.data.authUserId = String(payload.userId);
    next();
  } catch (err) {
    next(new Error('unauthorized'));
  }
});

io.on('connection', (socket) => {
  debug('User connected:', socket.id);

  socket.on('user-connected', () => {
    const userId = socket.data.authUserId;
    // Remove any existing mapping for this user (in case of reconnection)
    for (const [uid, sid] of connectedUsers.entries()) {
      if (uid === userId && sid !== socket.id) {
        connectedUsers.delete(uid);
        debug('Removed old socket mapping for user:', userId);
      }
    }
    connectedUsers.set(userId, socket.id);
    debug('✅ User registered:', userId, 'Socket:', socket.id);
    debug('📊 Active users:', Array.from(connectedUsers.keys()));
    // Messages sent while they were away have now reached them
    require('./utils/directMessages').markDelivered({ userId, io, connectedUsers }).catch(() => {});
  });

  // The client passes an acknowledgement callback so it can swap its pending
  // bubble for the saved message as soon as it's stored
  socket.on('send-message', async (data, ack) => {
    const clientId = data && typeof data.clientId === 'string' ? data.clientId.slice(0, 64) : undefined;
    try {
      const { sendDirectMessage } = require('./utils/directMessages');
      const messageData = await sendDirectMessage({
        senderId: socket.data.authUserId,
        receiverId: String(data && data.receiver),
        text: data && data.text,
        attachments: data && data.attachments,
        io,
        connectedUsers
      });
      if (typeof ack === 'function') ack({ ok: true, message: messageData, clientId });
      else socket.emit('message-sent', { ...messageData, clientId });
    } catch (error) {
      if (typeof ack === 'function') ack({ ok: false, error: error.message, clientId });
      else socket.emit('message-error', { error: error.message, clientId });
    }
  });

  // The receiver has the conversation open: mark it read and tell the sender
  socket.on('mark-read', async (data) => {
    const otherId = String(data && data.other);
    if (!/^[a-f0-9]{24}$/.test(otherId)) return;
    try {
      await require('./utils/directMessages').markRead({ readerId: socket.data.authUserId, otherId, io, connectedUsers });
    } catch (err) {
      debug('mark-read failed', err.message);
    }
  });

  socket.on('call-user', (data) => {
    debug('Call initiated from', data.from, 'to', data.to);
    const receiverSocketId = connectedUsers.get(data.to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('call-signal', {
        from: socket.data.authUserId,
        signal: data.signal,
        callType: data.callType
      });
      debug('Call signal sent to', data.to);
    } else {
      debug('Receiver not online for call');
    }
  });

  socket.on('answer-call', (data) => {
    debug('Call answered by', data.to);
    const callerSocketId = connectedUsers.get(data.to);
    if (callerSocketId) {
      io.to(callerSocketId).emit('call-accepted', data.signal);
      debug('Call accepted signal sent');
    }
  });

  socket.on('end-call', (data) => {
    const receiverSocketId = connectedUsers.get(data.to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('call-ended');
    }
  });
  
  // Meeting room events
  socket.on('join-meeting', (data) => {
    const { meetingId, userId, userName } = data;
    debug('User joining meeting:', data);
    
    socket.join(meetingId);
    socket.meetingId = meetingId;
    socket.userId = userId;
    socket.userName = userName;
    
    if (!meetingRooms.has(meetingId)) {
      meetingRooms.set(meetingId, new Set());
    }
    
    const room = meetingRooms.get(meetingId);
    
    const existingParticipants = Array.from(room).map(p => ({
      socketId: p.socketId,
      userId: p.userId,
      userName: p.userName
    }));
    
    debug('Existing participants in meeting:', existingParticipants);
    
    room.add({
      socketId: socket.id,
      userId,
      userName
    });
    
    socket.emit('existing-participants', existingParticipants);
    
    socket.to(meetingId).emit('user-joined', {
      socketId: socket.id,
      userId,
      userName
    });
    
    debug(`User ${userName} joined meeting ${meetingId}. Total participants: ${room.size}`);
  });

  socket.on('screen-share-status', (data) => {
    socket.to(socket.meetingId).emit('peer-screen-share-status', {
      socketId: socket.id,
      isSharing: data.isSharing
    });
  });

  socket.on('send-signal', (data) => {
    const { to, signal } = data;
    debug('Sending signal from', socket.id, 'to', to);
    io.to(to).emit('receive-signal', {
      from: socket.id,
      userId: socket.userId,
      userName: socket.userName,
      signal
    });
  });

  socket.on('return-signal', (data) => {
    const { to, signal } = data;
    debug('Returning signal from', socket.id, 'to', to);
    io.to(to).emit('signal-returned', {
      from: socket.id,
      userId: socket.userId,
      userName: socket.userName,
      signal
    });
  });

  socket.on('leave-meeting', (data) => {
    const { meetingId, userId } = data;
    debug('User leaving meeting:', userId, meetingId);
    
    if (meetingRooms.has(meetingId)) {
      const room = meetingRooms.get(meetingId);
      for (const participant of room) {
        if (participant.socketId === socket.id) {
          room.delete(participant);
          break;
        }
      }
      if (room.size === 0) {
        meetingRooms.delete(meetingId);
      }
    }
    
    socket.leave(meetingId);
    socket.to(meetingId).emit('user-left', { socketId: socket.id, userId });
  });
  
  socket.on('disconnect', () => {
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        debug('User disconnected:', userId);
        break;
      }
    }
    
    if (socket.meetingId) {
      const meetingId = socket.meetingId;
      const userId = socket.userId;
      
      if (meetingRooms.has(meetingId)) {
        const room = meetingRooms.get(meetingId);
        for (const participant of room) {
          if (participant.socketId === socket.id) {
            room.delete(participant);
            break;
          }
        }
        if (room.size === 0) {
          meetingRooms.delete(meetingId);
        }
      }
      
      socket.to(meetingId).emit('user-left', { socketId: socket.id, userId });
    }
    
    debug('Socket disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 8001;
server.listen(PORT, '0.0.0.0', () => {
  debug(`Server running on port ${PORT}`);
});

module.exports = { app, io };
