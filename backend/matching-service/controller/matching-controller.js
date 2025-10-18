import { findMatch } from "../model/repository.js";
import redis from "../server.js";
import { producer } from "../kafka-utilties.js";
import { v4 as uuidv4 } from "uuid";

const getUserKey = (userId) => `user:${userId}`;

export async function startMatchmaking(req, res) {
  try {
    const { userId, difficulty, topics } = req.body;

    if (!userId || !difficulty || !topics || !Array.isArray(topics)) {
      return res.status(400).json({ message: "Invalid request body." });
    }

    const userExists = await redis.exists(getUserKey(userId));
    if (userExists) {
      return res
        .status(200)
        .json({ message: "You are already in the matchmaking queue." });
    }

    const matchResult = await findMatch(userId, difficulty, topics);

    if (matchResult) {
      await requestQuestion(difficulty, topics); // Request a question for the matched users
      return res.status(200).json({
        message: "Match found!",
        data: matchResult,
      });
    }

    return res.status(202).json({
      message: "No match found yet. User has been added to the queue.",
    });
  } catch (err) {
    console.error("Matchmaking error:", err);
    return res
      .status(500)
      .json({ message: "An error occurred in the matching service." });
  }
}

// This function will be called by your controller
export async function requestQuestion(difficulty, topics) {
  const correlationId = uuidv4();

  // Send the request message
  await producer.send({
    topic: "match_request",
    messages: [
      {
        value: JSON.stringify({
          correlationId: correlationId,
          difficulty: difficulty,
          topics: topics,
        }),
      },
    ],
  });
}
