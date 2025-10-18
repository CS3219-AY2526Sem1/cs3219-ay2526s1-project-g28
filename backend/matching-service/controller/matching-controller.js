import redis from "../server.js";
import { producer } from "../kafka-utilties.js";
import { v4 as uuidv4 } from "uuid";
import {
  findMatch,
  cancelMatchmaking,
  acceptMatch,
} from "../model/matching-model.js";
import redis from "../server.js";

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

export async function cancelMatching(req, res) {
  try {
    const { userId } = req.params;

    const success = await cancelMatchmaking(userId);

    if (success) {
      return res
        .status(200)
        .json({ message: "You have been removed from the queue." });
    } else {
      return res
        .status(404)
        .json({ message: "You were not found in the matchmaking queue." });
    }
  } catch (err) {
    console.error("Error canceling matchmaking:", err);
    return res
      .status(500)
      .json({
        message: "An error occurred while removing you from the queue.",
      });
  }
}

export async function acceptMatching(req, res) {
  try {
    const { userId, matchId } = req.body;
    if (!userId || !matchId) {
      return res
        .status(400)
        .json({ message: "userId and matchId are required." });
    }

    const result = await acceptMatch(userId, matchId);
    return res.status(200).json(result);
  } catch (err) {
    console.error("Error accepting match:", err);
    return res
      .status(500)
      .json({ message: "An error occurred while accepting the match." });
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
