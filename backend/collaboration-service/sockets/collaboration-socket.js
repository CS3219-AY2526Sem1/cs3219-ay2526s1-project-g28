// src/sockets/collaboration-socket.js
export function initCollaborationSocket(io, redis) {
    io.on("connection", (socket) => {
        console.log("User connected:", socket.id);

        socket.on("join-session", ({ sessionId }) => {
        socket.join(sessionId);
        console.log(`User joined session ${sessionId}`);
        });

        socket.on("code-change", ({ sessionId, code }) => {
        // Broadcast code updates to other clients
        socket.to(sessionId).emit("code-change", { code });
        // Optionally cache code in Redis
        redis.set(`session:${sessionId}:code`, code);
        });

        // Custom event for leaving
        socket.on("leave-session", ({ sessionId }) => {
            socket.leave(sessionId);
            console.log(`User left session: ${sessionId}`);
            // Notify others in the same room
            socket.to(sessionId).emit("user-left");
        });

        socket.on("disconnect", () => {
            const { sessionId, username } = socket.data || {};
            if (sessionId && username) {
                socket.to(sessionId).emit("user-left", { username });
                console.log(`${username} disconnected from ${sessionId}`);
            }
        });
    });
}
