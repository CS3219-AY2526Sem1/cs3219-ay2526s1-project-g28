import { Kafka } from "kafkajs";
import "dotenv/config";
import { handleMatchingRequest } from "./controller/question-controller.js";

const kafka = new Kafka({
  clientId: "peerprep-question-app",
  brokers: [process.env.KAFKA_BROKERS],
  ssl: true,
  sasl: {
    mechanism: "plain",
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
  },
});

// Export the producer so the controller can use it to send replies
export const producer = kafka.producer();
export const consumer = kafka.consumer({ groupId: "question-group" });

// This function will be called by your main server.js
export async function connectKafka() {
  await producer.connect();
  await consumer.connect();

  // Subscribe to the topic for matching requests
  await consumer.subscribe({ topic: "match_found" });

  console.log("[Question] Kafka consumer is running...");

  await consumer.run({
    eachMessage: async ({ message }) => {
      // For every message, delegate the logic to the controller
      try {
        const event = JSON.parse(message.value.toString());
        const { correlationId, meta } = event;

        console.log(`[Question Service] Received MatchFound: ${correlationId}`);

        await handleMatchingRequest(event);
      } catch (error) {
        console.error("Failed to process Kafka message:", error);
        // In a real app, you might send this to a dead-letter queue
      }
    },
  });
}
