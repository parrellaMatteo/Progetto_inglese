/* ─── AUDIO READER v4 ────────────────────────────────────────────
   Icona play su ogni paragrafo + barra controlli + responsive
──────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  const synth = window.speechSynthesis;

  const READABLE_SEL = [
    'main h2','main h3','main h4',
    'main p',
    '.article-section h3','.article-section p',
    '.timeline-item h4',  '.timeline-item p',
    '.future-card h4',    '.future-card p',
    '.text-side h3',      '.text-side p',
    '.deep-dive p',
    '.eco-tip',
    '.codec-desc',
    '.sub-page-header p',
  ].join(',');

  let nodes      = [];
  let currentIdx = -1;
  let isPlaying  = false;
  let voices     = [];

  /* ════════════════════════════════════
     BARRA FISSA IN BASSO
  ════════════════════════════════════ */
  const bar = document.createElement('div');
  bar.id = 'ar-bar';
  bar.innerHTML = `
    <button id="ar-prev" title="Precedente">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
    </button>
    <button id="ar-playpause" title="Play/Pausa">
      <svg id="ar-ico-play"  viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      <svg id="ar-ico-pause" viewBox="0 0 24 24" width="17" height="17" fill="currentColor" style="display:none"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
    </button>
    <button id="ar-next" title="Successivo">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm2.5-6 5.5 3.9V8.1L8.5 12zM16 6h2v12h-2z"/></svg>
    </button>
    <div id="ar-wave"><span></span><span></span><span></span><span></span><span></span></div>
    <span id="ar-label">Tocca 🔊 su un paragrafo per ascoltarlo</span>
    <div id="ar-speed-wrap">
      <input type="range" id="ar-speed" min="0.7" max="1.6" step="0.05" value="1.05">
      <span id="ar-speed-val">1.1×</span>
    </div>
    <button id="ar-stop" title="Stop">
      <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M6 6h12v12H6z"/></svg>
    </button>
  `;
  document.body.appendChild(bar);

  /* ════════════════════════════════════
     CSS
  ════════════════════════════════════ */
  const css = document.createElement('style');
  css.textContent = `

    /* spazio per non coprire contenuto con la barra */
    body { padding-bottom: 58px !important; }

    /* ── Paragrafo wrapper ── */
    .ar-block {
      position: relative;
    }

    /* ── Icona play inline ── */
    .ar-btn-inline {
      position: absolute;
      left: -36px;
      top: 50%;
      transform: translateY(-50%) scale(0.85);
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: rgba(229,9,20,0.15);
      border: 1px solid rgba(229,9,20,0.35);
      color: #e50914;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.18s, transform 0.18s, background 0.18s;
      flex-shrink: 0;
      z-index: 10;
      padding: 0;
    }
    .ar-block:hover .ar-btn-inline,
    .ar-block.ar-active .ar-btn-inline {
      opacity: 1;
      transform: translateY(-50%) scale(1);
    }
    .ar-btn-inline:hover {
      background: rgba(229,9,20,0.3);
    }
    .ar-btn-inline.playing {
      background: #e50914;
      color: #fff;
      border-color: #e50914;
    }

    /* ── Highlight paragrafo attivo ── */
    .ar-block.ar-active {
      background: rgba(229,9,20,0.06) !important;
      border-radius: 6px;
      outline: 1.5px solid rgba(229,9,20,0.25);
    }

    /* ── Barra in basso ── */
    #ar-bar {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(6,6,16,0.97);
      border-top: 1px solid rgba(229,9,20,0.22);
      padding: 9px 20px;
      backdrop-filter: blur(20px);
      font-family: 'DM Sans','Segoe UI',sans-serif;
      color: rgba(255,255,255,0.45);
      box-shadow: 0 -4px 24px rgba(0,0,0,0.5);
    }

    #ar-bar button {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.65);
      border-radius: 8px;
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.2s, color 0.2s, border-color 0.2s;
      -webkit-tap-highlight-color: transparent;
    }
    #ar-bar button:hover,
    #ar-bar button:active {
      background: rgba(229,9,20,0.2);
      border-color: rgba(229,9,20,0.45);
      color: #fff;
    }

    #ar-playpause {
      background: #e50914 !important;
      border-color: transparent !important;
      color: #fff !important;
      width: 38px !important;
      height: 38px !important;
      border-radius: 10px !important;
      box-shadow: 0 2px 14px rgba(229,9,20,0.4);
    }
    #ar-playpause:hover { background: #ff2535 !important; }

    #ar-label {
      flex: 1;
      font-size: 0.76rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }

    /* wave */
    #ar-wave {
      display: flex;
      align-items: flex-end;
      gap: 2px;
      height: 20px;
      flex-shrink: 0;
    }
    #ar-wave span {
      width: 3px;
      background: #e50914;
      border-radius: 3px;
      height: 4px;
    }
    #ar-wave.on span:nth-child(1){animation:arW .75s 0.00s ease-in-out infinite alternate;}
    #ar-wave.on span:nth-child(2){animation:arW .75s 0.10s ease-in-out infinite alternate;}
    #ar-wave.on span:nth-child(3){animation:arW .75s 0.20s ease-in-out infinite alternate;}
    #ar-wave.on span:nth-child(4){animation:arW .75s 0.30s ease-in-out infinite alternate;}
    #ar-wave.on span:nth-child(5){animation:arW .75s 0.40s ease-in-out infinite alternate;}
    @keyframes arW { from{height:3px} to{height:18px} }

    /* speed */
    #ar-speed-wrap {
      display: flex;
      align-items: center;
      gap: 5px;
      flex-shrink: 0;
    }
    #ar-speed {
      width: 70px;
      accent-color: #e50914;
      cursor: pointer;
    }
    #ar-speed-val {
      font-size: 0.68rem;
      color: #e50914;
      font-family: monospace;
      min-width: 30px;
    }

    /* ── RESPONSIVE ── */

    /* Tablet (≤900px): icona inline sempre visibile (no hover) */
    @media (max-width: 900px) {
      .ar-btn-inline {
        opacity: 1 !important;
        transform: translateY(-50%) scale(0.9) !important;
        left: -32px;
      }
      #ar-speed-wrap { display: none; }
    }

    /* Mobile (≤600px): icona si sposta DOPO il testo (inline) */
    @media (max-width: 600px) {
      .ar-block {
        padding-right: 36px;  /* spazio per icona a destra */
      }
      .ar-btn-inline {
        left: auto;
        right: 0;
        top: 4px;
        transform: none !important;
        opacity: 1 !important;
        width: 28px;
        height: 28px;
      }
      .ar-block:hover .ar-btn-inline,
      .ar-block.ar-active .ar-btn-inline {
        transform: none !important;
      }
      #ar-label { display: none; }
      #ar-speed-wrap { display: none; }
      #ar-bar { padding: 8px 14px; gap: 6px; }
      #ar-playpause { width: 36px !important; height: 36px !important; }
    }
  `;
  document.head.appendChild(css);

  /* ════════════════════════════════════
     REFS BARRA
  ════════════════════════════════════ */
  const btnPP    = document.getElementById('ar-playpause');
  const btnPrev  = document.getElementById('ar-prev');
  const btnNext  = document.getElementById('ar-next');
  const btnStop  = document.getElementById('ar-stop');
  const speedEl  = document.getElementById('ar-speed');
  const speedVal = document.getElementById('ar-speed-val');
  const labelEl  = document.getElementById('ar-label');
  const waveEl   = document.getElementById('ar-wave');
  const icoPlay  = document.getElementById('ar-ico-play');
  const icoPause = document.getElementById('ar-ico-pause');

  /* ════════════════════════════════════
     VOCI
  ════════════════════════════════════ */
  function loadVoices() { voices = synth.getVoices(); }
  loadVoices();
  if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = loadVoices;

  function pickVoice(lang) {
    const tries = [
      v => v.name.includes('Google') && v.lang.startsWith(lang),
      v => v.name.includes('Microsoft') && v.lang.startsWith(lang),
      v => v.lang.startsWith(lang),
      v => v.lang.startsWith('en'),
    ];
    for (const fn of tries) {
      const v = voices.find(fn);
      if (v) return v;
    }
    return null;
  }

  /* ════════════════════════════════════
     COSTRUZIONE NODI
  ════════════════════════════════════ */
  function collectNodes() {
    const raw = [...document.querySelectorAll(READABLE_SEL)].filter(el => {
      const t = el.innerText.trim();
      return t.length > 8
        && !el.closest('nav')
        && !el.closest('footer')
        && !el.closest('#ar-bar')
        && !el.closest('.quiz-btn')
        && !el.closest('.btn')
        && !el.closest('.ar-btn-inline');
    });

    nodes = [];
    raw.forEach((el, i) => {
      /* wrap in .ar-block se non lo è già */
      if (!el.classList.contains('ar-block')) {
        el.classList.add('ar-block');
      }
      el.dataset.arIdx = i;
      nodes.push(el);

      /* crea icona inline */
      const btn = document.createElement('button');
      btn.className   = 'ar-btn-inline';
      btn.dataset.idx = i;
      btn.title       = 'Leggi questo paragrafo';
      btn.setAttribute('aria-label', 'Leggi ad alta voce');
      btn.innerHTML   = svgPlay();
      btn.addEventListener('click', e => {
        e.stopPropagation();
        speakNode(parseInt(btn.dataset.idx));
      });
      el.appendChild(btn);
    });
  }

  function svgPlay(small) {
    const s = small ? 11 : 12;
    return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
  }
  function svgPause() {
    return `<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
  }

  /* ════════════════════════════════════
     LETTURA
  ════════════════════════════════════ */
  function speakNode(idx) {
    if (idx < 0 || idx >= nodes.length) { stopAll(); return; }

    synth.cancel();
    clearHighlight();

    currentIdx = idx;
    const el   = nodes[idx];

    /* evidenzia */
    el.classList.add('ar-active');
    const inlineBtn = el.querySelector('.ar-btn-inline');
    if (inlineBtn) { inlineBtn.classList.add('playing'); inlineBtn.innerHTML = svgPause(); }

    /* scroll */
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    /* testo pulito */
    /* clona el senza l'icona inline per non leggere "undefined" */
    const clone = el.cloneNode(true);
    clone.querySelectorAll('.ar-btn-inline').forEach(b => b.remove());
    const text = clone.innerText.replace(/\s+/g, ' ').trim();
    if (!text || text.split(' ').length < 2) { speakNode(idx + 1); return; }

    /* label barra */
    labelEl.textContent = text.length > 70 ? text.slice(0, 70) + '…' : text;

    /* utterance */
    const u  = new SpeechSynthesisUtterance(text);
    u.rate   = parseFloat(speedEl.value);
    u.pitch  = 1.05;
    u.lang   = document.documentElement.lang || 'en-US';
    const v  = pickVoice(u.lang.slice(0, 2));
    if (v) u.voice = v;

    u.onstart = () => { isPlaying = true; setBarUI(true); };
    u.onend   = () => {
      resetInlineBtn(el);
      el.classList.remove('ar-active');
      if (isPlaying) speakNode(idx + 1);
    };
    u.onerror = e => {
      if (e.error !== 'interrupted') {
        resetInlineBtn(el);
        speakNode(idx + 1);
      }
    };

    synth.speak(u);
    isPlaying = true;
    setBarUI(true);
  }

  function resetInlineBtn(el) {
    const b = el.querySelector('.ar-btn-inline');
    if (b) { b.classList.remove('playing'); b.innerHTML = svgPlay(); }
  }

  function clearHighlight() {
    nodes.forEach(el => {
      el.classList.remove('ar-active');
      resetInlineBtn(el);
    });
  }

  function stopAll() {
    synth.cancel();
    isPlaying  = false;
    currentIdx = -1;
    clearHighlight();
    setBarUI(false);
    labelEl.textContent = 'Tocca 🔊 su un paragrafo per ascoltarlo';
  }

  function setBarUI(playing) {
    icoPlay.style.display  = playing ? 'none'  : 'block';
    icoPause.style.display = playing ? 'block' : 'none';
    waveEl.classList.toggle('on', playing);
  }

  /* ════════════════════════════════════
     CONTROLLI BARRA
  ════════════════════════════════════ */
  btnPP.addEventListener('click', () => {
    if (synth.paused) {
      synth.resume(); isPlaying = true; setBarUI(true);
    } else if (isPlaying && synth.speaking) {
      synth.pause(); isPlaying = false; setBarUI(false);
    } else {
      speakNode(currentIdx >= 0 ? currentIdx : 0);
    }
  });

  btnPrev.addEventListener('click', () => speakNode(Math.max(0, currentIdx - 1)));
  btnNext.addEventListener('click', () => speakNode(currentIdx < nodes.length - 1 ? currentIdx + 1 : currentIdx));
  btnStop.addEventListener('click',  stopAll);

  speedEl.addEventListener('input', () => {
    speedVal.textContent = parseFloat(speedEl.value).toFixed(1) + '×';
    if (isPlaying && currentIdx >= 0) speakNode(currentIdx);
  });

  window.addEventListener('beforeunload', () => synth.cancel());

  /* ════════════════════════════════════
     INIT
  ════════════════════════════════════ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', collectNodes);
  } else {
    collectNodes();
  }

})();