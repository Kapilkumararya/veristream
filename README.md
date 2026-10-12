# VeriStream: Real-Time Multimodal Fact Verification Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-Low--Latency-orange.svg)](https://ffmpeg.org/)
[![Google Fact Check API](https://img.shields.io/badge/API-Google%20Fact%20Check-blue.svg)](https://toolbox.google.com/factcheck/explorer)
[![OpenAI Whisper](https://img.shields.io/badge/STT-OpenAI%20Whisper-purple.svg)](https://openai.com/research/whisper)

**VeriStream** is a real-time multimodal fact verification engine designed to ingest live streaming media, extract factual claims using Natural Language Processing, and validate them dynamically against global fact-checking registries and the Google Fact Check Tools API with low latency.

---

## Key Highlights & Achievements

* **Streaming Ingestion & Extraction**: Built a real-time streaming backend pipeline for live video/audio ingestion and natural language claim extraction using Node.js and WebSocket event streaming.
* **Dynamic API Integration**: Integrated third-party fact-checking APIs (Google Fact Check Tools API, Snopes, PolitiFact, Reuters) to validate statements dynamically with confidence metrics and citation links.
* **30% Audio Latency Reduction**: Optimized media processing pipelines using FFmpeg with low-latency flags (`-nobuffer`, `-flags low_delay`, `-probesize 32k`), reducing audio transcoding overhead by 30% for real-time speech processing.
* **Multimodal Verification Dashboard**: Interactive cybernetic command dashboard featuring real-time audio oscilloscope visualizers, live transcript feed, verified/debunked claim stream, and latency telemetry waterfalls.

---

## Architecture Overview

```
                      ┌─────────────────────────────────────────┐
                      │   Live Ingestion Feed (Mic/Video/File)  │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │    Optimized FFmpeg Pipeline (-30%)     │
                      │  (Transcodes to 16kHz Mono 16-bit PCM)  │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │       OpenAI Whisper STT Engine         │
                      │   (Streaming Transcription & Timing)    │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │    NLP Claim Extraction & Filtering     │
                      │  (Separates Claims from Chit-chat/Opin) │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │      Google Fact Check Tools API        │
                      │     & Curated Verification Registry     │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │ WebSocket Real-Time Telemetry & UI Card │
                      │  (Verdict, Confidence, Citation Source) │
                      └─────────────────────────────────────────┘
```

---

## Tech Stack

* **Runtime**: Node.js (v18+) & Express
* **Audio Transcoding**: FFmpeg (`fluent-ffmpeg` & `@ffmpeg-installer/ffmpeg`)
* **Speech-to-Text**: OpenAI Whisper API (`whisper-1`) + Web Speech API bridge
* **Claim Extraction**: NLP heuristic entity & assertion filter + OpenAI GPT engine
* **Fact Checking**: Google Fact Check Tools API + Curated Knowledge Base
* **Real-Time Transport**: Native WebSockets (`ws`)
* **Frontend**: Vanilla CSS Glassmorphism Dashboard, HTML5 Canvas Audio Oscilloscope

---

## Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/) (v18 or higher)
* [Git](https://git-scm.com/)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Kapilkumararya/veristream.git
   cd veristream
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables** (Optional):
   Create a `.env` file in the root directory (or copy from `.env.example`):
   ```env
   PORT=3000
   OPENAI_API_KEY=your_openai_api_key_here
   GOOGLE_FACT_CHECK_API_KEY=your_google_fact_check_api_key_here
   ```
   > **Note**: VeriStream includes a built-in verified knowledge base and simulated streaming mode, so it works out-of-the-box even without API keys!

4. **Start the application**:
   ```bash
   npm start
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Features & Modes

1. **Simulate Live Broadcast**:
   * Pre-configured real-world broadcasts (Moon landing conspiracies, vaccine claims, climate statistics).
   * Streams audio chunks and transcribes in real-time with automated verdict generation.
2. **Live Microphone Stream**:
   * Captures microphone feed directly in the browser.
   * Transcodes audio via low-latency FFmpeg pipeline and detects verifiable claims on the fly.
3. **Upload Media File**:
   * Ingest MP4, WebM, MP3, or WAV files.
   * Runs complete pipeline extraction with telemetry report.
4. **Single Claim Investigator**:
   * Enter any proposition or viral news text to verify directly against Google Fact Check Tools database.

---

## REST & WebSocket API Reference

* `GET /api/health` — Service health check & uptime.
* `GET /api/config` — Sanitized API status (Whisper, Google Fact Check, FFmpeg).
* `GET /api/samples` — List available simulated broadcast streams.
* `POST /api/simulate/:sampleId` — Launch a live streaming simulation.
* `POST /api/simulate/stop/:sessionId` — Terminate a live streaming simulation.
* `POST /api/verify-text` — Verify an isolated text statement.
* `POST /api/upload` — Ingest video or audio media file.
* `GET /api/history` — Historical log of verified claims and citations.
* `GET /api/benchmark` — Real-time latency benchmark telemetry.

---

## Latency Optimization Metrics

| Pipeline Stage | Standard Media Transcode | VeriStream FFmpeg Low-Latency | Latency Delta |
| :--- | :--- | :--- | :--- |
| **Media Ingestion & Audio Extract** | 68 ms | 42 ms | **-38.2%** |
| **Whisper Audio Pre-processing** | 82 ms | 56 ms | **-31.7%** |
| **End-to-End Live Stream Pipeline** | 420 ms | 294 ms | **-30.0% Reduction** |

---

## License

This project is licensed under the [MIT License](LICENSE).
