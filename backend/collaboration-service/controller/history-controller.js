import { findSessionsByUsername as _findSessionsByUsername } from "../model/repository.js"

export async function getSessionsByUsername(req, res) {
  try {
    const username = req.params.username || req.query.username;
    if (!username) {
      return res.status(400).json({ message: "username is required" });
    }

    const sessions = await _findSessionsByUsername(String(username));
    return res.status(200).json({
      message: `Found ${sessions.length} sessions`,
      data: sessions,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when fetching sessions" });
  }
}