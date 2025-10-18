import http from "http";
import index from "./index.js";
import "dotenv/config";
import IORedis from "ioredis";
import connectKafka from "./kafka-utilties.js";

const port = process.env.PORT || 3003;
const server = http.createServer(index);

const REDIS_URL = process.env.REDIS_URL;
const redis = new IORedis(REDIS_URL);

redis.on("connect", () => {
  console.log("Connected to Redis Cloud successfully!");
});
redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});

const startServer = async () => {
  try {
    console.log("Connecting to Kafka...");
    await connectKafka(); // This connects producer AND starts consumer
    console.log("Connected to Kafka successfully!");

    server.listen(port, () => {
      console.log(`Matching service listening on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
export default redis;
