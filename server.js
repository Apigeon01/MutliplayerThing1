const WebSocket = require('ws');

const port = process.env.PORT || 10000;
const wss = new WebSocket.Server({ port: port });

console.log(`Server started on port ${port}`);

// This map stores which room each client is in
// Format: { ClientID: "RoomCode" }
const clientRooms = new Map();

wss.on('connection', function connection(ws) {
  console.log('Player connected!');

  ws.on('message', function incoming(message) {
    try {
      const data = JSON.parse(message);

      // CASE 1: Player wants to JOIN or CREATE a room
      if (data.type === 'join_room') {
        const roomCode = data.roomCode;
        clientRooms.set(ws, roomCode);
        console.log(`Player joined room: ${roomCode}`);
        
        // IMPORTANT: Tell the App it worked!
        ws.send(JSON.stringify({
          type: 'room_joined',
          roomCode: roomCode,
          success: true
        }));
      }
      
      // CASE 2: Game Data (Movement, etc.)
      // Only send this to other people in the SAME room
      else {
        const myRoom = clientRooms.get(ws);
        
        // If this player is actually in a room, broadcast to neighbors
        if (myRoom) {
          wss.clients.forEach(function each(client) {
            // Send to client IF:
            // 1. It's not me
            // 2. They are connected
            // 3. They are in the SAME ROOM
            if (client !== ws && client.readyState === WebSocket.OPEN && clientRooms.get(client) === myRoom) {
              client.send(message);
            }
          });
        }
      }
    } catch (e) {
      console.error("Error parsing message:", e);
    }
  });

  // Cleanup when player leaves
  ws.on('close', () => {
    clientRooms.delete(ws);
  });
});
