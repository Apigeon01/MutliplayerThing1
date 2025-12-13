const WebSocket = require('ws');

const port = process.env.PORT || 10000;
const wss = new WebSocket.Server({ port: port });

console.log(`Server started on port ${port}`);

wss.on('connection', function connection(ws) {
  console.log('Player connected!');

  ws.on('message', function incoming(message) {
    try {
      const data = JSON.parse(message);

      // 1. LISTEN FOR ROOM REQUEST
      if (data.type === 'join_room' || data.type === 'create_room') {
        
        console.log(`Player joining room: ${data.roomCode}`);
        
        // 2. SEND THE CONFIRMATION (This stops the loading spinner!)
        ws.send(JSON.stringify({
          type: 'room_joined',
          roomCode: data.roomCode,
          success: true
        }));
      }
      
      // 3. HANDLE GAME MOVES
      else {
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
