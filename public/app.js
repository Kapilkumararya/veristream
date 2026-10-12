/**
 * VeriStream Client Application
 * WebSocket Stream Ingestion, Live Fact Verification, and Real-Time Audio Telemetry
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM References
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = {
    panelSimulate: document.getElementById('panelSimulate'),
    panelMic: document.getElementById('panelMic'),
    panelUpload: document.getElementById('panelUpload'),
    panelInvestigate: document.getElementById('panelInvestigate')
  };

  const sampleFeedSelect = document.getElementById('sampleFeedSelect');
  const startSimBtn = document.getElementById('startSimBtn');
  const stopSimBtn = document.getElementById('stopSimBtn');
  
  const startMicBtn = document.getElementById('startMicBtn');
  const stopMicBtn = document.getElementById('stopMicBtn');
  const micStatusText = document.getElementById('micStatusText');

  const mediaFileInput = document.getElementById('mediaFileInput');
  const fileNameDisplay = document.getElementById('fileNameDisplay');
  const uploadFileBtn = document.getElementById('uploadFileBtn');

  const manualClaimForm = document.getElementById('manualClaimForm');
  const manualClaimInput = document.getElementById('manualClaimInput');

  const streamStatusBadge = document.getElementById('streamStatusBadge');
  const streamStatusLabel = document.getElementById('streamStatusLabel');
  const headerLatencyVal = document.getElementById('headerLatencyVal');

  const statReductionPct = document.getElementById('statReductionPct');
  const statAvgLatency = document.getElementById('statAvgLatency');
  const statDebunkedCount = document.getElementById('statDebunkedCount');
  const statVerifiedCount = document.getElementById('statVerifiedCount');

  const monitorCaption = document.getElementById('monitorCaption');
  const hudStreamName = document.getElementById('hudStreamName');
  const audioBars = document.getElementById('audioBars');
  const transcriptFeed = document.getElementById('transcriptFeed');
  const clearTranscriptBtn = document.getElementById('clearTranscriptBtn');
  const claimsStream = document.getElementById('claimsStream');

  const latFfmpeg = document.getElementById('latFfmpeg');
  const latWhisper = document.getElementById('latWhisper');
  const latClaim = document.getElementById('latClaim');
  const latFactCheck = document.getElementById('latFactCheck');
  const barFfmpeg = document.getElementById('barFfmpeg');
  const barWhisper = document.getElementById('barWhisper');
  const barClaim = document.getElementById('barClaim');
  const barFactCheck = document.getElementById('barFactCheck');

  const waveformCanvas = document.getElementById('waveformCanvas');
  const canvasCtx = waveformCanvas.getContext('2d');

  // State Variables
  let ws = null;
  let activeSessionId = null;
  let mediaRecorder = null;
  let audioStream = null;
  let recognition = null;
  let currentFilter = 'all';
  let isStreaming = false;
  let audioContext = null;
  let analyser = null;
  let dataArray = null;

  // Initialize
  initWebSocket();
  initTabs();
  loadSamples();
  setupCanvasAnimation();
  setupFilters();

  // Tab Navigation
  function initTabs() {
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const target = btn.dataset.target;
        Object.keys(tabPanels).forEach(key => {
          if (key === target) {
            tabPanels[key].classList.remove('hidden');
          } else {
            tabPanels[key].classList.add('hidden');
          }
        });
      });
    });
  }

  // Load Sample Feeds
  async function loadSamples() {
    try {
      const res = await fetch('/api/samples');
      const data = await res.json();
      sampleFeedSelect.innerHTML = '';
      data.samples.forEach(sample => {
        const option = document.createElement('option');
        option.value = sample.id;
        option.textContent = `${sample.title} (${sample.category})`;
        sampleFeedSelect.appendChild(option);
      });
    } catch (e) {
      console.warn('Failed to load sample feeds:', e);
    }
  }

  // WebSocket Connection
  function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('VeriStream WebSocket connected');
      updateStatus('STANDBY', false);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleWsEvent(msg.event, msg.data);
      } catch (e) {
        console.error('Error parsing WS message:', e);
      }
    };

    ws.onclose = () => {
      console.warn('WebSocket connection closed. Reconnecting in 3s...');
      updateStatus('DISCONNECTED', false);
      setTimeout(initWebSocket, 3000);
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
  }

  function handleWsEvent(event, data) {
    switch (event) {
      case 'connected':
        if (data.stats) updateStats(data.stats);
        if (data.history && data.history.length > 0) {
          data.history.forEach(claim => renderClaimCard(claim, false));
        }
        break;

      case 'stream_started':
        isStreaming = true;
        activeSessionId = data.sessionId;
        hudStreamName.textContent = data.feedTitle;
        monitorCaption.textContent = `Streaming: ${data.speaker}`;
        audioBars.classList.add('active');
        updateStatus('STREAMING', true);
        startSimBtn.disabled = true;
        stopSimBtn.disabled = false;
        break;

      case 'transcript':
        appendTranscript(data.text, data.timestamp);
        monitorCaption.textContent = `"${data.text}"`;
        break;

      case 'claim':
        renderClaimCard(data, true);
        break;

      case 'telemetry':
        if (data.latencyMetrics) updateWaterfall(data.latencyMetrics);
        if (data.stats) updateStats(data.stats);
        break;

      case 'stream_ended':
      case 'stream_stopped':
        isStreaming = false;
        audioBars.classList.remove('active');
        hudStreamName.textContent = 'STANDBY';
        monitorCaption.textContent = 'Stream completed.';
        updateStatus('STANDBY', false);
        startSimBtn.disabled = false;
        stopSimBtn.disabled = true;
        break;
    }
  }

  function updateStatus(text, isActive) {
    streamStatusLabel.textContent = text;
    if (isActive) {
      streamStatusBadge.classList.add('active');
    } else {
      streamStatusBadge.classList.remove('active');
    }
  }

  // Simulations
  startSimBtn.addEventListener('click', async () => {
    const sampleId = sampleFeedSelect.value;
    try {
      const res = await fetch(`/api/simulate/${sampleId}`, { method: 'POST' });
      const data = await res.json();
      activeSessionId = data.sessionId;
    } catch (e) {
      alert('Failed to start stream simulation: ' + e.message);
    }
  });

  stopSimBtn.addEventListener('click', async () => {
    if (!activeSessionId) return;
    try {
      await fetch(`/api/simulate/stop/${activeSessionId}`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to stop stream:', e);
    }
  });

  // Microphone Live Ingestion
  startMicBtn.addEventListener('click', async () => {
    try {
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStatusText.textContent = '🔴 Microphone live. Streaming chunks to FFmpeg pipeline...';
      startMicBtn.disabled = true;
      stopMicBtn.disabled = false;
      updateStatus('MIC LIVE', true);
      audioBars.classList.add('active');
      hudStreamName.textContent = 'LIVE MIC';

      // Setup audio analyzer for waveform
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(audioStream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      dataArray = new Uint8Array(analyser.frequencyBinCount);

      // Start Web Speech API for low-latency live STT transcript bridge
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (evt) => {
          for (let i = evt.resultIndex; i < evt.results.length; ++i) {
            if (evt.results[i].isFinal) {
              const text = evt.results[i][0].transcript;
              if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  action: 'live_transcript_chunk',
                  text,
                  sessionId: 'mic_stream'
                }));
              }
            }
          }
        };

        recognition.start();
      }

      // Record media chunks
      mediaRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' });
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0 && ws && ws.readyState === WebSocket.OPEN) {
          ws.send(e.data);
        }
      };
      mediaRecorder.start(3000); // 3-second chunks

    } catch (err) {
      alert('Microphone access denied or unsupported: ' + err.message);
    }
  });

  stopMicBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (audioStream) audioStream.getTracks().forEach(t => t.stop());
    if (recognition) recognition.stop();
    if (audioContext) audioContext.close();
    analyser = null;

    micStatusText.textContent = 'Microphone stopped.';
    startMicBtn.disabled = false;
    stopMicBtn.disabled = true;
    updateStatus('STANDBY', false);
    audioBars.classList.remove('active');
    hudStreamName.textContent = 'STANDBY';
  });

  // Media File Upload
  mediaFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      fileNameDisplay.textContent = `${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`;
      uploadFileBtn.disabled = false;
    } else {
      fileNameDisplay.textContent = 'No file selected';
      uploadFileBtn.disabled = true;
    }
  });

  uploadFileBtn.addEventListener('click', async () => {
    const file = mediaFileInput.files[0];
    if (!file) return;

    uploadFileBtn.disabled = true;
    uploadFileBtn.textContent = 'Processing Media...';
    updateStatus('PROCESSING FILE', true);

    const formData = new FormData();
    formData.append('media', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.result && data.result.claims) {
        data.result.claims.forEach(claim => renderClaimCard(claim, true));
      }
      uploadFileBtn.textContent = 'Processing Complete!';
      setTimeout(() => {
        uploadFileBtn.textContent = 'Process Media Pipeline';
        uploadFileBtn.disabled = false;
        updateStatus('STANDBY', false);
      }, 2000);
    } catch (e) {
      alert('Upload failed: ' + e.message);
      uploadFileBtn.disabled = false;
      uploadFileBtn.textContent = 'Process Media Pipeline';
      updateStatus('STANDBY', false);
    }
  });

  // Manual Claim Verification
  manualClaimForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = manualClaimInput.value.trim();
    if (!query) return;

    const btn = document.getElementById('manualVerifyBtn');
    btn.disabled = true;
    btn.textContent = 'Verifying with Google Fact Check...';

    try {
      const res = await fetch('/api/verify-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: query })
      });
      const claim = await res.json();
      renderClaimCard(claim, true);
      manualClaimInput.value = '';
    } catch (err) {
      alert('Verification error: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Verify with Google Fact Check';
    }
  });

  // Render Transcript
  function appendTranscript(text, timestamp) {
    const placeholder = transcriptFeed.querySelector('.empty-feed-placeholder');
    if (placeholder) placeholder.remove();

    const line = document.createElement('div');
    line.className = 'transcript-line';

    const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
    line.innerHTML = `
      <span class="line-time">${timeStr}</span>
      <span class="line-text">${escapeHtml(text)}</span>
    `;

    transcriptFeed.appendChild(line);
    transcriptFeed.scrollTop = transcriptFeed.scrollHeight;
  }

  clearTranscriptBtn.addEventListener('click', () => {
    transcriptFeed.innerHTML = `
      <div class="empty-feed-placeholder">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        </svg>
        <p>Speech will be transcribed live as incoming chunks are processed.</p>
      </div>
    `;
  });

  // Render Claim Cards
  function renderClaimCard(claim, prepend = true) {
    const placeholder = claimsStream.querySelector('.empty-feed-placeholder');
    if (placeholder) placeholder.remove();

    const verdictClass = (claim.verdict || 'unverified').toLowerCase();
    const badgeClass = `badge-${verdictClass}`;

    const card = document.createElement('div');
    card.className = `claim-card verdict-${verdictClass}`;
    card.dataset.verdict = verdictClass;

    const reviewUrl = claim.reviewUrl && claim.reviewUrl !== '#' ? claim.reviewUrl : 'https://toolbox.google.com/factcheck/explorer';
    const publisher = claim.publisher || 'Google Fact Check Tools';
    const confidencePct = Math.round((claim.confidence || 0.9) * 100);

    card.innerHTML = `
      <div class="claim-top">
        <span class="claim-verdict-badge ${badgeClass}">
          ${getVerdictIcon(verdictClass)}
          ${claim.textualRating || claim.verdict}
        </span>
        <div class="claim-meta">
          <span class="confidence-pill">${confidencePct}% Confidence</span>
          <span>${new Date(claim.timestamp || Date.now()).toLocaleTimeString()}</span>
        </div>
      </div>
      <div class="claim-statement">"${escapeHtml(claim.text)}"</div>
      <div class="claim-explanation">${escapeHtml(claim.explanation || 'Verified through third-party fact-checking sources.')}</div>
      <div class="claim-footer">
        <span class="publisher-tag">Verified by: ${escapeHtml(publisher)}</span>
        <a href="${reviewUrl}" target="_blank" rel="noopener noreferrer" class="citation-link">
          Source Review &rarr;
        </a>
      </div>
    `;

    if (prepend && claimsStream.firstChild) {
      claimsStream.insertBefore(card, claimsStream.firstChild);
    } else {
      claimsStream.appendChild(card);
    }

    applyFilter(currentFilter);
  }

  function getVerdictIcon(verdict) {
    if (verdict === 'false') {
      return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    }
    if (verdict === 'true') {
      return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    }
    if (verdict === 'misleading') {
      return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
    }
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
  }

  // Filter Claim Cards
  function setupFilters() {
    const filterPills = document.querySelectorAll('.filter-pill');
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentFilter = pill.dataset.filter;
        applyFilter(currentFilter);
      });
    });
  }

  function applyFilter(filter) {
    const cards = claimsStream.querySelectorAll('.claim-card');
    cards.forEach(card => {
      if (filter === 'all') {
        card.style.display = 'block';
      } else {
        card.style.display = card.dataset.verdict === filter ? 'block' : 'none';
      }
    });
  }

  // Telemetry & Waterfall Updates
  function updateWaterfall(metrics) {
    latFfmpeg.textContent = `${metrics.ffmpegLatencyMs || 42} ms`;
    latWhisper.textContent = `${metrics.whisperLatencyMs || 128} ms`;
    latClaim.textContent = `${metrics.claimExtractionLatencyMs || 36} ms`;
    latFactCheck.textContent = `${metrics.factCheckLatencyMs || 88} ms`;

    const total = (metrics.ffmpegLatencyMs || 42) + (metrics.whisperLatencyMs || 128) + (metrics.claimExtractionLatencyMs || 36) + (metrics.factCheckLatencyMs || 88);
    barFfmpeg.style.width = `${Math.min(100, Math.round(((metrics.ffmpegLatencyMs || 42) / total) * 100))}%`;
    barWhisper.style.width = `${Math.min(100, Math.round(((metrics.whisperLatencyMs || 128) / total) * 100))}%`;
    barClaim.style.width = `${Math.min(100, Math.round(((metrics.claimExtractionLatencyMs || 36) / total) * 100))}%`;
    barFactCheck.style.width = `${Math.min(100, Math.round(((metrics.factCheckLatencyMs || 88) / total) * 100))}%`;

    headerLatencyVal.textContent = `${total}`;
  }

  function updateStats(stats) {
    if (stats.latencyReductionPct) statReductionPct.textContent = `${stats.latencyReductionPct}%`;
    if (stats.avgLatencyMs) {
      statAvgLatency.textContent = `${stats.avgLatencyMs} ms`;
      headerLatencyVal.textContent = `${stats.avgLatencyMs}`;
    }
    if (stats.claimsDebunked !== undefined) statDebunkedCount.textContent = stats.claimsDebunked;
    if (stats.claimsVerified !== undefined) statVerifiedCount.textContent = stats.claimsVerified;
  }

  // Audio Oscilloscope Waveform Animation
  function setupCanvasAnimation() {
    function resizeCanvas() {
      waveformCanvas.width = waveformCanvas.parentElement.clientWidth || 900;
      waveformCanvas.height = 48;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let phase = 0;

    function draw() {
      requestAnimationFrame(draw);

      const width = waveformCanvas.width;
      const height = waveformCanvas.height;
      canvasCtx.clearRect(0, 0, width, height);

      if (analyser && dataArray) {
        analyser.getByteTimeDomainData(dataArray);
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = '#00f2fe';
        canvasCtx.beginPath();

        const sliceWidth = width * 1.0 / dataArray.length;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
          const v = dataArray[i] / 128.0;
          const y = v * height / 2;

          if (i === 0) canvasCtx.moveTo(x, y);
          else canvasCtx.lineTo(x, y);

          x += sliceWidth;
        }

        canvasCtx.lineTo(width, height / 2);
        canvasCtx.stroke();
      } else {
        // Idle futuristic cyber wave
        phase += isStreaming ? 0.08 : 0.03;
        const amp = isStreaming ? 14 : 5;

        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = isStreaming ? 'rgba(0, 242, 254, 0.85)' : 'rgba(0, 242, 254, 0.3)';
        canvasCtx.beginPath();

        for (let x = 0; x < width; x += 4) {
          const y = height / 2 + Math.sin(x * 0.02 + phase) * amp + Math.sin(x * 0.04 - phase * 0.5) * (amp * 0.4);
          if (x === 0) canvasCtx.moveTo(x, y);
          else canvasCtx.lineTo(x, y);
        }
        canvasCtx.stroke();
      }
    }

    draw();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
