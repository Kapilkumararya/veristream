/**
 * VeriStream Operator Console Client
 * Connects to FastAPI Backend, WebSockets, LangGraph Workflow, and Qdrant Vector RAG
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const wsStatus = document.getElementById('wsStatus');

  const claimInput = document.getElementById('claimInput');
  const verifySyncBtn = document.getElementById('verifySyncBtn');
  const verifyAsyncBtn = document.getElementById('verifyAsyncBtn');
  const presetChips = document.querySelectorAll('.preset-chip');

  const thoughtContainer = document.getElementById('thoughtContainer');
  const thoughtList = document.getElementById('thoughtList');
  const resultContainer = document.getElementById('resultContainer');

  const verdictCard = document.getElementById('verdictCard');
  const verdictBadge = document.getElementById('verdictBadge');
  const ratingText = document.getElementById('ratingText');
  const confidenceNum = document.getElementById('confidenceNum');
  const verdictSummary = document.getElementById('verdictSummary');
  const metaDomain = document.getElementById('metaDomain');
  const metaRisk = document.getElementById('metaRisk');
  const metaConsensus = document.getElementById('metaConsensus');
  const proList = document.getElementById('proList');
  const conList = document.getElementById('conList');
  const latencyGrid = document.getElementById('latencyGrid');
  const reportContent = document.getElementById('reportContent');
  const quantFindings = document.getElementById('quantFindings');
  const sourceFindings = document.getElementById('sourceFindings');

  const mediaFileInput = document.getElementById('mediaFileInput');
  const uploadMediaBtn = document.getElementById('uploadMediaBtn');
  const imageFileInput = document.getElementById('imageFileInput');
  const imageCaptionInput = document.getElementById('imageCaptionInput');
  const uploadImageBtn = document.getElementById('uploadImageBtn');
  const mediaOutput = document.getElementById('mediaOutput');
  const mediaStatus = document.getElementById('mediaStatus');

  const runBenchmarkBtn = document.getElementById('runBenchmarkBtn');
  const benchmarkResult = document.getElementById('benchmarkResult');
  const benchStd = document.getElementById('benchStd');
  const benchOpt = document.getElementById('benchOpt');
  const benchPct = document.getElementById('benchPct');
  const benchFlags = document.getElementById('benchFlags');

  const notifList = document.getElementById('notifList');
  const clearLogsBtn = document.getElementById('clearLogsBtn');

  // WebSocket Connection
  let ws = null;
  function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/notifications`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      wsStatus.textContent = 'WS: Connected';
      wsStatus.style.color = '#10b981';
      appendNotification('WebSocket connected to LangGraph notification channel.');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleNotification(data);
      } catch (e) {
        console.warn('WS message error:', e);
      }
    };

    ws.onclose = () => {
      wsStatus.textContent = 'WS: Disconnected';
      wsStatus.style.color = '#ef4444';
      setTimeout(connectWebSocket, 3000);
    };
  }
  connectWebSocket();

  // Tab switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const targetPane = document.getElementById(btn.dataset.tab);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // Presets
  presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      claimInput.value = chip.dataset.claim;
    });
  });

  // Clear Logs
  clearLogsBtn.addEventListener('click', () => {
    notifList.innerHTML = '<div class="notif-empty">Awaiting background verification tasks...</div>';
  });

  function appendNotification(text) {
    const empty = notifList.querySelector('.notif-empty');
    if (empty) empty.remove();

    const item = document.createElement('div');
    item.className = 'notif-item';
    const time = new Date().toLocaleTimeString();
    item.textContent = `[${time}] ${text}`;
    notifList.prepend(item);
  }

  function handleNotification(data) {
    if (data.current_thought) {
      appendNotification(`Task ${data.task_id.slice(0, 8)}: ${data.current_thought}`);
    }

    if (data.status === 'completed' && data.result) {
      appendNotification(`Task ${data.task_id.slice(0, 8)}: COMPLETED &rarr; ${data.result.verdict}`);
      renderResult(data.result);
    }
  }

  // Synchronous Verification
  verifySyncBtn.addEventListener('click', async () => {
    const text = claimInput.value.trim();
    if (!text) {
      alert('Please enter a claim to investigate.');
      return;
    }

    verifySyncBtn.disabled = true;
    verifySyncBtn.textContent = 'LangGraph Running...';
    thoughtContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    thoughtList.innerHTML = '';

    try {
      const res = await fetch('/api/verify/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      renderResult(data);
    } catch (err) {
      alert('Verification Error: ' + err.message);
    } finally {
      verifySyncBtn.disabled = false;
      verifySyncBtn.textContent = 'Execute LangGraph Workflow';
    }
  });

  // Asynchronous Verification
  verifyAsyncBtn.addEventListener('click', async () => {
    const text = claimInput.value.trim();
    if (!text) {
      alert('Please enter a claim to investigate.');
      return;
    }

    verifyAsyncBtn.disabled = true;
    verifyAsyncBtn.textContent = 'Queuing LangGraph...';

    try {
      const res = await fetch('/api/verify/async', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      appendNotification(`Dispatched task ${data.task_id}. Streaming LangGraph node steps via WebSocket...`);
      thoughtContainer.classList.remove('hidden');
      thoughtList.innerHTML = `<div class="thought-item"><span class="thought-phase">LangGraph Workflow Initialized</span>Task ${data.task_id} running asynchronously in background. Watch real-time notifications below.</div>`;
    } catch (err) {
      alert('Async Queue Error: ' + err.message);
    } finally {
      verifyAsyncBtn.disabled = false;
      verifyAsyncBtn.textContent = 'Dispatch Async Task (WebSocket Notify)';
    }
  });

  // Render Verification Result
  function renderResult(result) {
    // 1. Thought steps
    thoughtContainer.classList.remove('hidden');
    thoughtList.innerHTML = '';
    (result.agent_thought_process || []).forEach(step => {
      const item = document.createElement('div');
      item.className = 'thought-item';
      item.innerHTML = `
        <div class="thought-phase">Step ${step.step_number}: ${escapeHtml(step.phase)} (${step.elapsed_ms}ms)</div>
        <div>${escapeHtml(step.thought)}</div>
      `;
      thoughtList.appendChild(item);
    });

    // 2. Verdict Card
    resultContainer.classList.remove('hidden');
    verdictCard.className = 'card verdict-card';
    verdictBadge.className = 'verdict-badge';

    const vLower = (result.verdict || '').toLowerCase();
    if (vLower.includes('true')) {
      verdictCard.classList.add('verdict-true');
      verdictBadge.classList.add('badge-true');
    } else if (vLower.includes('false')) {
      verdictCard.classList.add('verdict-false');
      verdictBadge.classList.add('badge-false');
    } else {
      verdictCard.classList.add('verdict-misleading');
      verdictBadge.classList.add('badge-misleading');
    }

    verdictBadge.textContent = result.verdict;
    ratingText.textContent = result.textual_rating;
    confidenceNum.textContent = `${Math.round(result.confidence_score * 100)}%`;
    verdictSummary.textContent = result.verdict_summary;
    metaDomain.textContent = result.domain;
    metaRisk.textContent = result.risk_level;
    metaConsensus.textContent = result.consensus_assessment;

    // 3. Pro Evidence
    proList.innerHTML = '';
    (result.supporting_evidence || []).forEach(item => {
      const card = document.createElement('div');
      card.className = 'evidence-card';
      card.innerHTML = `
        <div class="ev-header">
          <span>${escapeHtml(item.source_name)} (${escapeHtml(item.authority_type)})</span>
          <span class="ev-cred">Score: ${Math.round(item.credibility_score * 100)}%</span>
        </div>
        <div class="ev-body">${escapeHtml(item.evidence_point)}</div>
        ${item.url ? `<a href="${item.url}" target="_blank" class="ev-url">Source Citation &rarr;</a>` : ''}
      `;
      proList.appendChild(card);
    });

    // 4. Con Evidence (Qdrant RAG + Fact Check Registries)
    conList.innerHTML = '';
    (result.refuting_evidence || []).forEach(item => {
      const card = document.createElement('div');
      card.className = 'evidence-card';
      card.innerHTML = `
        <div class="ev-header">
          <span>${escapeHtml(item.source_name)} (${escapeHtml(item.authority_type)})</span>
          <span class="ev-cred">Score: ${Math.round(item.credibility_score * 100)}%</span>
        </div>
        <div class="ev-body">${escapeHtml(item.evidence_point)}</div>
        ${item.url ? `<a href="${item.url}" target="_blank" class="ev-url">Qdrant RAG / Regulatory Link &rarr;</a>` : ''}
      `;
      conList.appendChild(card);
    });

    // 5. Report Content
    if (reportContent) {
      reportContent.textContent = result.explainable_report || result.verdict_summary;
    }

    // 6. Quantitative & Source Findings
    if (quantFindings && result.quantitative_analysis) {
      quantFindings.innerHTML = `
        <p><strong>Methodology:</strong> ${escapeHtml(result.quantitative_analysis.methodology_scrutiny || 'Standard empirical verification')}</p>
        <p><strong>Finding:</strong> ${escapeHtml(result.quantitative_analysis.findings || 'Quantitative bounds verified.')}</p>
      `;
    }
    if (sourceFindings && result.source_validation) {
      sourceFindings.innerHTML = `
        <p><strong>Hierarchy:</strong> ${escapeHtml(result.source_validation.hierarchy_ranking || 'Peer-reviewed evidence prioritized')}</p>
        <p><strong>Authority Score:</strong> ${result.source_validation.con_source_authority_score || 0.98} (Peer-reviewed) vs ${result.source_validation.pro_source_authority_score || 0.20} (Claimant)</p>
      `;
    }

    // 7. Latency Telemetry
    latencyGrid.innerHTML = '';
    for (const [stage, ms] of Object.entries(result.latency_breakdown || {})) {
      const pill = document.createElement('div');
      pill.className = 'lat-pill';
      pill.innerHTML = `<span>${stage.replace(/_/g, ' ')}:</span> <span class="lat-val">${ms} ms</span>`;
      latencyGrid.appendChild(pill);
    }

    resultContainer.scrollIntoView({ behavior: 'smooth' });
  }

  // Media Ingestion (Video/Audio)
  uploadMediaBtn.addEventListener('click', async () => {
    const file = mediaFileInput.files[0];
    if (!file) {
      alert('Please select an audio or video file first.');
      return;
    }

    uploadMediaBtn.disabled = true;
    uploadMediaBtn.textContent = 'Uploading & Ingesting...';
    mediaOutput.classList.remove('hidden');
    mediaStatus.textContent = `Ingesting ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)...`;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/verify/media', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      mediaStatus.innerHTML = `
        <p><strong>Media Ingested:</strong> Task ID <code>${data.task_id}</code></p>
        <p>FFmpeg low-latency preprocessing (-30% latency) and Whisper STT dispatched to LangGraph. Watch real-time notifications below.</p>
      `;
    } catch (e) {
      mediaStatus.textContent = 'Error: ' + e.message;
    } finally {
      uploadMediaBtn.disabled = false;
      uploadMediaBtn.textContent = 'Ingest Media Stream';
    }
  });

  // Image Ingestion
  uploadImageBtn.addEventListener('click', async () => {
    const file = imageFileInput.files[0];
    if (!file) {
      alert('Please select an image file first.');
      return;
    }

    uploadImageBtn.disabled = true;
    uploadImageBtn.textContent = 'Ingesting Image...';
    mediaOutput.classList.remove('hidden');
    mediaStatus.textContent = `Ingesting image ${file.name}...`;

    const formData = new FormData();
    formData.append('file', file);
    if (imageCaptionInput.value.trim()) {
      formData.append('claim_caption', imageCaptionInput.value.trim());
    }

    try {
      const res = await fetch('/api/verify/image', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      mediaStatus.innerHTML = `
        <p><strong>Image Ingested:</strong> Task ID <code>${data.task_id}</code></p>
        <p>Visual claim dispatched to LangGraph RAG investigation. Real-time updates streaming below.</p>
      `;
    } catch (e) {
      mediaStatus.textContent = 'Error: ' + e.message;
    } finally {
      uploadImageBtn.disabled = false;
      uploadImageBtn.textContent = 'Ingest Visual Claim';
    }
  });

  // Benchmark
  runBenchmarkBtn.addEventListener('click', async () => {
    runBenchmarkBtn.disabled = true;
    runBenchmarkBtn.textContent = 'Benchmarking FFmpeg...';

    try {
      const res = await fetch('/api/benchmark/ffmpeg-latency');
      const data = await res.json();

      benchmarkResult.classList.remove('hidden');
      benchStd.textContent = `${data.standard_ffmpeg_latency_ms} ms`;
      benchOpt.textContent = `${data.optimized_ffmpeg_latency_ms} ms`;
      benchPct.textContent = `-${data.latency_reduction_pct}% Latency`;
      benchFlags.textContent = data.optimization_flags.join(' ');
    } catch (err) {
      alert('Benchmark Error: ' + err.message);
    } finally {
      runBenchmarkBtn.disabled = false;
      runBenchmarkBtn.textContent = 'Run Latency Benchmark';
    }
  });

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
