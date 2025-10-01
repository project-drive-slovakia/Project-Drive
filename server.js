const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Cesty
const usersFile = path.join(__dirname, 'data', 'users.json');
const sessionsFile = path.join(__dirname, 'data', 'sessions.json');
const validKeys = ['IJifuiuas4MUE28EFFE51f56ddfs65'];

// Middleware
app.use(bodyParser.json());

// ✅ Ephemeral crew-only chat relay with auto-expiration
let chatMessages = [];

app.post('/api/chat', (req, res) => {
  const { username, message } = req.body;
  if (!username || !message) return res.status(400).json({ error: 'Chýba meno alebo správa' });

  chatMessages.push({ username, message, timestamp: Date.now() });
  res.sendStatus(200);
});

app.get('/api/chat', (req, res) => {
  const now = Date.now();
  chatMessages = chatMessages.filter(msg => now - msg.timestamp < 10000);
  res.json(chatMessages);
});

// ✅ Crew-only polohy členov
let crewLocations = [];

app.post('/api/crew-location', (req, res) => {
  const { username, lat, lon } = req.body;
  if (!username || typeof lat !== 'number' || typeof lon !== 'number') {
    return res.status(400).json({ error: 'Chýbajúce alebo neplatné údaje' });
  }

  const timestamp = Date.now();
  crewLocations = crewLocations.filter(c => timestamp - c.timestamp < 10000);

  // Odstrániť starý záznam pre rovnakého používateľa
  crewLocations = crewLocations.filter(c => c.username !== username);

  crewLocations.push({ username, lat, lon, timestamp });
  res.sendStatus(200);
});

app.get('/api/crew-locations', (req, res) => {
  const now = Date.now();
  const active = crewLocations.filter(c => now - c.timestamp < 10000);
  console.log('📡 Aktívne crew polohy:', active);
  res.json(active);
});

// Pomocné funkcie
function loadSessions() {
  try {
    const data = fs.readFileSync(sessionsFile, 'utf8');
    const sessions = JSON.parse(data);
    return Array.isArray(sessions) && sessions.every(s => s.username && s.token) ? sessions : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions) {
  try {
    fs.writeFileSync(sessionsFile, JSON.stringify(sessions, null, 2));
  } catch (err) {
    console.error('❌ Chyba pri ukladaní sessions:', err);
  }
}

function generateToken() {
  return crypto.randomBytes(16).toString('hex');
}

// Overenie dostupnosti používateľského mena
app.get('/check-username', (req, res) => {
  const username = req.query.username;
  if (!username) return res.status(400).json({ error: 'Chýba meno' });

  fs.readFile(usersFile, 'utf8', (err, data) => {
    let users = [];
    try {
      users = JSON.parse(data);
      if (!Array.isArray(users)) users = [];
    } catch (e) {
      console.error('❌ Chyba pri parsovaní users.json:', e);
    }

    const exists = users.some(user => user.username === username);
    res.json({ exists });
  });
});

// Registrácia používateľa
app.post('/register', (req, res) => {
  const { username, password, confirm, accessKey } = req.body;
  console.log('📥 Prijaté údaje:', req.body);

  if (!validKeys.includes(accessKey)) {
    return res.status(403).json({ error: 'Neplatný prístupový kód' });
  }

  if (!username || !password || password.length < 6 || password !== confirm) {
    return res.status(400).json({ error: 'Neplatné údaje alebo heslá sa nezhodujú' });
  }

  fs.readFile(usersFile, 'utf8', (err, data) => {
    let users = [];
    try {
      users = JSON.parse(data);
      if (!Array.isArray(users)) users = [];
    } catch (e) {
      console.error('❌ Chyba pri parsovaní users.json:', e);
    }

    const exists = users.some(user => user.username === username);
    if (exists) {
      return res.status(409).json({ error: 'Používateľské meno už existuje' });
    }

    const newUser = {
      username,
      password,
      registeredAt: new Date().toISOString()
    };

    console.log('📦 Ukladám používateľa:', newUser);
    users.push(newUser);

    fs.writeFile(usersFile, JSON.stringify(users, null, 2), (err) => {
      if (err) {
        console.error('❌ Chyba pri ukladaní:', err);
        return res.status(500).json({ error: 'Chyba pri ukladaní' });
      }
      console.log('✅ Registrovaný:', newUser);
      res.json({ success: true });
    });
  });
});

// Prihlásenie používateľa s tokenom
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  fs.readFile(usersFile, 'utf8', (err, data) => {
    let users = [];
    try {
      users = JSON.parse(data);
      if (!Array.isArray(users)) users = [];
    } catch {
      return res.status(500).json({ error: 'Chyba pri načítaní používateľov' });
    }

    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
      return res.status(401).json({ error: 'Neplatné meno alebo heslo' });
    }

    const sessions = loadSessions().filter(s => s.username !== username);
    const token = generateToken();
    sessions.push({ username, token });
    saveSessions(sessions);

    console.log('✅ Token uložený:', token);
    console.log('📦 Sessions:', sessions);

    res.json({ success: true, token });
  });
});

// Validácia session
app.post('/validate-session', (req, res) => {
  const { username, token } = req.body;
  const sessions = loadSessions();
  const match = sessions.find(s => s.username === username && s.token === token);
  res.json({ valid: !!match });
});

// Odhlásenie používateľa
app.post('/logout', (req, res) => {
  const { username } = req.body;

  // Odstrániť session
  const sessions = loadSessions().filter(s => s.username !== username);
  saveSessions(sessions);

  // Odstrániť polohu z crewLocations
  crewLocations = crewLocations.filter(c => c.username !== username);

  console.log(`🚪 Odhlásený: ${username} — poloha odstránená`);
  res.json({ success: true });
});

// Static files až úplne nakoniec
app.use(express.static(path.join(__dirname, 'public')));

// Spustenie servera
app.listen(PORT, () => {
  console.log(`🚀 Server beží na http://localhost:${PORT}`);
});
