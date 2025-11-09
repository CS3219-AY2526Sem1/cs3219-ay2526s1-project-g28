import "dotenv/config";
import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "peerprep-matching-app",
  brokers: process.env.KAFKA_BROKERS.split(","),
  ssl: true,
  sasl: {
    mechanism: "plain",
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
  },
});

export const producer = kafka.producer();
export const consumer = kafka.consumer({ groupId: "matching-group" });

// This Map is crucial. It holds the "resolve" function for each
// request we send, keyed by the correlationId.
const pendingRequests = new Map();

// Function to connect everything
async function connectKafka() {
  await producer.connect();
  await consumer.connect();
  await consumer.subscribe({ topic: "question-replies" });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const reply = JSON.parse(message.value.toString());
      const { correlationId } = reply;
      console.log(`[Matching] reply received: ${correlationId}`);
      // Check if we are waiting for this reply
      if (pendingRequests.has(correlationId)) {
        console.log(`[Matching] Received reply for ${correlationId}`);
        // Get the stored 'resolve' function and call it
        pendingRequests.get(correlationId)(reply);
        pendingRequests.delete(correlationId); // Clean up
      }
    },
  });
}

export default connectKafka;
