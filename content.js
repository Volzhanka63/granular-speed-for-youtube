(() => {
  'use strict';

  // GS comes from shared.js (loaded first, see manifest).
  let cfg = GS.normalize();
  let SPEEDS = GS.speeds(cfg);

  let want = 1; // target speed
  let last = 1; // last non-1x speed, for the toggle key
  let player; // the .html5-video-player we're attached to (watch page or Shorts)
  let bezel, bezelTimer, lastWheel = 0;
  let btn, panel, mainPage;
  let slider, display, presetsEl, presetEls = [];
  let hint, hintDone = true; // one-time pointer to the speed button; true until storage says otherwise
  let hintObserver;
  let overlay, frame; // full settings, shown over the page

  const clamp = (x) => GS.r2(Math.min(cfg.max, Math.max(cfg.min, x)));
  const fmt = (x) => x + 'x'; // YouTube's own convention inside the player ("1.5x")
  const visible = (e) => e && e.isConnected && e.offsetWidth > 0;

  // Only the real players: the watch page (also in miniplayer/theater/fullscreen)
  // and Shorts. Hover previews on the feed play in #inline-preview-player and are left alone.
  const playerOf = (v) => {
    const p = v.closest('.html5-video-player');
    return p && (p.id === 'movie_player' || p.id === 'shorts-player') ? p : null;
  };

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
    for (const v of document.querySelectorAll('#movie_player video, #shorts-player video')) apply(v);
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // Stroke icons built with DOM calls (YouTube blocks innerHTML via Trusted Types).
  function icon(d, circles = []) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    const attrs = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };
    for (const k in attrs) svg.setAttribute(k, attrs[k]);
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
  const ICONS = {
    tune: () => icon('M4 7h9M19 7h1M4 17h3M13 17h7', [[16, 7, 2.5], [10, 17, 2.5]]),
    minus: () => icon('M6 12h12'),
    plus: () => icon('M12 6v12M6 12h12'),
  };

  // Speed bubble at the top centre of the video, where YouTube shows its own.
  function show() {
    const host = (visible(player) && player) || document.getElementById('movie_player') || document.body;
    if (!bezel) bezel = el('div', 'ytsp-bezel');
    if (bezel.parentNode !== host) host.appendChild(bezel);
    bezel.textContent = fmt(want);
    bezel.hidden = false;
    clearTimeout(bezelTimer);
    bezelTimer = setTimeout(() => { bezel.hidden = true; }, 700);
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

  // ---- Player UI ----

  function onWheel(e) {
    e.preventDefault();
    e.stopPropagation();
    const now = Date.now();
    if (now - lastWheel < 80) return; // trackpads fire many events per gesture
    lastWheel = now;
    dismissHint();
    set(step(e.deltaY < 0 ? 1 : -1), true);
  }

  // Keep clicks and keys on our UI away from the player (pause, seek, fullscreen).
  function stopAll(node) {
    for (const ev of ['click', 'dblclick', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'keydown']) {
      node.addEventListener(ev, (e) => e.stopPropagation());
    }
  }

  function roundBtn(cls, label, iconFn, onClick) {
    const b = el('button', 'ytsp-round ' + cls);
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.title = label;
    b.append(iconFn());
    b.addEventListener('click', onClick);
    return b;
  }

  function buildPresets() {
    presetsEl.textContent = '';
    presetEls = cfg.presets.map((p) => {
      const b = el('button', 'ytsp-chip', fmt(p));
      b.type = 'button';
      b.addEventListener('click', () => set(p, true));
      presetsEl.append(b);
      return b;
    });
    const n = presetEls.length;
    presetsEl.hidden = n === 0;
    presetsEl.style.setProperty('--cols', n <= 6 ? n : Math.ceil(n / 2)); // one row, or two even rows
  }

  function buildMainPage() {
    mainPage = el('div', 'ytsp-page');
    const head = el('div', 'ytsp-header');
    const title = el('span', 'ytsp-title', 'Playback speed');
    title.setAttribute('role', 'heading');
    title.setAttribute('aria-level', '2');
    head.append(title, roundBtn('ytsp-header-btn', 'All settings', ICONS.tune, openSettings));

    const body = el('div', 'ytsp-body');
    display = el('div', 'ytsp-display');
    display.setAttribute('aria-live', 'polite');

    slider = el('input', 'ytsp-slider');
    slider.type = 'range';
    slider.min = 0;
    slider.max = SPEEDS.length - 1;
    slider.step = 1;
    slider.setAttribute('aria-label', 'Playback speed');
    slider.addEventListener('input', () => set(SPEEDS[slider.value], true));
    const row = el('div', 'ytsp-slider-row');
    row.append(
      roundBtn('', 'Slower', ICONS.minus, () => set(step(-1), true)),
      slider,
      roundBtn('', 'Faster', ICONS.plus, () => set(step(1), true)),
    );

    presetsEl = el('div', 'ytsp-presets');
    body.append(display, row, presetsEl);
    mainPage.append(head, body);
  }

  function buildUI() {
    btn = el('button', 'ytsp-btn');
    btn.type = 'button';
    btn.title = 'Playback speed (scroll to adjust)';
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.addEventListener('click', () => {
      if (panel.hidden) openPanel(); else closePanel();
    });
    btn.addEventListener('wheel', onWheel, { passive: false });
    stopAll(btn);

    panel = el('div', 'ytsp-panel');
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Playback speed');
    buildMainPage();
    buildPresets();
    panel.append(mainPage);
    mainPage.addEventListener('wheel', onWheel, { passive: false });
    stopAll(panel);
  }

  // Where the button goes: the watch player's control bar, or Shorts' own
  // top-right group (next to CC). Both hide with the player's controls.
  function controlsFor(p) {
    if (p.id === 'shorts-player') {
      const box = p.closest('#player-container') || p.closest('ytd-reel-video-renderer');
      return box && box.querySelector('ytd-shorts-player-controls #right-controls');
    }
    return p.querySelector('.ytp-right-controls');
  }

  // Shorts builds its control group on first hover. Until then, check again
  // on the next hover over that Short (one listener, removed after it fires).
  const waiting = new WeakSet();
  function waitForControls(p) {
    const box = p.closest('#player-container') || p.parentElement;
    if (!box || waiting.has(box)) return;
    waiting.add(box);
    box.addEventListener('pointerover', () => { waiting.delete(box); mount(p); }, { once: true });
  }

  function mount(p) {
    if (!visible(p)) return; // e.g. the hidden watch player while on Shorts
    const controls = controlsFor(p);
    if (!controls) {
      if (p.id === 'shorts-player') waitForControls(p);
      return;
    }
    if (!btn) buildUI();
    if (btn.parentNode !== controls) controls.prepend(btn);
    const shorts = p.id === 'shorts-player';
    btn.classList.toggle('ytp-button', !shorts);
    btn.classList.toggle('ytsp-btn-shorts', shorts);
    panel.classList.toggle('ytsp-panel-shorts', shorts);
    if (panel.parentNode !== p) {
      closePanel();
      p.append(panel);
    }
    player = p;
    if (hint && hint.parentNode !== p) p.append(hint);
    render();
    maybeHint();
  }

  function ensureUI() {
    if (visible(btn)) return;
    for (const p of document.querySelectorAll('#shorts-player, #movie_player')) {
      if (visible(p)) { mount(p); if (visible(btn)) return; }
    }
  }

  // ---- First-run hint ----

  function positionHint() {
    if (!hint || !visible(btn)) return;
    const p = player.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    hint.style.bottom = (p.bottom - b.top + 12) + 'px';
    // the caret is 12px wide, so its centre sits 6px in from its right offset
    hint.style.setProperty('--arrow', Math.max(10, p.right - 12 - (b.left + b.width / 2) - 6) + 'px');
  }

  function maybeHint() {
    if (hintDone || hint || !visible(btn) || btn.classList.contains('ytsp-btn-shorts')) return;
    hint = el('div', 'ytsp-hint');
    hint.setAttribute('role', 'note');
    const got = el('button', 'ytsp-hint-btn', 'Got it');
    got.type = 'button';
    got.addEventListener('click', dismissHint);
    const keys = el('p', 'ytsp-hint-keys');
    const kbd = (t) => el('kbd', null, t);
    keys.append(kbd('Shift'), ' + ', kbd('.'), ' faster   ', kbd('Shift'), ' + ', kbd(','), ' slower');
    hint.append(
      el('strong', null, 'Your speed controls'),
      el('p', null, 'Click this button for a slider and presets, or scroll over it. Anywhere on YouTube:'),
      keys,
      got,
    );
    stopAll(hint);
    player.append(hint);
    positionHint();
    // YouTube lays out its control bar after we mount; re-aim when it settles or resizes
    hintObserver = new ResizeObserver(positionHint);
    hintObserver.observe(btn.parentNode);
    hintObserver.observe(player);
    requestAnimationFrame(positionHint);
  }

  function dismissHint() {
    if (hintDone) return;
    hintDone = true;
    if (hint) hint.remove();
    if (hintObserver) hintObserver.disconnect();
    hint = null;
    browser.storage.local.set({ hintDone: true });
  }

  function render() {
    if (!btn) return;
    btn.textContent = fmt(want);
    display.textContent = fmt(want);
    slider.value = nearest(want);
    slider.setAttribute('aria-valuetext', fmt(want));
    presetEls.forEach((b, i) => {
      const on = cfg.presets[i] === want;
      b.classList.toggle('ytsp-on', on);
      b.setAttribute('aria-pressed', on);
    });
    positionHint();
  }

  function outside(e) {
    if (!panel.contains(e.target) && !btn.contains(e.target)) closePanel();
  }

  // Anchor like YouTube's settings menu: 12px from the player's right edge,
  // above the control bar (watch page) or below the top controls (Shorts).
  function fitPanel() {
    if (panel.hidden) return;
    const p = player.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    panel.style.right = '12px';
    panel.style.left = '';
    let room;
    if (panel.classList.contains('ytsp-panel-shorts')) {
      panel.style.top = (b.bottom - p.top + 12) + 'px';
      panel.style.bottom = '';
      room = p.bottom - b.bottom - 24;
    } else {
      panel.style.bottom = (p.bottom - b.top + 12) + 'px';
      panel.style.top = '';
      room = b.top - p.top - 24;
    }
    panel.style.maxHeight = Math.max(160, room) + 'px';
  }

  function openPanel() {
    dismissHint();
    panel.hidden = false;
    fitPanel();
    document.addEventListener('pointerdown', outside, true);
  }

  function closePanel() {
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    document.removeEventListener('pointerdown', outside, true);
  }

  // ---- Full settings, over the page ----

  // The same page as the toolbar popup, in an iframe. It goes inside the
  // fullscreen element when there is one, so it also works in fullscreen.
  const EXT_ORIGIN = new URL(browser.runtime.getURL('')).origin;

  function openSettings() {
    closePanel();
    if (!overlay) {
      overlay = el('div', 'ytsp-overlay');
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-label', 'Granular Speed settings');
      const box = el('div', 'ytsp-dialog');
      frame = el('iframe', 'ytsp-frame');
      frame.title = 'Granular Speed settings';
      box.append(frame);
      overlay.append(box);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSettings(); });
      stopAll(overlay);
    }
    frame.src = browser.runtime.getURL('options.html?view=overlay');
    (document.fullscreenElement || document.body).append(overlay);
    overlay.hidden = false;
    frame.focus();
  }

  function closeSettings() {
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    frame.src = 'about:blank';
    if (btn) btn.focus();
  }

  window.addEventListener('message', (e) => {
    if (!frame || e.source !== frame.contentWindow || e.origin !== EXT_ORIGIN) return;
    const d = e.data || {};
    if (d.ytsp === 'close') closeSettings();
    if (d.ytsp === 'size' && Number.isFinite(d.h)) frame.style.height = Math.min(d.h, innerHeight - 48) + 'px';
  });

  // ---- Keep the speed applied ----

  // YouTube resets the rate on every new video/ad. Media events don't bubble,
  // but capture-phase listeners on document still see them.
  for (const ev of ['loadeddata', 'playing', 'ratechange']) {
    document.addEventListener(ev, (e) => {
      const v = e.target;
      if (v.localName !== 'video') return;
      const p = playerOf(v);
      if (!p) return; // hover previews and other embedded players keep their own speed
      apply(v);
      if (ev === 'ratechange') { ensureUI(); return; }
      if (p !== player || !visible(btn)) mount(p); else ensureUI();
    }, true);
  }

  // ---- Hotkeys ----

  // Capture on window runs before YouTube's own key handlers.
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.code === 'Escape' && overlay && !overlay.hidden) { closeSettings(); return; }
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
    dismissHint();
    set(next);
  }, true);

  // ---- Startup ----

  browser.storage.local.get(['want', 'last', 'settings', 'hintDone']).then((s) => {
    if (typeof s.want === 'number') want = s.want;
    if (typeof s.last === 'number') last = s.last;
    hintDone = s.hintDone === true;
    applySettings(s.settings); // also clamps want/last and applies
    ensureUI();
    maybeHint();
  });

  // Keep tabs in sync and pick up changes from any settings view.
  browser.storage.onChanged.addListener((c) => {
    if (c.settings) applySettings(c.settings.newValue);
    if (c.want) { want = clamp(c.want.newValue); applyAll(); render(); }
    if (c.last) last = clamp(c.last.newValue);
  });
})();
