import { findMatch } from '../model/matching-model.js';
import redis from '../server.js';

const getUserKey = (userId) => `user:${userId}`;

export async function startMatchmaking(req, res) {
  try {
    const { userId, difficulty, topics } = req.body;

    if (!userId || !difficulty || !topics || !Array.isArray(topics)) {
      return res.status(400).json({ message: 'Invalid request body.' });
    }

    const userExists = await redis.exists(getUserKey(userId));
    if (userExists) {
      return res.status(200).json({ message: 'You are already in the matchmaking queue.' });
    }

    const matchResult = await findMatch(userId, difficulty, topics);

    if (matchResult) {
      return res.status(200).json({
        message: 'Match found!',
        data: matchResult,
      });
    }

    return res.status(202).json({
      message: 'No match found yet. User has been added to the queue.',
    });
  } catch (err) {
    console.error('Matchmaking error:', err);
    return res.status(500).json({ message: 'An error occurred in the matching service.' });
  }
}