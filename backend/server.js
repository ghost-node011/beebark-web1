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
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const { sanitizeRequest, securityHeaders } = require('./middleware/security');

app.use(securityHeaders);
app.use(cors(corsOptions));
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
const jobRoutes = require('./routes/job');
const messageRoutes = require('./routes/message');
const uploadRoutes = require('./routes/upload');
const meetingRoutes = require('./routes/meeting');
const storyRoutes = require('./routes/story');
const portfolioRoutes = require('./routes/portfolio');

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/portfolio', portfolioRoutes);

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

io.on('connection', (socket) => {
  debug('User connected:', socket.id);
  
  socket.on('user-connected', (userId) => {
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
  });

  socket.on('send-message', async (data) => {
    debug('📨 Received message:', data);
    try {
      const Message = require('./models/Message');
      const User = require('./models/User');
      
      // Validate sender is connected with receiver
      const sender = await User.findById(data.sender);
      if (!sender) {
        console.error('❌ Sender not found:', data.sender);
        socket.emit('message-error', { error: 'Sender not found' });
        return;
      }
      
      if (!sender.connections.includes(data.receiver)) {
        console.error('❌ Not connected with this user');
        socket.emit('message-error', { error: 'Not connected with this user' });
        return;
      }
      
      // Save message to database
      const message = new Message({
        sender: data.sender,
        receiver: data.receiver,
        text: data.text
      });
      await message.save();
      
      debug('✅ Message saved to DB:', message._id);
      
      const messageData = {
        _id: message._id.toString(),
        sender: data.sender,
        receiver: data.receiver,
        text: data.text,
        createdAt: message.createdAt
      };
      
      // Send to receiver if online
      const receiverSocketId = connectedUsers.get(data.receiver);
      debug('🔍 Looking for receiver:', data.receiver);
      debug('🔍 Receiver Socket ID:', receiverSocketId);
      debug('🔍 All connected users:', Array.from(connectedUsers.entries()));
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('receive-message', messageData);
        debug('✅ Message sent to receiver socket:', receiverSocketId);
      } else {
        debug('⚠️ Receiver not online');
      }
      
      // Confirm to sender
      socket.emit('message-sent', messageData);
      debug('✅ Message confirmed to sender');
      
    } catch (error) {
      console.error('❌ Message error:', error);
      socket.emit('message-error', { error: error.message });
    }
  });

  socket.on('call-user', (data) => {
    debug('Call initiated from', data.from, 'to', data.to);
    const receiverSocketId = connectedUsers.get(data.to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('call-signal', {
        from: data.from,
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
