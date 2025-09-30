(function(){
  // Early log to confirm the file is actually loaded
  try { console.log('[Visualizer] script loaded'); } catch(_) {}
  const DEBUG = true;
  const log = (...args) => { if (DEBUG) console.log('[Visualizer]', ...args); };
  let audioCtx = null;
  let analyser = null;
  let sourceNode = null;
  let sourceEl = null;
  let rafId = null;
  let canvas = null;
  let ctx = null;
  let dataArray = null;
  let bufferLength = 0;
  let streamSourceNode = null;
  let silentGain = null;
  let loggedOnce = false;
  let resizeObserver = null;
  let zeroFrames = 0;

  function getAudioEl(){
    return (window.muzAudioEl && window.muzAudioEl.tagName) ? window.muzAudioEl : document.getElementById('audio-player');
  }

  function initContext(audioEl){
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      audioCtx = new AC();
    }
    if (!analyser) {
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048; // 1024 bars approx.
      analyser.smoothingTimeConstant = 0.85;
      bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
    }
    if (!sourceNode || sourceEl !== audioEl) {
      try {
        sourceNode = audioCtx.createMediaElementSource(audioEl);
        sourceEl = audioEl;
        sourceNode.connect(analyser);
        // Acheminer vers la sortie pour activer le rendu du graphe (comportement standard)
        try { analyser.connect(audioCtx.destination); } catch(_) {}
        log('MediaElementSource connecté');
      } catch(e) {
        log('createMediaElementSource error:', e);
        // Fallback via captureStream si createMediaElementSource indisponible
        if (!streamSourceNode && typeof audioEl.captureStream === 'function') {
          try {
            const mediaStream = audioEl.captureStream();
            streamSourceNode = audioCtx.createMediaStreamSource(mediaStream);
            streamSourceNode.connect(analyser);
            // Pour éviter une duplication sonore via le graphe, connecter via un gain à 0
            if (!silentGain) {
              silentGain = audioCtx.createGain();
              silentGain.gain.value = 0.0;
            }
            try { analyser.connect(silentGain); silentGain.connect(audioCtx.destination); } catch(_) {}
            log('MediaStreamSource fallback connecté');
          } catch(err) {
            console.warn('Visualizer fallback captureStream failed:', err);
          }
        }
      }
    }
    return true;
  }

  function drawBars(){
    if (!analyser || !ctx || !canvas) return;
    const cw = canvas.clientWidth || 0;
    const ch = canvas.clientHeight || 0;
    if ((cw === 0 || ch === 0) && !loggedOnce) {
      loggedOnce = true;
      log('Canvas has zero size, skip draw', { cw, ch });
    }
    analyser.getByteFrequencyData(dataArray);

    // Support HiDPI for better visibility
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.width = Math.max(1, Math.floor(cw * dpr));
  const h = canvas.height = Math.max(1, Math.floor(ch * dpr));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, cw, ch);

    const barCount = Math.min(128, bufferLength); // limiter pour lisibilité
  const barWidth = (cw / barCount);

    // Vérifier si on a un signal non nul, sinon fallback sur waveform
    let sum = 0;
    for (let i = 0; i < barCount; i++) sum += dataArray[i];
    if (sum === 0) {
      // Si le spectre reste à zéro trop longtemps, tenter captureStream fallback
      try {
        const audioEl = getAudioEl();
        zeroFrames++;
        if (zeroFrames > 15 && audioCtx && audioCtx.state === 'running' && typeof audioEl?.captureStream === 'function' && !streamSourceNode) {
          log('No spectrum — trying captureStream fallback');
          try {
            const mediaStream = audioEl.captureStream();
            streamSourceNode = audioCtx.createMediaStreamSource(mediaStream);
            streamSourceNode.connect(analyser);
            if (!silentGain) {
              silentGain = audioCtx.createGain();
              silentGain.gain.value = 0.0;
            }
            try { analyser.connect(silentGain); silentGain.connect(audioCtx.destination); } catch(_) {}
            zeroFrames = 0;
            log('captureStream fallback connected');
          } catch(err) {
            console.warn('captureStream fallback failed in draw:', err);
          }
        }
      } catch(_) { /* noop */ }
  const timeData = new Uint8Array(bufferLength);
      analyser.getByteTimeDomainData(timeData);
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(32, 201, 151, 0.95)';
      ctx.beginPath();
      const slice = cw / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = timeData[i] / 128.0; // ~1.0 au repos
        const y = (v * ch) / 2;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        x += slice;
      }
      ctx.lineTo(cw, ch / 2);
      ctx.stroke();
      rafId = requestAnimationFrame(drawBars);
      return;
    }
  // On a du signal en fréquences, reset le compteur de frames nulles
    zeroFrames = 0;

    for (let i = 0; i < barCount; i++) {
      const v = dataArray[i] / 255; // 0..1
      const barHeight = v * ch;
      const x = i * barWidth;
      const y = ch - barHeight;
      // Dégradé subtil en fonction de la hauteur
      const alpha = 0.6 * v + 0.2;
      ctx.fillStyle = `rgba(32, 201, 151, ${alpha.toFixed(3)})`; // proche var(--muz-color)
      ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
    }

    rafId = requestAnimationFrame(drawBars);
  }

  function start(){
    if (!visualizerEnabled) return;
    const audioEl = getAudioEl();
    canvas = document.getElementById('audio-visualizer');
    if (!audioEl || !canvas) return;
    log('start()', { paused: audioEl.paused, currentTime: audioEl.currentTime, ctxState: audioCtx ? audioCtx.state : 'noctx' });

    // Activer le canvas visuellement
    canvas.classList.remove('d-none');
    canvas.style.visibility = 'visible';

    // S'assurer que le contexte 2D est disponible
    if (!ctx) {
      ctx = canvas.getContext('2d');
    }

  const ok = initContext(audioEl);
    if (!ok) { log('initContext returned false'); return; }
    log('initContext ok', { hasAnalyser: !!analyser });

    // Sur certaines plateformes, il faut reprendre le contexte après user gesture
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(()=>{});
    }

    try { cancelAnimationFrame(rafId); } catch(_) {}
    drawBars();
  }

  function stop(){
    cancelAnimationFrame(rafId);
    rafId = null;
    const canvas = document.getElementById('audio-visualizer');
    if (canvas) {
      const c = canvas.getContext('2d');
      if (c) c.clearRect(0,0,canvas.width, canvas.height);
      // Cacher quand on ne joue pas
      canvas.style.visibility = 'hidden';
    }
  }

  function setup(){
    // Log the config flag before any early return
    log('setup()', { visualizerEnabled: window.visualizerEnabled });
    if (typeof window.visualizerEnabled === 'undefined') {
      log('visualizerEnabled is undefined — defaulting to false');
    }
    if (!window.visualizerEnabled) return;
  const audioEl = getAudioEl();
    if (!audioEl) return;
  // Autoriser l'analyse si jamais le serveur applique des en-têtes CORS
  try { audioEl.crossOrigin = audioEl.crossOrigin || 'anonymous'; } catch(_) {}
    // S'assurer que le canvas existe
    canvas = document.getElementById('audio-visualizer');
    if (!canvas) return;
  // Laisser caché par défaut tant que rien ne joue
  canvas.classList.remove('d-none');
  canvas.style.visibility = 'hidden';
    // Obtenir le contexte 2D
    ctx = canvas.getContext('2d');
    // Observer la taille du canvas pour relancer le rendu si nécessaire
    try {
      if ('ResizeObserver' in window && !resizeObserver) {
        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const cw = entry.target.clientWidth || 0;
            const ch = entry.target.clientHeight || 0;
            if (cw > 0 && ch > 0 && analyser && ctx) {
              if (!rafId) {
                log('ResizeObserver: resume draw');
                drawBars();
              }
            }
          }
        });
        resizeObserver.observe(canvas);
      }
    } catch(err) {
      log('ResizeObserver error', err);
    }
    // Démarrer après que le média soit prêt
    audioEl.addEventListener('canplay', function onCanPlay(){
      audioEl.removeEventListener('canplay', onCanPlay);
      start();
    });
    audioEl.addEventListener('play', function(){ log('audio event: play');
      try { if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); } catch(_) {}
      start();
    });
    audioEl.addEventListener('pause', function(){ log('audio event: pause'); stop(); });
    audioEl.addEventListener('ended', function(){ log('audio event: ended'); stop(); });
    audioEl.addEventListener('playing', function(){ log('audio event: playing'); });
    audioEl.addEventListener('timeupdate', function(){ /* heartbeat */ });

    // Reprendre le contexte audio lors d'un geste utilisateur
    const resumeCtx = function(){
      try {
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume().then(() => log('AudioContext resumed on user gesture')).catch(()=>{});
        }
      } catch(_) {}
    };
    window.addEventListener('pointerdown', resumeCtx, { once: true, capture: true });
    window.addEventListener('keydown', resumeCtx, { once: true, capture: true });

    // Si déjà en lecture, démarrer sinon rester caché
    if (!audioEl.paused && !audioEl.ended) start();
  }

  // Initialiser immédiatement si le DOM est déjà prêt, sinon attendre
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }

  // Exposer un helper de debug manuel
  try {
    window.vizStart = start;
    window.vizStop = stop;
  } catch(_) {}

  // Rebinding quand Plyr expose son élément média
  try {
    window.addEventListener('muz:audio-el-ready', function(){
      log('received muz:audio-el-ready');
      setup();
    });
  } catch(_) {}
})();
