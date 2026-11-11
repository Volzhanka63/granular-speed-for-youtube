(() => {
  'use strict';

  // GS comes from shared.js (loaded first, see manifest).
  let cfg = GS.normalize();
  let SPEEDS = GS.speeds(cfg);

  let want = 1; // target speed
  let last = 1; // last non-1x speed, for the toggle key
  let player; // the .html5-video-player we're attached to (watch page or Shorts)
  let bezel, bezelTimer, lastWheel = 0;
  let btn, panel, mainPage, setPage;
  let slider, display, presetsEl, presetEls = [];
  let rows = {}, editChips, addChip;
  let hint, hintDone = true; // one-time pointer to the speed button; true until storage says otherwise
  let hintObserver;
  let summary;

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
    back: () => icon('M15 18l-6-6 6-6'),
    minus: () => icon('M6 12h12'),
    plus: () => icon('M12 6v12M6 12h12'),
    close: () => icon('M7 7l10 10M17 7L7 17'),
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

  function saveSettings(s) {
    browser.storage.local.set({ settings: s }); // onChanged applies it here and in every tab
  }

  function applySettings(raw) {
    cfg = GS.normalize(raw);
    SPEEDS = GS.speeds(cfg);
    want = clamp(want);
    last = clamp(last);
    if (panel) {
      slider.max = SPEEDS.length - 1;
      buildPresets();
      renderSettings();
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
    head.append(title, roundBtn('ytsp-header-btn', 'Speed settings', ICONS.tune, () => showPage(setPage)));

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

  function buildSettingsPage() {
    setPage = el('div', 'ytsp-page');
    setPage.hidden = true;
    const head = el('div', 'ytsp-header');
    const title = el('span', 'ytsp-title', 'Speed settings');
    title.setAttribute('role', 'heading');
    title.setAttribute('aria-level', '2');
    head.append(roundBtn('ytsp-back', 'Back to playback speed', ICONS.back, () => showPage(mainPage)), title);

    const list = el('div', 'ytsp-list');
    summary = el('p', 'ytsp-summary');
    summary.setAttribute('aria-live', 'polite');
    list.append(summary);
    for (const f of GS.FIELDS) {
      const row = el('div', 'ytsp-row');
      const label = el('span', 'ytsp-row-label');
      const value = el('span', 'ytsp-row-value');
      const minus = roundBtn('ytsp-small', 'Decrease', ICONS.minus, () => saveSettings(GS.nudge(cfg, f.key, -1)));
      const plus = roundBtn('ytsp-small', 'Increase', ICONS.plus, () => saveSettings(GS.nudge(cfg, f.key, 1)));
      const stepper = el('span', 'ytsp-stepper');
      stepper.append(minus, value, plus);
      row.append(label, stepper);
      list.append(row);
      rows[f.key] = { f, label, value, minus, plus };
    }

    const presetsRow = el('div', 'ytsp-row ytsp-row-stack');
    presetsRow.append(el('span', 'ytsp-row-label', 'Presets'));
    editChips = el('div', 'ytsp-edit-chips');
    presetsRow.append(editChips);
    list.append(presetsRow);

    const reset = el('button', 'ytsp-text-btn', 'Reset to defaults');
    reset.type = 'button';
    reset.addEventListener('click', () => saveSettings(GS.normalize()));
    const foot = el('div', 'ytsp-row ytsp-row-foot');
    foot.append(reset);
    list.append(foot);

    setPage.append(head, list);
  }

  function renderSettings() {
    if (!setPage) return;
    for (const key in rows) {
      const r = rows[key];
      r.label.textContent = r.f.label(cfg, fmt);
      r.value.textContent = fmt(cfg[key]);
      r.minus.disabled = !GS.canNudge(cfg, key, -1);
      r.plus.disabled = !GS.canNudge(cfg, key, 1);
      r.minus.setAttribute('aria-label', 'Decrease ' + r.label.textContent.toLowerCase());
      r.plus.setAttribute('aria-label', 'Increase ' + r.label.textContent.toLowerCase());
    }
    editChips.textContent = '';
    for (const p of cfg.presets) {
      const chip = el('button', 'ytsp-chip ytsp-chip-edit');
      chip.type = 'button';
      chip.setAttribute('aria-label', 'Remove preset ' + fmt(p));
      chip.append(el('span', null, fmt(p)), ICONS.close());
      chip.addEventListener('click', () => saveSettings(GS.withoutPreset(cfg, p)));
      editChips.append(chip);
    }
    addChip = el('button', 'ytsp-chip ytsp-chip-add');
    addChip.type = 'button';
    addChip.append(ICONS.plus(), el('span', null, 'Add ' + fmt(want)));
    addChip.addEventListener('click', () => saveSettings(GS.withPreset(cfg, want)));
    editChips.append(addChip);
    renderAddChip();
    const list = GS.speeds(cfg);
    summary.textContent = list.length + ' speeds from ' + fmt(cfg.min) + ' to ' + fmt(cfg.max) +
      '. ' + fmt(cfg.stepLow) + ' steps up to ' + fmt(cfg.threshold) + ', then ' + fmt(cfg.stepHigh) + '.';
  }

  // Only offered when it would do something: the current speed isn't a preset yet and there's room.
  function renderAddChip() {
    if (!addChip) return;
    addChip.hidden = cfg.presets.includes(want) || cfg.presets.length >= GS.LIMITS.presets;
    addChip.lastChild.textContent = 'Add ' + fmt(want);
    addChip.setAttribute('aria-label', 'Add current speed ' + fmt(want) + ' as a preset');
  }

  function showPage(page) {
    for (const p of [mainPage, setPage]) p.hidden = p !== page;
    page.classList.remove('ytsp-enter');
    void page.offsetWidth;
    page.classList.add('ytsp-enter');
    const first = page.querySelector('button:not(:disabled)');
    if (first && panel.contains(document.activeElement)) first.focus();
    fitPanel();
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
    buildSettingsPage();
    buildPresets();
    panel.append(mainPage, setPage);
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
    renderAddChip();
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
    renderSettings();
    panel.hidden = false;
    showPage(mainPage);
    document.addEventListener('pointerdown', outside, true);
  }

  function closePanel() {
    if (!panel || panel.hidden) return;
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
