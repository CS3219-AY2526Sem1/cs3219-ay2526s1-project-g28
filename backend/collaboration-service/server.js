import http from "http";
import index from "./index.js";
import "dotenv/config";
import IORedis from "ioredis";
import { Server } from "socket.io";
import { connectKafka } from "./kafka-utilties.js";
import { initCollaborationSocket } from "./sockets/collaboration-socket.js";
import { connectToDB } from "./model/repository.js";

const port = process.env.PORT || 3004;
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
  cors: { origin: "*" },
});

// Attach WebSocket collaboration logic
initCollaborationSocket(io, redis);

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
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
export default redis;
