# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start development server with hot reload using ts-node-dev
- `npm run build` - Compile TypeScript to JavaScript in `dist/` directory  
- `npm start` - Run the production build from `dist/server.js`
- `npm run clean` - Remove compiled output in `dist/` directory

### Installation
- `npm install` - Install all dependencies (run this first)

### Testing the Application
- Start the server with `npm run dev`
- Open multiple browser tabs to `http://localhost:3000` to test real-time synchronization
- Enter the same room ID in multiple tabs to simulate multiple users
- The first user in a room automatically becomes the leader

## Architecture Overview

### Real-time Music Synchronization System
This application implements synchronized music playback across multiple clients using Socket.IO for real-time communication. The architecture consists of three main components:

**Server (`src/server.ts`)**
- Express.js server with Socket.IO integration
- Manages room-based sessions with leader delegation
- Tracks playback state (play/pause/seek/current time) with timestamp-based synchronization
- Handles user lifecycle (join/leave rooms, leader reassignment)
- Maintains in-memory room state using `Map<string, RoomState>`

**Client (`public/client.js`)**
- Vanilla JavaScript Socket.IO client
- HTML5 Audio API integration for playback control
- Leader/follower role management with conditional UI controls
- Real-time synchronization of playback state across all room participants
- Manual seek control restricted to room leaders

**Web Interface (`public/index.html`)**
- Single-page application with room management, audio controls, and real-time status
- Responsive design with glassmorphism styling
- Role-based UI that enables/disables controls based on leader status

### Key Synchronization Concepts
- **Room State**: Each room maintains `isPlaying`, `currentTime`, `trackUrl`, `lastUpdate` timestamp, and user list
- **Time Calculation**: Server calculates current playback position using stored time + elapsed time since last update
- **Leader Delegation**: First user in room becomes leader; leadership transfers automatically when leader leaves
- **Event Broadcasting**: Leader actions (play/pause/seek) broadcast to all room participants except sender

### Data Flow
1. User joins room → Server assigns leader role if first user
2. Leader loads track → Server broadcasts track URL and play command
3. Leader controls playback → Server updates room state and broadcasts to followers
4. Followers receive events → Client syncs local audio player to match leader's state

## Project Structure Notes

### TypeScript Configuration
- Compiles ES2020 TypeScript to CommonJS
- Source maps and declarations enabled for debugging
- Strict type checking enabled

### Static File Serving
- Server serves static files from `public/` directory
- Client assets (HTML/CSS/JS) served directly by Express

### Socket.IO Events
Key events for real-time communication:
- `join-room` - User joins a room
- `play`/`pause`/`seek` - Playback control events
- `room-state` - Full room state synchronization
- `leader-status` - Leadership role changes
- `user-count` - Room participant count updates

### Environment Requirements
- Node.js >= 16.0.0 (specified in package.json engines)
- No external database required (in-memory state storage)
- CORS enabled for cross-origin requests