# Realtime Music Jam 🎵

A music streaming app where people can listen to music simultaneously in real-time, similar to Spotify's Jam feature.

## Features
- Real-time synchronized playback across multiple clients
- Room-based listening sessions
- Play/pause/seek synchronization
- Leader controls for managing playback

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

The server will start on http://localhost:3000

### Usage
1. Open the app in your browser
2. Multiple users can join the same room
3. The first user becomes the leader and can control playback
4. All connected users will hear the same audio synchronized in real-time

## Tech Stack
- Node.js + Express
- Socket.IO for real-time communication
- TypeScript
- HTML5 Audio API

## Project Structure
```
realtime-music-jam/
├── src/
│   └── server.ts          # Main server with Socket.IO
├── public/
│   ├── index.html         # Client interface
│   └── client.js          # Client-side Socket.IO logic
├── dist/                  # Compiled TypeScript output
└── package.json
```