import Session from "../model/session-model.js";
import "dotenv/config";
const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_API_URL = process.env.DAILY_API_URL || "https://api.daily.co/v1/rooms";

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

    // If startedAt is null, set it now (first time anyone opens the session)
    if (!session.startedAt) {
      session.startedAt = new Date();
      await session.save();
    }
    res.status(200).json(session);
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
    // 1️⃣ Check if room already exists
    const existing = await fetch(`${DAILY_API_URL}/${sessionId}`, {
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
    });

    if (existing.ok) {
      const data = await existing.json();
      console.log("Room already exists:", data.name);
      return res.json({ url: data.url });
    }

    // 2️⃣ Otherwise, create a new one
    const response = await fetch(DAILY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        name: sessionId,
        properties: {
          exp: Math.round(Date.now() / 1000) + 3600, // expires in 1 hour
          max_participants: 2,
          enable_chat: true,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to create room");

    res.json({ url: data.url });
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
    const response = await fetch(`${DAILY_API_URL}/${roomName}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("Failed to delete room:", err);
      return res.status(500).json({ error: "Could not delete room" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not close room" });
  }
}
