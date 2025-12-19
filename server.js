const WebSocket = require('ws');
const apn = require('apn');
const fs = require('fs');

const port = process.env.PORT || 10000;
const wss = new WebSocket.Server({ port: port });
const ADMIN_PASSWORD = "MY_SECRET_PASS"; 

// ========================================================
// ✅ APPLE KEYS (Keep these safe)
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

// --- ROBUST DATABASE SETUP ---
const DB_FILE = 'database.json';
let db = { scores: [], feedback: [] };

// Load data safely
if (fs.existsSync(DB_FILE)) {
  try { 
    const raw = fs.readFileSync(DB_FILE);
    db = JSON.parse(raw);
    // 🚨 Fix: Ensure arrays exist if file is old
    if (!db.scores) db.scores = [];
    if (!db.feedback) db.feedback = [];
  } catch (e) { 
    console.log("Database corrupted, starting fresh."); 
    db = { scores: [], feedback: [] };
  }
}

function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db));
}

console.log(`Server started on port ${port}`);

wss.on('connection', function connection(ws) {
  console.log("New Player Connected!"); // Log connection

  ws.on('message', function incoming(message) {
    try {
      console.log("Received raw message:", message.toString()); // 🚨 LOG EVERYTHING
      
      let data;
      try { data = JSON.parse(message); }
      catch(e) { console.log("Not JSON"); return; }

      // --- 1. LEADERBOARDS ---
      if (data.type === 'get_leaderboard') {
        console.log("Fetching Leaderboard...");
        const now = new Date();
        
        // Safety check: ensure scores exists
        let list = db.scores || [];
        
        let filtered = list.filter(s => s.mode === data.mode);
        
        // Sort & Limit
        const top100 = filtered.sort((a, b) => a.time - b.time).slice(0, 100);

        const response = JSON.stringify({ 
          type: 'leaderboard_data', 
          scores: top100,
          period: data.period 
        });
        
        ws.send(response);
        console.log("Sent Leaderboard Data!");
      }

      // --- 2. SUBMIT SCORE ---
      else if (data.type === 'submit_score') {
        if (!db.scores) db.scores = [];
        db.scores.push({
          username: data.username,
          time: data.time,
          mode: data.mode,
          date: new Date().toISOString()
        });
        saveDB();
        console.log("Score Saved:", data.time);
      }

      // --- 3. ADMIN & PUSH ---
      else if (data.type === 'admin_broadcast') {
        if (data.password === ADMIN_PASSWORD) {
          // Send In-App
          const banner = JSON.stringify({ type: 'notification', title: data.title, body: data.body });
          wss.clients.forEach(c => { if (c.readyState === 1) c.send(banner); });

          // Send Push
          if (data.sendPush === true) {
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

      // --- 4. EXTRAS ---
      else if (data.type === 'register_token') {
        if (data.token) deviceTokens.add(data.token);
      }
      else if (data.type === 'join_room' || data.type === 'create_room') {
        ws.send(JSON.stringify({ type: 'room_joined', roomCode: data.roomCode, success: true }));
      }
      else {
        wss.clients.forEach(c => { if (c!==ws && c.readyState===1) c.send(message); });
      }

    } catch (e) { console.error("Server Error:", e); }
  });
});
