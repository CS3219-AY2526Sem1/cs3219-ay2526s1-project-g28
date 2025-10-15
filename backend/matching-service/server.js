import http from "http";
import index from "./index.js";
import "dotenv/config";
import IORedis from 'ioredis';
import { Kafka } from 'kafkajs';

const port = process.env.PORT || 3003;
const server = http.createServer(index);

const REDIS_URL = process.env.REDIS_URL;
const redis = new IORedis(REDIS_URL);
const kafka = new Kafka({
  clientId: 'peerprep-matching-app',
  brokers: [process.env.KAFKA_BROKERS],
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
  },
});

export const producer = kafka.producer();
export const consumer = kafka.consumer({ groupId: 'matching-workers' });
export default redis;

const startServer = async () => {
  try {
    console.log("Connecting to Kafka...");
    await producer.connect();
    await consumer.connect();
    console.log("Connected to Kafka successfully!");

    redis.on('connect', () => {
      console.log('Connected to Redis Cloud successfully!');
    });
    redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
    
    server.listen(port, () => {
      console.log(`Matching service server listening on http://localhost:${port}`);
    });

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();