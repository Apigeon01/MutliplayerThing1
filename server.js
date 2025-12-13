const WebSocket = require('ws');
const apn = require('apn');

const port = process.env.PORT || 10000;
const wss = new WebSocket.Server({ port: port });
const ADMIN_PASSWORD = "MY_SECRET_PASS"; // Change this to a password only YOU know

// ========================================================
// 🚨 FILL THESE 4 THINGS IN 🚨
// ========================================================
const apnOptions = {
  token: {
    // 1. Paste the WHOLE text from your .txt/.p8 file here
    key: `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgUeh+qcKczHUbiXBE
E4oFEpWn5A6Pll8/zYQEa0IzajagCgYIKoZIzj0DAQehRANCAATcdHBSb3T30Blo
/JmGCdJA8iZ1Zi4eJ39Q60knJXDOZniX9vAQxP/CbjEwRefyah40PycQUPUDMDsh
XrIyD2y+
-----END PRIVATE KEY-----`,

    // 2. Your Key ID (From Apple website, e.g. "4X9J...")
    keyId: "283LV5JMUR", 

    // 3. Your Team ID (Top right of Apple website, e.g. "8Y5...")
    teamId: "JC7K88C9VS" 
  },
  // 4. Set this to true so it works on TestFlight/App Store
  production: true 
};

// 🚨 REPLACE THIS with your App ID (e.g. com.yourname.bitrig)
const YOUR_BUNDLE_ID = "app.bitrig.londoncreane.memorymatch";

// ========================================================

const apnProvider = new apn.Provider(apnOptions);
const deviceTokens = new Set(); 

console.log(`Server started on port ${port}`);

wss.on('connection', function connection(ws) {
  console.log('Player connected!');

  ws.on('message', function incoming(message) {
    try {
      const data = JSON.parse(message);

      // 1. REGISTER TOKEN (The app sends its address)
      if (data.type === 'register_token') {
        if (data.token) {
          deviceTokens.add(data.token);
          console.log("Saved new device token.");
        }
      }

      // 2. ADMIN NOTIFICATION (You send this from the hidden panel)
      else if (data.type === 'admin_broadcast') {
        if (data.password === ADMIN_PASSWORD) {
          console.log(`Sending Push to ${deviceTokens.size} devices...`);
          
          const note = new apn.Notification();
          note.expiry = Math.floor(Date.now() / 1000) + 3600;
          note.badge = 1;
          note.sound = "ping.aiff";
          note.alert = { title: data.title, body: data.body };
          note.topic = YOUR_BUNDLE_ID; 

          deviceTokens.forEach(token => {
            apnProvider.send(note, token).then((result) => {
              if (result.failed.length > 0) console.log("Failed:", result.failed[0].response);
            });
          });
        }
      }

      // 3. MULTIPLAYER LOGIC
      else if (data.type === 'join_room' || data.type === 'create_room') {
        ws.send(JSON.stringify({ type: 'room_joined', roomCode: data.roomCode, success: true }));
      }
      else {
        wss.clients.forEach(c => { if (c!==ws && c.readyState===1) c.send(message); });
      }

    } catch (e) { console.error("Error:", e); }
  });
});
