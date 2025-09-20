// Socket.IO client connection
const socket = io();

// DOM elements
const connectionStatus = document.getElementById('connectionStatus');
const roomInput = document.getElementById('roomInput');
const joinBtn = document.getElementById('joinBtn');
const currentRoom = document.getElementById('currentRoom');
const userCount = document.getElementById('userCount');
const leaderBadge = document.getElementById('leaderBadge');
const trackInput = document.getElementById('trackInput');
const loadTrackBtn = document.getElementById('loadTrackBtn');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const seekBar = document.getElementById('seekBar');
const currentTrack = document.getElementById('currentTrack');
const currentTime = document.getElementById('currentTime');
const duration = document.getElementById('duration');
const audioPlayer = document.getElementById('audioPlayer');

// State
let currentRoomId = null;
let isLeader = false;
let isSeekingManually = false;

// Connection status
socket.on('connect', () => {
    connectionStatus.textContent = '✅ Connected to server';
    connectionStatus.className = 'connection-status connected';
});

socket.on('disconnect', () => {
    connectionStatus.textContent = '❌ Disconnected from server';
    connectionStatus.className = 'connection-status disconnected';
});

// Room management
joinBtn.addEventListener('click', () => {
    const roomId = roomInput.value.trim();
    if (roomId) {
        socket.emit('join-room', roomId);
        currentRoomId = roomId;
        currentRoom.textContent = roomId;
    }
});

// Allow Enter key to join room
roomInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinBtn.click();
    }
});

// Socket events
socket.on('room-state', (state) => {
    console.log('Room state:', state);
    
    // Update UI
    userCount.textContent = state.userCount;
    isLeader = state.isLeader;
    
    if (isLeader) {
        leaderBadge.style.display = 'block';
        enableLeaderControls();
    } else {
        leaderBadge.style.display = 'none';
        disableLeaderControls();
    }
    
    // Update audio if track exists
    if (state.trackUrl) {
        loadTrack(state.trackUrl);
        currentTrack.textContent = getFilenameFromUrl(state.trackUrl);
        
        // Sync playback state
        audioPlayer.currentTime = state.currentTime;
        if (state.isPlaying) {
            audioPlayer.play().catch(e => console.log('Play failed:', e));
        } else {
            audioPlayer.pause();
        }
    }
});

socket.on('leader-status', (isLeaderStatus) => {
    isLeader = isLeaderStatus;
    if (isLeader) {
        leaderBadge.style.display = 'block';
        enableLeaderControls();
    } else {
        leaderBadge.style.display = 'none';
        disableLeaderControls();
    }
});

socket.on('user-count', (count) => {
    userCount.textContent = count;
});

socket.on('play', (data) => {
    console.log('Received play command:', data);
    if (data.trackUrl) {
        loadTrack(data.trackUrl);
        currentTrack.textContent = getFilenameFromUrl(data.trackUrl);
    }
    
    audioPlayer.currentTime = data.currentTime || 0;
    audioPlayer.play().catch(e => console.log('Play failed:', e));
});

socket.on('pause', (data) => {
    console.log('Received pause command:', data);
    audioPlayer.currentTime = data.currentTime;
    audioPlayer.pause();
});

socket.on('seek', (data) => {
    console.log('Received seek command:', data);
    audioPlayer.currentTime = data.currentTime;
});

// Audio controls
loadTrackBtn.addEventListener('click', () => {
    const url = trackInput.value.trim();
    if (url && isLeader && currentRoomId) {
        loadTrack(url);
        currentTrack.textContent = getFilenameFromUrl(url);
        
        // Notify other users
        socket.emit('play', {
            roomId: currentRoomId,
            trackUrl: url,
            currentTime: 0
        });
    }
});

playBtn.addEventListener('click', () => {
    if (isLeader && currentRoomId) {
        const currentTime = audioPlayer.currentTime || 0;
        audioPlayer.play().catch(e => console.log('Play failed:', e));
        
        socket.emit('play', {
            roomId: currentRoomId,
            currentTime: currentTime
        });
    }
});

pauseBtn.addEventListener('click', () => {
    if (isLeader && currentRoomId) {
        audioPlayer.pause();
        
        socket.emit('pause', {
            roomId: currentRoomId,
            currentTime: audioPlayer.currentTime
        });
    }
});

// Seek bar control
seekBar.addEventListener('mousedown', () => {
    if (isLeader) {
        isSeekingManually = true;
    }
});

seekBar.addEventListener('mouseup', () => {
    if (isLeader && currentRoomId) {
        const newTime = (seekBar.value / 100) * audioPlayer.duration;
        audioPlayer.currentTime = newTime;
        
        socket.emit('seek', {
            roomId: currentRoomId,
            currentTime: newTime
        });
        
        isSeekingManually = false;
    }
});

// Audio player events
audioPlayer.addEventListener('loadedmetadata', () => {
    seekBar.max = 100;
    duration.textContent = formatTime(audioPlayer.duration);
    
    if (isLeader) {
        seekBar.disabled = false;
    }
});

audioPlayer.addEventListener('timeupdate', () => {
    if (!isSeekingManually) {
        const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        seekBar.value = isNaN(progress) ? 0 : progress;
    }
    
    currentTime.textContent = formatTime(audioPlayer.currentTime);
});

audioPlayer.addEventListener('ended', () => {
    if (isLeader && currentRoomId) {
        socket.emit('pause', {
            roomId: currentRoomId,
            currentTime: 0
        });
    }
});

// Utility functions
function loadTrack(url) {
    audioPlayer.src = url;
    audioPlayer.load();
}

function enableLeaderControls() {
    loadTrackBtn.disabled = false;
    playBtn.disabled = false;
    pauseBtn.disabled = false;
    if (audioPlayer.duration) {
        seekBar.disabled = false;
    }
}

function disableLeaderControls() {
    loadTrackBtn.disabled = true;
    playBtn.disabled = true;
    pauseBtn.disabled = true;
    seekBar.disabled = true;
}

function getFilenameFromUrl(url) {
    try {
        const pathname = new URL(url).pathname;
        return pathname.split('/').pop() || url;
    } catch {
        return url;
    }
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Allow Enter key to load track
trackInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        loadTrackBtn.click();
    }
});

console.log('🎵 Realtime Music Jam client loaded!');