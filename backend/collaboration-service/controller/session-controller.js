import Session from "../model/session-model.js";
import "dotenv/config";
const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_API_URL = process.env.DAILY_API_URL || "https://api.daily.co/v1/rooms";

const MAX_DAILY_ROOM_NAME_LENGTH = 63;

const sanitizeRoomName = (rawName) => {
  if (!rawName) {
    return "peerprep-room";
  }

  const lower = rawName.toLowerCase();
  const normalized = lower
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  const trimmed = normalized.slice(0, MAX_DAILY_ROOM_NAME_LENGTH);

  if (!trimmed) {
    return "peerprep-room";
  }

  if (!/^[a-z]/.test(trimmed)) {
    return `peerprep-${trimmed}`.slice(0, MAX_DAILY_ROOM_NAME_LENGTH);
  }

  return trimmed;
};

const readJsonSafely = async (response) => {
  try {
    return await response.json();
  } catch (err) {
    return null;
  }
};

export async function createSession(req, res) {
  try {
    const session = await Session.create(req.body);
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function endSession(req, res) {
  try {
    const { correlationId } = req.params;
    const session = await Session.findOneAndUpdate(
      { correlationId },
      { isActive: false },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    
    res.status(200).json({ message: "Session ended" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getSession(req, res) {
  try {
    const { correlationId } = req.params;
    const session = await Session.findOne({ correlationId});
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Optionally fetch participants from Redis
    const redisUsers = await req.redis?.smembers(`session:${correlationId}:users`);

    // If startedAt is null, set it now (first time anyone opens the session)
    if (!session.startedAt) {
      session.startedAt = new Date();
      await session.save();
    }
    
    res.status(200).json({
      ...session.toObject(),
      participants: redisUsers || [],
      isActive: session.isActive,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// export async function createDailyRoom(req, res) {
//   const { sessionId } = req.params;

//   try {
//     // Create a room that expires in 1 hour and allows up to 2 participants
//     const response = await fetch(DAILY_API_URL, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${DAILY_API_KEY}`,
//       },
//       body: JSON.stringify({
//         name: sessionId, // use the sessionId for easy mapping
//         properties: {
//           exp: Math.round(Date.now() / 1000) + 3600,
//           max_participants: 2,
//           enable_chat: true,
//         },
//       }),
//     });

//     const data = await response.json();
//     if (!response.ok) throw new Error(data.error || "Failed to create room");

//     res.json({ url: data.url });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Could not create Daily room" });
//   }
// }
// collaborationController.js (or wherever your endpoints live)

export async function createOrGetDailyRoom(req, res) {
  const { sessionId } = req.params;

  try {
    if (!DAILY_API_KEY) {
      return res
        .status(503)
        .json({ error: "Daily API key is not configured on the server" });
    }

    const roomName = sanitizeRoomName(sessionId);

    // 1️⃣ Check if room already exists
    const existing = await fetch(`${DAILY_API_URL}/${roomName}`, {
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
    });

    if (existing.ok) {
      const data = (await readJsonSafely(existing)) ?? {};
      console.log("Room already exists:", data.name || roomName);
      return res.json({ url: data.url, roomName });
    }

    if (existing.status && existing.status !== 404) {
      const errorBody = await readJsonSafely(existing);
      const errorMessage =
        (errorBody && (errorBody.error || errorBody.info)) ||
        `Daily lookup failed with status ${existing.status}`;
      throw new Error(errorMessage);
    }

    // 2️⃣ Otherwise, create a new one
    const response = await fetch(DAILY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          exp: Math.round(Date.now() / 1000) + 3600, // expires in 1 hour
          max_participants: 2,
          enable_chat: true,
        },
      }),
    });

    const data = (await readJsonSafely(response)) ?? {};
    if (!response.ok) {
      const message = data.error || data.info || "Failed to create room";
      throw new Error(message);
    }

    res.json({ url: data.url, roomName });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create or get Daily room" });
  }
}

// 3️⃣ Add endpoint to delete room when call ends
export async function closeDailyRoom(req, res) {
  const { roomName } = req.params;
  console.log("Closing room for session:", roomName);

  try {
    if (!DAILY_API_KEY) {
      return res
        .status(503)
        .json({ error: "Daily API key is not configured on the server" });
    }

    const sanitizedRoom = sanitizeRoomName(roomName);

    const response = await fetch(`${DAILY_API_URL}/${sanitizedRoom}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
    });

    if (!response.ok) {
      const err = await readJsonSafely(response);
      console.error("Failed to delete room:", err);
      return res.status(500).json({ error: "Could not delete room" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not close room" });
  }
}
