const http = require('http');
const express = require('express');
const cors = require('cors');
const { WebSocketServer, WebSocket } = require('ws');
const path = require('path');
const config = require('./config');
const apiRoutes = require('./routes/api');
const pipelineManager = require('./services/pipelineManager');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static frontend dashboard
app.use(express.static(config.publicDir));

// Mount REST API
app.use('/api', apiRoutes);

// Fallback to index.html for SPA routes
app.use((req, res) => {
  res.sendFile(path.join(config.publicDir, 'index.html'));
});

// Setup WebSocket Server for low-latency streaming workflows
const wss = new WebSocketServer({ server });

// Broadcast helper
function broadcast(eventType, data) {
  const message = JSON.stringify({ event: eventType, data });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Forward pipeline events to WebSocket clients in real-time
pipelineManager.on('transcript', (data) => broadcast('transcript', data));
pipelineManager.on('claim', (data) => broadcast('claim', data));
pipelineManager.on('telemetry', (data) => broadcast('telemetry', data));
pipelineManager.on('stream_started', (data) => broadcast('stream_started', data));
pipelineManager.on('stream_ended', (data) => broadcast('stream_ended', data));
pipelineManager.on('stream_stopped', (data) => broadcast('stream_stopped', data));

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`[WebSocket] New client connected: ${clientIp}`);

  // Send initial handshake with current system statistics
  ws.send(JSON.stringify({
    event: 'connected',
    data: {
      message: 'VeriStream WebSocket connected',
      stats: pipelineManager.getStats(),
      history: pipelineManager.getHistory(15)
    }
  }));

  ws.on('message', async (message, isBinary) => {
    try {
      if (isBinary) {
        // Binary streaming media chunk from live client stream / mic
        const chunkId = `live_chunk_${Date.now()}`;
        await pipelineManager.processChunk({
          chunkBuffer: message,
          chunkId,
          extension: 'webm',
          sessionId: 'live_mic_client'
        });
      } else {
        // JSON command from client
        const parsed = JSON.parse(message.toString());

        if (parsed.action === 'live_transcript_chunk') {
          // Client stream sending Web Speech API transcript chunk
          await pipelineManager.processChunk({
            chunkBuffer: null,
            chunkId: `chunk_${Date.now()}`,
            clientTranscript: parsed.text,
            sessionId: parsed.sessionId || 'client_speech'
          });
        } else if (parsed.action === 'ping') {
          ws.send(JSON.stringify({ event: 'pong', timestamp: Date.now() }));
        }
      }
    } catch (err) {
      console.error('[WebSocket] Message handling error:', err.message);
      ws.send(JSON.stringify({ event: 'error', data: { error: err.message } }));
    }
  });

  ws.on('close', () => {
    console.log('[WebSocket] Client disconnected');
  });
});

// Start listening
server.listen(config.port, () => {
  console.log('====================================================');
  console.log('🚀 VeriStream: Real-Time Fact Verification Engine');
  console.log(`📡 Server running at http://localhost:${config.port}`);
  console.log(`⚡ WebSocket stream endpoint active on ws://localhost:${config.port}`);
  console.log(`🎥 FFmpeg Engine: ${config.ffmpegPath ? 'Active (Low Latency Mode)' : 'Standard'}`);
  console.log(`🔍 Google Fact Check API: ${config.googleFactCheckApiKey ? 'Configured' : 'Curated Fallback Engine Active'}`);
  console.log(`🎙️ OpenAI Whisper: ${config.openaiApiKey ? 'Configured' : 'Offline Engine Active'}`);
  console.log('====================================================');
});

module.exports = { app, server };
