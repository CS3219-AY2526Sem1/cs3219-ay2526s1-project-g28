// src/sockets/collaboration-socket.js
export function initCollaborationSocket(io, redis) {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-session", (sessionId) => {
      socket.join(sessionId);
      console.log(`User joined session ${sessionId}`);
    });

    socket.on("code-change", ({ sessionId, code }) => {
      // Broadcast code updates to other clients
      socket.to(sessionId).emit("code-change", code);
      // Optionally cache code in Redis
      redis.set(`session:${sessionId}:code`, code);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
}
