const WebSocket = require('ws');

const port = process.env.PORT || 10000;
const wss = new WebSocket.Server({ port: port });

console.log(`Server started on port ${port}`);

wss.on('connection', function connection(ws) {
  console.log('Player connected!');

  ws.on('message', function incoming(message) {
    try {
      const data = JSON.parse(message);
      
      // THIS IS THE FIX:
      // When App asks to join, we MUST reply with "room_joined"
      if (data.type === 'join_room' || data.type === 'create_room') {
        console.log(`Player joined room: ${data.roomCode}`);
        
        // Send the "OK" signal back to the app
        ws.send(JSON.stringify({
          type: 'room_joined',
          roomCode: data.roomCode,
          success: true
        }));
      }
      
      // Handle game movement
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
