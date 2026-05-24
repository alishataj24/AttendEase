import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';

// Store connections by user email/id
const clients = new Map<string, WebSocket>();

export function setupWebSockets(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws: WebSocket, request) => {
    let userId: string | null = null;

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'auth' && typeof data.userId === 'string') {
          userId = data.userId;
          clients.set(data.userId, ws);
          console.log(`WebSocket: User ${userId} connected.`);
        }
      } catch (err) {
        console.error('WebSocket message parsing error:', err);
      }
    });

    ws.on('close', () => {
      if (userId) {
        clients.delete(userId);
        console.log(`WebSocket: User ${userId} disconnected.`);
      }
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for user ${userId}:`, error);
      if (userId) clients.delete(userId);
    });
  });

  console.log('WebSocket server mounted on Express server.');
}

export function broadcastToFaculty(facultyId: string, payload: any) {
  const ws = clients.get(facultyId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
    console.log(`WebSocket: Broadcasted attendance to faculty ${facultyId}.`);
    return true;
  }
  console.log(`WebSocket: Faculty ${facultyId} is not connected to WebSockets.`);
  return false;
}
