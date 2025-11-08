import Session from "../model/session-model.js";

export function initCollaborationSocket(io, redis) {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-session", async ({ sessionId, username }) => {
      socket.join(sessionId);
      socket.data.sessionId = sessionId;
      socket.data.username = username;

      console.log(`User ${username} joined session ${sessionId}`);

      // Add to Redis set atomically (avoids race conditions)
      await redis.sadd(`session:${sessionId}:users`, username);

      // Remove from disconnected list if present
      await redis.srem(`session:${sessionId}:disconnected`, username);

      const users = await redis.smembers(`session:${sessionId}:users`);
      console.log("Current users in session", sessionId, ":", users);

      socket.to(sessionId).emit("user-joined", { username });
    });

    socket.on("code-change", ({ sessionId, code }) => {
      // Broadcast code updates to other clients
      socket.to(sessionId).emit("code-change", { code });
      // Optionally cache code in Redis
      redis.set(`session:${sessionId}:code`, code);
    });

    socket.on("language-change", ({ sessionId, language }) => {
      // Broadcast language updates to others
      socket.to(sessionId).emit("language-change", { language });
    });

    socket.on("cursor-change", ({ sessionId, position, username }) => {
      socket.to(sessionId).emit("remote-cursor-change", { position, username });
    });

    // Leave session (voluntary)
    socket.on(
      "leave-session",
      async ({
        sessionId,
        username,
        code,
        submitResults,
        error,
        language,
        hasSubmitted,
      }) => {
        socket.data.voluntaryLeave = true;
        console.log(`User ${username} left session ${sessionId}`);

        // Remove user completely (they can join another session)
        await redis.srem(`session:${sessionId}:users`, username);
        await redis.srem(`session:${sessionId}:disconnected`, username);

        socket.to(sessionId).emit("user-left", { username });

        // Cleanup check
        await checkAndCleanup(sessionId, redis);
        await updateHistory(
          sessionId,
          code,
          submitResults,
          error,
          language,
          hasSubmitted
        );

        // Optional: Mark DB session inactive
        // await Session.findOneAndUpdate(
        //     { correlationId: sessionId },
        //     { isActive: users.length > 0 }
        // );

        socket.leave(sessionId);
        socket.disconnect(true);
      }
    );

    // --- DISCONNECT (accidental) ---
    socket.on("disconnect", async () => {
      const { sessionId, username, voluntaryLeave } = socket.data || {};
      if (!sessionId || !username) return;

      if (voluntaryLeave) return;

      console.log(`User ${username} disconnected from ${sessionId}`);

      // Move to disconnected set (don’t remove from active users)
      await redis.sadd(`session:${sessionId}:disconnected`, username);

      // Notify other user(s)
      socket.to(sessionId).emit("user-disconnected", { username });

      // Cleanup check
      await checkAndCleanup(sessionId, redis);
    });
  });
}

// --- Helper: Check if both users are gone ---
async function checkAndCleanup(sessionId, redis) {
  const users = await redis.smembers(`session:${sessionId}:users`);
  const disconnected = await redis.smembers(
    `session:${sessionId}:disconnected`
  );

  console.log(users);
  console.log(disconnected);

  // If no active OR disconnected users left → delete Redis + mark inactive
  if (disconnected.length === users.length) {
    console.log(`Cleaning up empty session ${sessionId}`);
    await redis.del(
      `session:${sessionId}:users`,
      `session:${sessionId}:disconnected`,
      `session:${sessionId}:code`
    );

    await Session.findOneAndUpdate(
      { correlationId: sessionId },
      { isActive: false }
    );

    console.log(`Session ${sessionId} marked inactive and cleaned.`);
  }
}

async function updateHistory(
  sessionId,
  code,
  submitResults,
  error,
  language,
  hasSubmitted
) {
  const endedAt = new Date();

  if (hasSubmitted) {
    await Session.updateOne(
      { correlationId: sessionId },
      {
        $set: {
          code,
          submitResults: submitResults ?? [],
          error: error ?? null,
          language,
          hasSubmitted: true,
          endedAt, // Date, not function
        },
      }
    );
  } else {
    await Session.updateOne(
      { correlationId: sessionId },
      {
        $set: {
          hasSubmitted: false,
          endedAt, // Date, not function
        },
      }
    );
  }
}
