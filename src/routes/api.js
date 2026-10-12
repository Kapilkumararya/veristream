const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const pipelineManager = require('../services/pipelineManager');
const ffmpegPipeline = require('../services/ffmpegPipeline');
const sampleFeeds = require('../samples/sampleFeeds');

// Configure multer file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(config.uploadDir)) {
      fs.mkdirSync(config.uploadDir, { recursive: true });
    }
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `media_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// System configuration info (sanitized)
router.get('/config', (req, res) => {
  res.json({
    openaiConfigured: Boolean(config.openaiApiKey),
    googleFactCheckConfigured: Boolean(config.googleFactCheckApiKey),
    ffmpegConfigured: Boolean(config.ffmpegPath),
    audioConfig: config.audioConfig
  });
});

// Get sample live stream feeds
router.get('/samples', (req, res) => {
  res.json({
    samples: sampleFeeds.map(f => ({
      id: f.id,
      title: f.title,
      category: f.category,
      speaker: f.speaker,
      description: f.description,
      segmentCount: f.segments.length
    }))
  });
});

// Start simulated live stream
router.post('/simulate/:sampleId', (req, res) => {
  const { sampleId } = req.params;
  const result = pipelineManager.startSimulation(sampleId);
  res.json({
    success: true,
    message: `Started live stream simulation: ${result.feedTitle}`,
    sessionId: result.sessionId
  });
});

// Stop simulated live stream
router.post('/simulate/stop/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  pipelineManager.stopSimulation(sessionId);
  res.json({
    success: true,
    message: 'Stream stopped',
    sessionId
  });
});

// Direct text claim verification
router.post('/verify-text', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text prompt is required.' });
    }

    const result = await pipelineManager.verifyTextClaim(text.trim());
    res.json(result);
  } catch (err) {
    console.error('Direct verification error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Upload media file for processing
router.post('/upload', upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No media file provided.' });
    }

    const inputPath = req.file.path;
    const outputPath = path.join(config.tempDir, `processed_${Date.now()}.wav`);

    if (!fs.existsSync(config.tempDir)) {
      fs.mkdirSync(config.tempDir, { recursive: true });
    }

    // Process through low latency FFmpeg pipeline
    const ffmpegRes = await ffmpegPipeline.processAudio(inputPath, outputPath, true);
    const audioBuffer = await fs.promises.readFile(outputPath);

    // Run chunk through complete fact-checking pipeline
    const chunkResult = await pipelineManager.processChunk({
      chunkBuffer: audioBuffer,
      chunkId: `upload_${Date.now()}`,
      extension: 'wav',
      sessionId: 'upload_session'
    });

    // Cleanup files
    fs.unlink(outputPath, () => {});

    res.json({
      success: true,
      filename: req.file.originalname,
      sizeBytes: req.file.size,
      ffmpegLatencyMs: ffmpegRes.latencyMs,
      result: chunkResult
    });
  } catch (err) {
    console.error('File upload processing error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get historical verified claims
router.get('/history', (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  res.json({
    history: pipelineManager.getHistory(limit)
  });
});

// Get live system telemetry & statistics
router.get('/stats', (req, res) => {
  res.json({
    stats: pipelineManager.getStats()
  });
});

// Run live latency benchmark
router.get('/benchmark', async (req, res) => {
  try {
    const dummyPath = path.join(config.tempDir, 'non_existent.mp4');
    const benchmarkRes = await ffmpegPipeline.benchmarkLatency(dummyPath);
    res.json(benchmarkRes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
