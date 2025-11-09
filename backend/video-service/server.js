import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import "dotenv/config";

const app = express();
const port = process.env.VIDEO_SERVICE_PORT || 3010;

const allowedOrigins = (process.env.VIDEO_SERVICE_ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

const roomParticipants = new Map(); // roomId -> Map<socketId, username>
const socketRoomMap = new Map();

function handleDisconnection(socket) {
  const roomId = socketRoomMap.get(socket.id);
  if (!roomId) return;

  const participants = roomParticipants.get(roomId);
  if (participants) {
    const username = participants.get(socket.id);
    participants.delete(socket.id);
    if (participants.size === 0) {
      roomParticipants.delete(roomId);
    }
    socket.to(roomId).emit("user-left", { socketId: socket.id, username });
  }

  socket.leave(roomId);
  socketRoomMap.delete(socket.id);
}

io.on("connection", (socket) => {
  socket.on("join-room", ({ sessionId, username }) => {
    if (!sessionId) {
      socket.emit("error", { message: "Missing session identifier" });
      return;
    }

    socket.join(sessionId);
    socketRoomMap.set(socket.id, sessionId);

    const participants = roomParticipants.get(sessionId) || new Map();
    participants.set(socket.id, username);
    roomParticipants.set(sessionId, participants);

    const peerIds = Array.from(participants.keys()).filter((id) => id !== socket.id);
    socket.emit("participants", { peers: peerIds });

    socket.to(sessionId).emit("user-joined", { socketId: socket.id, username });
  });

  socket.on("offer", ({ target, description }) => {
    if (!target || !description) return;
    socket.to(target).emit("offer", { from: socket.id, description });
  });

  socket.on("answer", ({ target, description }) => {
    if (!target || !description) return;
    socket.to(target).emit("answer", { from: socket.id, description });
  });

  socket.on("ice-candidate", ({ target, candidate }) => {
    if (!target || !candidate) return;
    socket.to(target).emit("ice-candidate", { from: socket.id, candidate });
  });

  socket.on("leave-room", () => {
    handleDisconnection(socket);
  });

  socket.on("disconnect", () => {
    handleDisconnection(socket);
  });
});

server.listen(port, () => {
  console.log(`Video service listening on port ${port}`);
});
