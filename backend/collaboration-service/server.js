import http from "http";
import index from "./index.js";
import "dotenv/config";
import IORedis from "ioredis";
import { Server } from "socket.io";
import { connectKafka } from "./kafka-utilties.js";
import { initCollaborationSocket } from "./sockets/collaboration-socket.js";
import { connectToDB } from "./model/repository.js";
import { createYjsServer } from "./yjs-server.js";

const port = process.env.COLLABORATION_SERVICE_PORT || 3004;
const server = http.createServer(index);

const REDIS_URL = process.env.REDIS_URL;
const redis = new IORedis(REDIS_URL);

redis.on("connect", () => {
  console.log("Connected to Redis Cloud successfully!");
});
redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});

// --- Socket.IO Setup ---
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Attach WebSocket collaboration logic
initCollaborationSocket(io, redis);

createYjsServer(server);

const startServer = async () => {
  try {
    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    await connectToDB();
    console.log("MongoDB Connected!");

    // Connect to Kafka
    console.log("Connecting to Kafka...");
    await connectKafka(); // This connects producer AND starts consumer
    console.log("Connected to Kafka successfully!");

    server.listen(port, () => {
      console.log(`Collaboration service listening on port ${port}`);
      console.log(`Socket.IO available at http://localhost:${port}`);
      console.log(`Yjs WebSocket available at ws://localhost:${port}/yjs`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
export default redis;
