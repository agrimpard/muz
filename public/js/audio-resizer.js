(function(){
  const STORAGE_KEY = 'muz-audio-height';
  const BASE_HEIGHT = 300; // hauteur par défaut
  const MIN_HEIGHT = Math.max(100, BASE_HEIGHT - 500);
  const MAX_HEIGHT = BASE_HEIGHT + 500;

  function clamp(v, min, max){ return Math.min(max, Math.max(min, v)); }

  function applyHeight(h){
    const header = document.querySelector('header.audio-container');
    if (!header) return;
    header.style.height = h + 'px';
    // Notifier le ResizeObserver éventuel (visualizer) via un small trick
    try { window.dispatchEvent(new Event('resize')); } catch(_) {}
  }

  function init(){
    const header = document.querySelector('header.audio-container');
    const handle = document.getElementById('audio-resizer');
    if (!header || !handle) return;

    // Charger la préférence
    try {
      const saved = parseInt(localStorage.getItem(STORAGE_KEY));
      if (!isNaN(saved)) applyHeight(clamp(saved, MIN_HEIGHT, MAX_HEIGHT));
    } catch(_) {}

    let startY = 0;
    let startH = 0;
    let dragging = false;

    const onPointerDown = (e) => {
      dragging = true;
      startY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
      const rect = header.getBoundingClientRect();
      startH = rect.height;
      document.body.classList.add('user-select-none');
      e.preventDefault();
    };

    const onPointerMove = (e) => {
      if (!dragging) return;
      const y = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
      const delta = y - startY;
      const newH = clamp(Math.round(startH + delta), MIN_HEIGHT, MAX_HEIGHT);
      applyHeight(newH);
    };

    const onPointerUp = () => {
      if (!dragging) return;
      dragging = false;
      document.body.classList.remove('user-select-none');
      const rect = header.getBoundingClientRect();
      const finalH = clamp(Math.round(rect.height), MIN_HEIGHT, MAX_HEIGHT);
      try { localStorage.setItem(STORAGE_KEY, String(finalH)); } catch(_) {}
    };

    // Desktop
    handle.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    // Touch
    handle.addEventListener('touchstart', onPointerDown, { passive: false });
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
