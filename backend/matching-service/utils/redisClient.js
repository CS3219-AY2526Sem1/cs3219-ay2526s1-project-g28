import IORedis from "ioredis";
import "dotenv/config";

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  console.error("Missing REDIS_URL. Please check your .env file.");
  process.exit(1);
}

const redis = new IORedis(REDIS_URL);

redis.on("connect", () => {
  console.log("Connected to Redis Cloud successfully!");
});
redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});

export default redis;