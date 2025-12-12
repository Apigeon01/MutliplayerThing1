const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 10000 }); // Render uses port 10000

wss.on('connection', function connection(ws) {
  console.log('Player connected!');
  ws.on('message', function incoming(data) {
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });
});
