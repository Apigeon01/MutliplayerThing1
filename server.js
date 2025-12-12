const WebSocket = require('ws');

// 1. Let Render tell us which port to use (or use 10000 as backup)
const port = process.env.PORT || 10000;

const wss = new WebSocket.Server({ port: port });

console.log(`Server started on port ${port}`);

wss.on('connection', function connection(ws) {
  console.log('Player connected!');
  
  ws.on('message', function incoming(data) {
    // Broadcast to everyone else
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });
});
