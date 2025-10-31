import { Kafka } from "kafkajs";
import "dotenv/config";
import Session from "./model/session-model.js";

const kafka = new Kafka({
  clientId: "peerprep-collaboration-app",
  brokers: process.env.KAFKA_BROKERS.split(","),
  ssl: true,
  sasl: {
    mechanism: "plain",
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
  },
});

export const producer = kafka.producer();
export const consumer = kafka.consumer({ groupId: "collaboration-group" });

const sessionStore = new Map();

export async function connectKafka() {
  await consumer.connect();

  // subscribe to each topic separately
  await consumer.subscribe({ topic: "match_found", fromBeginning: false });
  await consumer.subscribe({ topic: "question-replies", fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      let event;
      try {
        event = JSON.parse(message.value.toString());
      } catch (err) {
        console.error("[Collab] Failed to parse message value:", err);
        return;
      }

      if (topic === "match_found") {
        if (!event || !event.correlationId || !event.userA || !event.userB) {
          console.warn(
            "[Collab] Invalid match_found message, skipping:",
            event
          );
          return;
        }
        const { correlationId, userA, userB, matchKey, meta } = event;
        console.log(`[Collab Service] Received MatchFound: ${correlationId}`);

        const existing = await Session.findOne({ correlationId });
        if (existing) {
          console.log(`[Collab] Session already exists for ${correlationId}`);
          return;
        }

        const newSession = await Session.create({
          correlationId,
          users: [userA, userB],
          status: "PENDING_QUESTION",
          meta: meta || null,
          matchKey: matchKey || null,
          createdAt: new Date(),
        });

        sessionStore.set(correlationId, newSession);
        console.log(`[Collab] Created new session in DB for ${correlationId}`);
      }

      if (topic === "question-replies") {
        const { correlationId, status, data } = event;
        console.log(
          `[Collab Service] Received QuestionSelected for match: ${correlationId}`
        );

        const session = await Session.findOne({ correlationId });

        if (session && status !== "error") {
          session.status = status;
          session.question = data;
          session.startedAt = new Date();
          session.isActive = true;
          await session.save();

          sessionStore.set(correlationId, session);
          console.log(`[Collab] Updated session in DB for ${correlationId}`);
          console.log(`[Collab] Session details:`, session);
        } else {
          console.warn(
            `[Collab Service] Received question for a match not in store: ${correlationId}`
          );
        }
      }
    },
  });
}
