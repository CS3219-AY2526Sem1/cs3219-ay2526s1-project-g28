// notification-service/index.js
import 'dotenv/config';
import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import IORedis from 'ioredis';

const PORT = process.env.PORT || 3004;
const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  console.error("Missing REDIS_URL. Please check your .env file.");
  process.exit(1);
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
  },
});

const userSocketMap = new Map();

io.on('connection', (socket) => {
  console.log(`[Socket.IO] User connected: ${socket.id}`);

  socket.on('register', ({ userId }) => {
    userSocketMap.set(userId, socket.id);
    console.log(`[Socket.IO] User ${userId} registered with socket ${socket.id}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] User disconnected: ${socket.id}`);
    for (let [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);
        break;
      }
    }
  });
});

const subscriber = new IORedis(REDIS_URL);
subscriber.on('connect', () => console.log('[Redis] Subscriber connected successfully!'));
subscriber.on('error', (err) => console.error('[Redis] Subscriber connection error:', err));
subscriber.subscribe('match_events', (err, count) => {
  if (err) {
    console.error("[Redis] Failed to subscribe:", err);
    return;
  }
  console.log(`[Redis] Subscribed to ${count} channels.`);
});

subscriber.on('message', (channel, message) => {
  if (channel === 'match_events') {
    console.log(`[Redis] Received message from 'match_events':`, message);
    const eventData = JSON.parse(message);
    
    const eventType = eventData.type;

    if (!eventType) {
      console.log("Received message with no type, skipping.");
      return;
    }

    let targetUserIds = [];
    if (eventData.users) {
      targetUserIds = eventData.users;
    } else if (eventData.userId) {
      targetUserIds = [eventData.userId];
    }

    targetUserIds.forEach(userId => {
      const socketId = userSocketMap.get(userId);
      if (socketId) {
        io.to(socketId).emit(eventType, eventData); 
        console.log(`[Socket.IO] Emitted '${eventType}' to user ${userId}`);
      } else {
        console.log(`[Socket.IO] No socket found for user ${userId}.`);
      }
    });
  }
});

server.listen(PORT, () => {
  console.log(`Notification service listening on http://localhost:${PORT}`);
});