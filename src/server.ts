import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware to handle CORS issues
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || "https://your-railway-app.railway.app" 
    : "http://localhost:3000",
  credentials: true
}));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Body parsing middleware
app.use(express.json());

// YouTube API proxy endpoint to bypass CORS and IP restrictions
app.use('/api/youtube-proxy', createProxyMiddleware({
  target: 'https://www.youtube.com',
  changeOrigin: true,
  pathRewrite: {
    '^/api/youtube-proxy': '',
  },
  onProxyReq: (proxyReq, req, res) => {
    // Add headers to avoid YouTube blocking
    proxyReq.setHeader('Referer', 'https://www.youtube.com');
    proxyReq.setHeader('Origin', 'https://www.youtube.com');
    proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  },
  logLevel: 'debug'
}));

// Alternative YouTube API route for getting video info
app.get('/api/video-info/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    // Use a proxy service or alternative API to get video info
    const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching video info:', error);
    res.status(500).json({ error: 'Failed to fetch video information' });
  }
});

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Send connection success to client
  socket.emit('connected', { message: 'Connected to server successfully' });

  socket.on('videoChange', (data) => {
    console.log('Video changed to:', data.videoId);
    // Broadcast to all other clients
    socket.broadcast.emit('videoChange', data);
    // Send confirmation to sender
    socket.emit('playerEvent', { event: 'Video changed successfully' });
  });

  socket.on('controlEvent', (data) => {
    console.log('Control event:', data.action);
    // Broadcast to all other clients
    socket.broadcast.emit('controlEvent', data);
    // Send confirmation to sender
    socket.emit('playerEvent', { event: `Action: ${data.action}` });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

  
