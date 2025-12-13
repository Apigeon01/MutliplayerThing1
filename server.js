const WebSocket = require('ws');

const port = process.env.PORT || 10000;
const wss = new WebSocket.Server({ port: port });

console.log(`Server started on port ${port}`);

wss.on('connection', function connection(ws) {
  console.log('Player connected!');

  ws.on('message', function incoming(message) {
    try {
      const data = JSON.parse(message);

      // 1. LISTEN FOR ROOM REQUESTS
      if (data.type === 'join_room') {
        const roomCode = data.roomCode;
        console.log(`Player joining room: ${roomCode}`);
        
        // 2. SEND THE CONFIRMATION (This stops the spinner!)
        ws.send(JSON.stringify({
          type: 'room_joined',
          roomCode: roomCode,
          success: true
        }));
      }
      
      // 3. BROADCAST GAME MOVES
      else {
        // Send to everyone else (Simplified for now)
        wss.clients.forEach(function each(client) {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }
    } catch (e) {
      console.error("Error:", e);
    }
  });
});
