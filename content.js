(() => {
  'use strict';

  // GS comes from shared.js (loaded first, see manifest).
  let cfg = GS.normalize();
  let SPEEDS = GS.speeds(cfg);

  let want = 1; // target speed
  let last = 1; // last non-1x speed, for the toggle key
  let badge, hideTimer, lastWheel = 0;
  let btn, btnLabel, panel, slider, valueEl, presetsEl, presetEls = [];
  let player; // the .html5-video-player that holds our button (watch page or Shorts)
  let pulseTimer;

  const clamp = (x) => GS.r2(Math.min(cfg.max, Math.max(cfg.min, x)));
  const fmt = (x) => x + '×';

  function nearest(x) {
    let best = 0;
    SPEEDS.forEach((s, i) => { if (Math.abs(s - x) < Math.abs(SPEEDS[best] - x)) best = i; });
    return best;
  }

  function step(dir) {
    if (dir > 0) return SPEEDS.find((s) => s > want + 1e-9) ?? cfg.max;
    return SPEEDS.findLast((s) => s < want - 1e-9) ?? cfg.min;
  }

  function apply(v) {
    if (v.playbackRate !== want) v.playbackRate = want;
  }

  function applyAll() {
    for (const v of document.querySelectorAll('video')) apply(v);
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  const visible = (e) => e && e.isConnected && e.offsetWidth > 0;
  const isFloat = () => btn && btn.classList.contains('ytsp-float');

  // Feedback for hotkeys. On Shorts the speed pill is always on screen, so it
  // pulses; elsewhere a badge flashes in the corner of the player.
  function show() {
    if (isFloat() && visible(btn)) {
      btn.classList.remove('ytsp-pulse');
      void btn.offsetWidth; // restart the animation
      btn.classList.add('ytsp-pulse');
      clearTimeout(pulseTimer);
      pulseTimer = setTimeout(() => btn.classList.remove('ytsp-pulse'), 400);
      return;
    }
    const host = (visible(player) && player) || document.getElementById('movie_player') || document.body;
    if (!badge) badge = el('div', 'ytsp-badge');
    if (badge.parentNode !== host) host.appendChild(badge);
    badge.textContent = fmt(want);
    badge.hidden = false;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { badge.hidden = true; }, 800);
  }

  function set(v, fromUI) {
    want = clamp(v);
    if (want !== 1) last = want;
    applyAll();
    render();
    if (!fromUI) show();
    browser.storage.local.set({ want, last });
  }

  function applySettings(raw) {
    cfg = GS.normalize(raw);
    SPEEDS = GS.speeds(cfg);
    want = clamp(want);
    last = clamp(last);
    if (panel) {
      slider.max = SPEEDS.length - 1;
      buildPresets();
    }
    applyAll();
    render();
  }

  // ---- Player UI: button in the control bar + panel ----

  function onWheel(e) {
    e.preventDefault();
    e.stopPropagation();
    const now = Date.now();
    if (now - lastWheel < 80) return; // trackpads fire many events per gesture
    lastWheel = now;
    set(step(e.deltaY < 0 ? 1 : -1), true);
  }

  // Small stroke icons, built with DOM calls (YouTube blocks innerHTML via Trusted Types).
  function icon(size, d, circles, cls) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    const attrs = { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round' };
    for (const k in attrs) svg.setAttribute(k, attrs[k]);
    if (cls) svg.setAttribute('class', cls);
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
    for (const [cx, cy, r] of circles) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', cx);
      c.setAttribute('cy', cy);
      c.setAttribute('r', r);
      svg.append(c);
    }
    return svg;
  }
  const tuneIcon = () => icon(18, 'M4 7h9M19 7h1M4 17h3M13 17h7', [[16, 7, 2.5], [10, 17, 2.5]]);
  const gaugeIcon = () => icon(16, 'M5.64 18.36A9 9 0 1 1 18.36 18.36M12 13l4-4', [], 'ytsp-gauge');

  function buildPresets() {
    presetsEl.textContent = '';
    presetEls = cfg.presets.map((p) => {
      const b = el('button', 'ytsp-preset', fmt(p));
      b.addEventListener('click', () => set(p, true));
      presetsEl.append(b);
      return b;
    });
    const n = presetEls.length;
    presetsEl.hidden = n === 0;
    presetsEl.style.setProperty('--cols', n <= 6 ? n : Math.ceil(n / 2)); // one row, or two even rows
  }

  // Keep clicks and keys on our UI away from the player (pause, seek, fullscreen).
  const stopAll = (node) => {
    for (const ev of ['click', 'dblclick', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'keydown']) {
      node.addEventListener(ev, (e) => e.stopPropagation());
    }
  };

  function buildUI() {
    btn = el('button', 'ytsp-btn');
    btn.title = 'Playback speed (scroll to adjust)';
    btnLabel = el('span');
    btn.append(gaugeIcon(), btnLabel); // the gauge only shows on the Shorts pill
    btn.addEventListener('click', () => {
      if (panel.hidden) openPanel(); else closePanel();
    });
    btn.addEventListener('wheel', onWheel, { passive: false });
    stopAll(btn);

    panel = el('div', 'ytsp-panel');
    panel.hidden = true;

    valueEl = el('span', 'ytsp-value');
    const gear = el('button', 'ytsp-gear');
    gear.title = 'Speed settings';
    gear.append(tuneIcon());
    gear.addEventListener('click', () => {
      closePanel();
      browser.runtime.sendMessage('open-options');
    });
    const head = el('div', 'ytsp-head');
    head.append(el('span', null, 'Speed'), valueEl, gear);

    const minus = el('button', 'ytsp-step', '−');
    const plus = el('button', 'ytsp-step', '+');
    minus.title = 'Slower';
    plus.title = 'Faster';
    minus.addEventListener('click', () => set(step(-1), true));
    plus.addEventListener('click', () => set(step(1), true));

    slider = el('input', 'ytsp-slider');
    slider.type = 'range';
    slider.min = 0;
    slider.max = SPEEDS.length - 1;
    slider.step = 1;
    slider.addEventListener('input', () => set(SPEEDS[slider.value], true));

    const row = el('div', 'ytsp-row');
    row.append(minus, slider, plus);

    presetsEl = el('div', 'ytsp-presets');
    buildPresets();

    panel.append(head, row, presetsEl);
    panel.addEventListener('wheel', onWheel, { passive: false });
    stopAll(panel);
  }

  // Put the button into a player. The watch page has a control bar; Shorts
  // doesn't, so there the button floats as a pill at the top of the video.
  function mount(p) {
    if (!visible(p)) return; // e.g. the hidden watch player while on Shorts
    if (!btn) buildUI();
    const controls = p.id === 'shorts-player' ? null : p.querySelector('.ytp-right-controls');
    if (controls) {
      if (btn.parentNode !== controls) controls.prepend(btn);
    } else if (btn.parentNode !== p) {
      p.append(btn);
    }
    btn.classList.toggle('ytp-button', !!controls);
    btn.classList.toggle('ytsp-float', !controls);
    panel.classList.toggle('ytsp-float', !controls);
    if (panel.parentNode !== p) {
      closePanel();
      p.append(panel);
    }
    player = p;
    render();
  }

  function ensureUI() {
    if (visible(btn)) return;
    for (const p of document.querySelectorAll('#shorts-player, #movie_player')) {
      if (visible(p)) return mount(p);
    }
  }

  function render() {
    if (!btn) return;
    btnLabel.textContent = fmt(want);
    valueEl.textContent = fmt(want);
    slider.value = nearest(want);
    presetEls.forEach((b, i) => b.classList.toggle('ytsp-on', cfg.presets[i] === want));
  }

  function outside(e) {
    if (!panel.contains(e.target) && !btn.contains(e.target)) closePanel();
  }

  function openPanel() {
    panel.hidden = false;
    const p = panel.parentNode.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    const w = panel.offsetWidth;
    const left = Math.min(p.width - w - 12, Math.max(12, b.left - p.left + b.width / 2 - w / 2));
    panel.style.left = left + 'px';
    if (isFloat()) { // pill sits at the top: open below it
      panel.style.top = (b.bottom - p.top + 16) + 'px'; // clear Shorts' own top buttons
      panel.style.bottom = '';
    } else {
      panel.style.bottom = (p.bottom - b.top + 8) + 'px';
      panel.style.top = '';
    }
    document.addEventListener('pointerdown', outside, true);
  }

  function closePanel() {
    panel.hidden = true;
    document.removeEventListener('pointerdown', outside, true);
  }

  // ---- Keep the speed applied ----

  // YouTube resets the rate on every new video/ad. Media events don't bubble,
  // but capture-phase listeners on document still see them.
  for (const ev of ['loadeddata', 'playing', 'ratechange']) {
    document.addEventListener(ev, (e) => {
      const v = e.target;
      if (v.localName !== 'video') return;
      apply(v);
      if (ev === 'ratechange') { ensureUI(); return; }
      const p = v.closest('.html5-video-player');
      if (p && p !== player) mount(p); else ensureUI();
    }, true);
  }

  // ---- Hotkeys ----

  // Capture on window runs before YouTube's own key handlers.
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.code === 'Escape' && panel && !panel.hidden) closePanel();
    const t = e.composedPath()[0]; // real target, even inside shadow DOM
    const inPanel = panel && t && t.nodeType === 1 && panel.contains(t);
    if (!inPanel && t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;

    let next;
    if (e.shiftKey && e.code === 'Period') next = step(1);
    else if (e.shiftKey && e.code === 'Comma') next = step(-1);
    else if (!e.shiftKey && e.code === 'KeyR') next = want === 1 ? last : 1;
    else return;

    e.preventDefault();
    e.stopImmediatePropagation();
    set(next);
  }, true);

  // ---- Startup ----

  browser.storage.local.get(['want', 'last', 'settings']).then((s) => {
    if (typeof s.want === 'number') want = s.want;
    if (typeof s.last === 'number') last = s.last;
    applySettings(s.settings); // also clamps want/last and applies
    ensureUI();
  });

  // Keep tabs in sync and pick up changes from the settings page.
  browser.storage.onChanged.addListener((c) => {
    if (c.settings) applySettings(c.settings.newValue);
    if (c.want) { want = clamp(c.want.newValue); applyAll(); render(); }
    if (c.last) last = clamp(c.last.newValue);
  });
})();
