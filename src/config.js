require('dotenv').config();
const path = require('path');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  googleFactCheckApiKey: process.env.GOOGLE_FACT_CHECK_API_KEY || '',
  ffmpegPath: process.env.FFMPEG_PATH || ffmpegInstaller.path,
  uploadDir: path.join(__dirname, '..', 'uploads'),
  tempDir: path.join(__dirname, '..', 'temp'),
  publicDir: path.join(__dirname, '..', 'public'),
  
  // Pipeline latency tuning params
  audioConfig: {
    sampleRate: parseInt(process.env.AUDIO_SAMPLE_RATE, 10) || 16000,
    channels: parseInt(process.env.AUDIO_CHANNELS, 10) || 1,
    chunkDurationSec: parseInt(process.env.STREAM_CHUNK_DURATION_SEC, 10) || 4,
    enableLowLatencyFfmpeg: process.env.ENABLE_LOW_LATENCY_FFMPEG !== 'false'
  }
};
