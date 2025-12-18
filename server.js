const WebSocket = require('ws');
const apn = require('apn');
const fs = require('fs');

const port = process.env.PORT || 10000;
const wss = new WebSocket.Server({ port: port });
const ADMIN_PASSWORD = "PigeonCoo"; // Change this if you want

// ========================================================
// ✅ YOUR APPLE KEYS ARE PRE-FILLED BELOW
// ========================================================
const apnOptions = {
  token: {
    key: `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgUeh+qcKczHUbiXBE
E4oFEpWn5A6Pll8/zYQEa0IzajagCgYIKoZIzj0DAQehRANCAATcdHBSb3T30Blo
/JmGCdJA8iZ1Zi4eJ39Q60knJXDOZniX9vAQxP/CbjEwRefyah40PycQUPUDMDsh
XrIyD2y+
-----END PRIVATE KEY-----`,
    keyId: "283LV5JMUR", 
    teamId: "JC7K88C9VS" 
  },
  production: true 
};
const YOUR_BUNDLE_ID = "app.bitrig.londoncreane.memorymatch";
// ========================================================

const apnProvider = new apn.Provider(apnOptions);
const deviceTokens = new Set(); 

// --- DATABASE SETUP (Saves to a file) ---
const DB_FILE = 'database.json';
let db = { scores: [], feedback: [] };

// Load existing data if file exists
if (fs.existsSync(DB_FILE)) {
  try { db = JSON.parse(fs.readFileSync(DB_FILE)); } 
  catch (e) { console.log("Starting new database"); }
}

function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db));
}

console.log(`Server started on port ${port}`);

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    try {
      const data = JSON.parse(message);

      // --- 1. ADMIN NOTIFICATION (FIXED) ---
      if (data.type === 'admin_broadcast') {
        if (data.password === ADMIN_PASSWORD) {
          console.log("Admin broadcast received.");

          // A. Send "In-App" Banner to everyone currently connected
          const inAppMsg = JSON.stringify({
            type: 'notification',
            title: data.title,
            body: data.body
          });
          wss.clients.forEach(c => { if (c.readyState === 1) c.send(inAppMsg); });

          // B. Send "Push Notification" (Only if the toggle is ON)
          if (data.sendPush === true) {
            console.log(`Sending APNs to ${deviceTokens.size} devices...`);
            const note = new apn.Notification();
            note.expiry = Math.floor(Date.now() / 1000) + 3600;
            note.badge = 1;
            note.sound = "ping.aiff";
            note.alert = { title: data.title, body: data.body };
            note.topic = YOUR_BUNDLE_ID;
            
            deviceTokens.forEach(t => apnProvider.send(note, t));
          }
        }
      }

      // --- 2. LEADERBOARDS (NEW) ---
      else if (data.type === 'submit_score') {
        // Expected: { username: "Name", time: 12.5, mode: "Hard" }
        db.scores.push({
          username: data.username,
          time: data.time,
          mode: data.mode,
          date: new Date().toISOString()
        });
        saveDB();
      }

      else if (data.type === 'get_leaderboard') {
        const now = new Date();
        // Filter by Mode
        let filtered = db.scores.filter(s => s.mode === data.mode);

        // Filter by Time Period (Daily, Monthly, All Time)
        if (data.period === 'daily') {
          filtered = filtered.filter(s => s.date.startsWith(now.toISOString().split('T')[0]));
        } else if (data.period === 'monthly') {
          filtered = filtered.filter(s => s.date.substring(0, 7) === now.toISOString().substring(0, 7));
        }

        // Sort (Fastest time first) & Limit to Top 100
        const top100 = filtered.sort((a, b) => a.time - b.time).slice(0, 100);

        ws.send(JSON.stringify({ 
          type: 'leaderboard_data', 
          scores: top100, 
          mode: data.mode, 
          period: data.period 
        }));
      }

      // --- 3. FEEDBACK (NEW) ---
      else if (data.type === 'send_feedback') {
        db.feedback.push({
          msg: data.message,
          category: data.category,
          date: new Date().toISOString()
        });
        saveDB();
        console.log("Feedback saved.");
      }

      // --- 4. EXTRAS ---
      else if (data.type === 'register_token') {
        if (data.token) deviceTokens.add(data.token);
      }
      else if (data.type === 'join_room' || data.type === 'create_room') {
        ws.send(JSON.stringify({ type: 'room_joined', roomCode: data.roomCode, success: true }));
      }
      else {
        // Game movement
        wss.clients.forEach(c => { if (c!==ws && c.readyState===1) c.send(message); });
      }

    } catch (e) { console.error("Error:", e); }
  });
});
