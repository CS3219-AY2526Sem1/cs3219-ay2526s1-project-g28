import { WebSocketServer } from 'ws';

const rooms = new Map(); // Map of roomName -> Set of WebSocket clients

export function createYjsServer(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, 'http://localhost');
    
    if (url.pathname.startsWith('/yjs')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        const pathParts = url.pathname.split('/');
        const roomName = pathParts[2] ? decodeURIComponent(pathParts[2]) : 'default';
        
        console.log(`[Yjs] Client connecting to room: ${roomName}`);
        
        // Get or create room
        if (!rooms.has(roomName)) {
          rooms.set(roomName, new Set());
        }
        const roomClients = rooms.get(roomName);
        
        // Add this client to the room
        roomClients.add(ws);
        console.log(`[Yjs] Room ${roomName} now has ${roomClients.size} client(s)`);
        
        // Store room name on the websocket for cleanup
        ws.roomName = roomName;
        
        // When this client sends a message, broadcast to all other clients in the room
        ws.on('message', (data) => {
          roomClients.forEach((client) => {
            // Send to everyone except the sender
            if (client !== ws && client.readyState === 1) { // 1 = OPEN
              try {
                client.send(data);
              } catch (err) {
                console.error('[Yjs] Error sending to client:', err.message);
              }
            }
          });
        });
        
        // Handle client disconnect
        ws.on('close', () => {
          roomClients.delete(ws);
          console.log(`[Yjs] Client disconnected from: ${roomName}`);
          console.log(`[Yjs] Room ${roomName} now has ${roomClients.size} client(s)`);
          
          // Clean up empty rooms after a delay
          if (roomClients.size === 0) {
            setTimeout(() => {
              if (roomClients.size === 0) {
                rooms.delete(roomName);
                console.log(`[Yjs] Room destroyed: ${roomName}`);
              }
            }, 30000); // 30 second grace period for reconnections
          }
        });
        
        ws.on('error', (err) => {
          console.error(`[Yjs] WebSocket error in room ${roomName}:`, err.message);
        });
      });
    } else {
      socket.destroy();
    }
  });

  console.log('[Yjs] WebSocket server ready on /yjs (relay mode)');
  return wss;
}