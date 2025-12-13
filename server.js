const WebSocket = require('ws');

const port = process.env.PORT || 10000;
const wss = new WebSocket.Server({ port: port });

console.log(`Server started on port ${port}`);

wss.on('connection', function connection(ws) {
  console.log('Player connected!');

  ws.on('message', function incoming(message) {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data);

      // 1. THIS IS THE MISSING PIECE
      // When App says "join_room", Server must reply "room_joined"
      if (data.type === 'join_room' || data.type === 'create_room') {
        
        console.log(`Player joining room: ${data.roomCode}`);
        
        const reply = JSON.stringify({
          type: 'room_joined',
          roomCode: data.roomCode,
          success: true
        });
        
        ws.send(reply); // Send the "OK" back to the app
      }
      
      // 2. Forward other game messages (movement)
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
