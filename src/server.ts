import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import ytdl from 'ytdl-core';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));

// Store room state
interface RoomState {
  id: string;
  leader: string | null;
  isPlaying: boolean;
  currentTime: number;
  trackUrl: string | null;
  lastUpdate: number;
  users: Set<string>;
}

const rooms = new Map<string, RoomState>();

// Get or create room
function getRoom(roomId: string): RoomState {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      leader: null,
      isPlaying: false,
      currentTime: 0,
      trackUrl: null,
      lastUpdate: Date.now(),
      users: new Set()
    });
  }
  return rooms.get(roomId)!;
}

// Calculate current playback time considering elapsed time
function getCurrentTime(room: RoomState): number {
  if (!room.isPlaying) return room.currentTime;
  
  const elapsed = (Date.now() - room.lastUpdate) / 1000;
  return room.currentTime + elapsed;
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-room', (roomId: string) => {
    console.log(`User ${socket.id} joining room ${roomId}`);
    
    // Leave all previous rooms
    socket.rooms.forEach(room => {
      if (room !== socket.id) {
        socket.leave(room);
      }
    });
    
    socket.join(roomId);
    const room = getRoom(roomId);
    room.users.add(socket.id);
    
    // Set as leader if first user
    if (!room.leader) {
      room.leader = socket.id;
      socket.emit('leader-status', true);
    }
    
    // Send current room state to new user
    socket.emit('room-state', {
      isPlaying: room.isPlaying,
      currentTime: getCurrentTime(room),
      trackUrl: room.trackUrl,
      userCount: room.users.size,
      isLeader: room.leader === socket.id
    });
    
    // Notify all users about user count update
    io.to(roomId).emit('user-count', room.users.size);
  });
  
  socket.on('play', (data: { roomId: string, trackUrl?: string, currentTime?: number }) => {
    const room = getRoom(data.roomId);
    
    // Only leader can control playback
    if (room.leader !== socket.id) return;
    
    room.isPlaying = true;
    room.lastUpdate = Date.now();
    
    if (data.trackUrl) {
      room.trackUrl = data.trackUrl;
    }
    
    if (typeof data.currentTime === 'number') {
      room.currentTime = data.currentTime;
    }
    
    // Broadcast to all users in room except sender
    socket.to(data.roomId).emit('play', {
      trackUrl: room.trackUrl,
      currentTime: room.currentTime
    });
  });
  
  socket.on('pause', (data: { roomId: string, currentTime: number }) => {
    const room = getRoom(data.roomId);
    
    // Only leader can control playback
    if (room.leader !== socket.id) return;
    
    room.isPlaying = false;
    room.currentTime = data.currentTime;
    room.lastUpdate = Date.now();
    
    socket.to(data.roomId).emit('pause', {
      currentTime: data.currentTime
    });
  });
  
  socket.on('seek', (data: { roomId: string, currentTime: number }) => {
    const room = getRoom(data.roomId);
    
    // Only leader can control playback
    if (room.leader !== socket.id) return;
    
    room.currentTime = data.currentTime;
    room.lastUpdate = Date.now();
    
    socket.to(data.roomId).emit('seek', {
      currentTime: data.currentTime
    });
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Find and clean up user from rooms
    rooms.forEach((room, roomId) => {
      if (room.users.has(socket.id)) {
        room.users.delete(socket.id);
        
        // Handle leader leaving
        if (room.leader === socket.id) {
          const remainingUsers = Array.from(room.users);
          if (remainingUsers.length > 0) {
            // Assign new leader
            room.leader = remainingUsers[0];
            io.to(remainingUsers[0]).emit('leader-status', true);
          } else {
            room.leader = null;
          }
        }
        
        // Clean up empty rooms
        if (room.users.size === 0) {
          rooms.delete(roomId);
        } else {
          // Notify remaining users about user count
          io.to(roomId).emit('user-count', room.users.size);
        }
      }
    });
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', rooms: rooms.size });
});

server.listen(PORT, () => {
  console.log(`🎵 Realtime Music Jam server running on http://localhost:${PORT}`);
});
