const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

const sessions = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.createdAt > 30 * 60 * 1000) {
      sessions.delete(id);
    }
  }
}, 10 * 60 * 1000);

app.post('/api/preview/create', (req, res) => {
  try {
    const { files } = req.body;
    const sessionId = uuidv4();
    sessions.set(sessionId, {
      files,
      createdAt: Date.now(),
      errors: []
    });
    res.json({
      success: true,
      sessionId,
      previewUrl: `/preview/${sessionId}`,
      expiresIn: '30 minutes'
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/preview/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session expired' });
  res.json(session);
});

app.post('/api/preview/:sessionId/error', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (session) {
    session.errors.push({ ...req.body, timestamp: Date.now() });
  }
  res.json({ ok: true });
});

app.get('/api/preview/:sessionId/errors', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  res.json({ errors: session?.errors || [] });
});

app.get('/preview/:sessionId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'preview.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Preview engine running on port ${PORT}`);
});
