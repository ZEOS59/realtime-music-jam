import express from 'express';
import http from 'http';
import socketIO from 'socket.io';
import path from 'path';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const server = http.createServer(app);
const io = new socketIO.Server(server, {
  cors: {
    origin: "*", // Adjust this to your specific domain in production
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

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('videoChange', (data) => {
    console.log('Video changed to:', data.videoId);
    // Broadcast to all other clients
    socket.broadcast.emit('videoChange', data);
  });

  socket.on('controlEvent', (data) => {
    console.log('Control event:', data.action);
    // Broadcast to all other clients
    socket.broadcast.emit('controlEvent', data);
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
});
