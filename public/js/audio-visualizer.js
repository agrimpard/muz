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
  let hasShown = false; // n'afficher que quand il y a un vrai mouvement
  let isFrozen = false; // gelé sur pause
  let motionFrames = 0; // nombre de frames consécutives avec mouvement
  const REQUIRED_MOTION_FRAMES = 4; // frames consécutives avant d'afficher

  function isActivePlayback(audioEl){
    try {
      // Doit être en lecture (non en pause), non terminé, et disposer d'assez de données
      const HAVE_FUTURE_DATA = 3; // HTMLMediaElement.HAVE_FUTURE_DATA
      return !!audioEl && !audioEl.paused && !audioEl.ended && audioEl.readyState >= HAVE_FUTURE_DATA && audioEl.currentTime > 0.02;
    } catch(_) {
      return false;
    }
  }

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
    const audioEl = getAudioEl();
    // Si pas de lecture active (chargement/buffering), masquer et attendre
    if (!isFrozen && !isActivePlayback(audioEl)) {
      motionFrames = 0;
      hasShown = false;
      canvas.style.visibility = 'hidden';
      rafId = requestAnimationFrame(drawBars);
      return;
    }
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

    // Vérifier s'il y a un mouvement réel
  let sum = 0, maxFreq = 0;
    for (let i = 0; i < barCount; i++) { const v = dataArray[i]; sum += v; if (v > maxFreq) maxFreq = v; }
  const freqHasMotion = (sum > 0 && maxFreq > 14); // seuil relevé pour éviter les faux positifs
    if (!freqHasMotion) {
      // Si le spectre reste à zéro trop longtemps, tenter captureStream fallback
      try {
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

      // Waveform fallback et détection de mouvement minimal
      const timeData = new Uint8Array(bufferLength);
      analyser.getByteTimeDomainData(timeData);
  let maxAbsDelta = 0;
      for (let i = 0; i < bufferLength; i++) {
        const d = Math.abs(timeData[i] - 128);
        if (d > maxAbsDelta) maxAbsDelta = d;
      }
      const waveHasMotion = maxAbsDelta > 10; // seuil relevé pour éviter la ligne horizontale

      // Accumuler des frames de mouvement avant d'afficher
      if (waveHasMotion) motionFrames++; else motionFrames = 0;
      if (!hasShown && motionFrames >= REQUIRED_MOTION_FRAMES) {
        canvas.style.visibility = 'visible';
        hasShown = true;
      }

      // Ne dessiner le fallback qu'après apparition officielle; sinon, rien (évite toute ligne pendant le chargement)
      if (hasShown) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(32, 201, 151, 0.6)';
        ctx.beginPath();
        const y = Math.max(1, ch - 2);
        ctx.moveTo(0, y);
        ctx.lineTo(cw, y);
        ctx.stroke();
      }

      rafId = requestAnimationFrame(drawBars);
      return;
    }
    // On a du signal en fréquences, reset le compteur de frames nulles
    zeroFrames = 0;

    // Accumuler des frames de mouvement avant d'afficher (fréquences)
    motionFrames++;
    if (!hasShown && motionFrames >= REQUIRED_MOTION_FRAMES) {
      canvas.style.visibility = 'visible';
      hasShown = true;
    }

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

    // Préparer le canvas (ne pas l'afficher tant qu'il n'y a pas de mouvement)
    canvas.classList.remove('d-none');
    if (hasShown) canvas.style.visibility = 'visible'; else canvas.style.visibility = 'hidden';
    isFrozen = false;

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

  function freeze(){
    // Stoppe l'animation mais laisse le dernier état affiché
    try { cancelAnimationFrame(rafId); } catch(_) {}
    rafId = null;
    isFrozen = true;
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
    hasShown = false;
    isFrozen = false;
    motionFrames = 0;
  }

  function prepareTrack(){
    // Appelé lors d'un changement de piste: cacher jusqu'au prochain vrai mouvement
    try { cancelAnimationFrame(rafId); } catch(_) {}
    rafId = null;
    hasShown = false;
    isFrozen = false;
    motionFrames = 0;
    const canvas = document.getElementById('audio-visualizer');
    if (canvas) {
      // Ne pas effacer l'image ici pour éviter un flash; on la cache simplement
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
      // Nouvelle source prête: réinitialiser l'affichage et attendre le mouvement
      hasShown = false;
      motionFrames = 0;
      if (!canvas) canvas = document.getElementById('audio-visualizer');
      if (canvas) canvas.style.visibility = 'hidden';
      start();
    });
    audioEl.addEventListener('play', function(){ log('audio event: play');
      try { if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); } catch(_) {}
      start();
    });
  audioEl.addEventListener('pause', function(){ log('audio event: pause'); freeze(); });
    audioEl.addEventListener('ended', function(){ log('audio event: ended'); stop(); });
    audioEl.addEventListener('playing', function(){ log('audio event: playing'); });
    // Pendant buffering/seek, masquer et attendre un vrai mouvement
    const onBuffering = function(ev){ log('audio event:', ev.type);
      hasShown = false; motionFrames = 0; zeroFrames = 0; isFrozen = false;
      if (!canvas) canvas = document.getElementById('audio-visualizer');
      if (canvas) canvas.style.visibility = 'hidden';
    };
    ['waiting','stalled','seeking','loadeddata','loadstart','readystatechange'].forEach(evt=>{
      try { audioEl.addEventListener(evt, onBuffering); } catch(_) {}
    });
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
    window.vizFreeze = freeze;
    window.vizPrepareTrack = prepareTrack;
  } catch(_) {}

  // Rebinding quand Plyr expose son élément média
  try {
    window.addEventListener('muz:audio-el-ready', function(){
      log('received muz:audio-el-ready');
      setup();
    });
  } catch(_) {}
})();
