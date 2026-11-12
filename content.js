(() => {
  'use strict';

  // GS comes from shared.js (loaded first, see manifest).
  let cfg = GS.normalize();
  let SPEEDS = GS.speeds(cfg);
  let shownPresets = GS.activePresets(cfg);

  let want = 1; // target speed
  let last = 1; // speed R returns to from 1x
  let player; // the .html5-video-player we're attached to (watch page or Shorts)
  let bezel, bezelTimer, lastWheel = 0, live;
  let btn, panel, mainPage;
  let slider, display, presetsEl, slowerBtn, fasterBtn, presetEls = [];
  let hint, hintDone = true; // one-time pointer to the speed button; true until storage says otherwise
  let hintObserver;
  let overlay, frame; // full settings, shown over the page
  let pos = 'corner'; // VARIANT: where full settings open ('corner' or 'button'), until one is picked

  // Press-and-hold on the video: YouTube plays at 2x while held; we play at
  // twice your speed instead (capped at Fastest), without saving it.
  let pressing = 0; // time of the current press on the video, 0 when none
  let holding = false;
  let holdTimer;

  const clamp = (x) => GS.r2(Math.min(cfg.max, Math.max(cfg.min, Number.isFinite(x) ? x : 1)));
  const fmt = (x) => x + 'x'; // YouTube's own convention inside the player ("1.5x")
  const visible = (e) => e && e.isConnected && e.offsetWidth > 0;
  const target = () => (holding ? clamp(want * 2) : want);

  // Only the real players: the watch page (also in miniplayer/theater/fullscreen)
  // and Shorts. Hover previews on the feed play in #inline-preview-player and are left alone.
  const playerOf = (v) => {
    const p = v.closest('.html5-video-player');
    return p && (p.id === 'movie_player' || p.id === 'shorts-player') ? p : null;
  };
  const activePlayer = () => [...document.querySelectorAll('#shorts-player, #movie_player')].find(visible);

  function nearest(x) {
    let best = 0;
    SPEEDS.forEach((s, i) => { if (Math.abs(s - x) < Math.abs(SPEEDS[best] - x)) best = i; });
    return best;
  }

  function step(dir) {
    if (dir > 0) return SPEEDS.find((s) => s > want + 1e-9) ?? cfg.max;
    return SPEEDS.findLast((s) => s < want - 1e-9) ?? cfg.min;
  }

  // At the live edge of a stream there is nothing ahead to speed through, and
  // YouTube drops back to 1x itself. Leave it alone there.
  function atLiveEdge(v, p) {
    if (!p.classList.contains('ytp-live') && v.duration !== Infinity) return false;
    const n = v.seekable.length;
    return n > 0 && v.seekable.end(n - 1) - v.currentTime < 15;
  }

  // If something else keeps resetting the speed (another speed add-on), stop
  // answering for a moment instead of trading events with it forever.
  let fights = [], restUntil = 0;
  function resting() {
    const now = performance.now();
    if (now < restUntil) return true;
    fights = fights.filter((t) => now - t < 1000);
    fights.push(now);
    if (fights.length > 30) { restUntil = now + 3000; fights = []; return true; }
    return false;
  }

  function apply(v) {
    const p = playerOf(v);
    if (!p || atLiveEdge(v, p)) return false;
    const t = target();
    if (v.playbackRate === t) return false;
    if (resting()) return false;
    v.playbackRate = t;
    return true;
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
  // `sticky` keeps it up (while holding) until hideBezel().
  function show(x = want, sticky = false) {
    const host = (visible(player) && player) || activePlayer() || document.body;
    if (!bezel) bezel = el('div', 'ytsp-bezel');
    if (bezel.parentNode !== host) host.appendChild(bezel);
    bezel.textContent = fmt(x);
    bezel.hidden = false;
    clearTimeout(bezelTimer);
    if (!sticky) bezelTimer = setTimeout(hideBezel, 700);
    announce('Speed ' + fmt(x));
  }
  function hideBezel() {
    clearTimeout(bezelTimer);
    if (bezel) bezel.hidden = true;
  }

  // Screen readers hear speed changes from hotkeys and the scroll wheel.
  function announce(text) {
    if (!live) {
      live = el('div', 'ytsp-sr');
      live.setAttribute('aria-live', 'polite');
      document.body.append(live);
    }
    live.textContent = text;
  }

  function set(v, fromUI) {
    want = clamp(v);
    if (want !== clamp(1)) last = want;
    applyAll();
    render();
    if (!fromUI) show();
    browser.storage.local.set({ want, last });
  }

  // What R goes back to from 1x: your last speed, or on a fresh install the
  // first preset above 1x.
  function returnSpeed() {
    const base = clamp(1);
    if (last !== base) return last;
    return shownPresets.find((p) => p > base + 1e-9) ?? step(1);
  }

  function applySettings(raw) {
    cfg = GS.normalize(raw);
    SPEEDS = GS.speeds(cfg);
    shownPresets = GS.activePresets(cfg);
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
    announce('Speed ' + fmt(want));
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
    presetEls = shownPresets.map((p) => {
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
    slowerBtn = roundBtn('', 'Slower', ICONS.minus, () => set(step(-1), true));
    fasterBtn = roundBtn('', 'Faster', ICONS.plus, () => set(step(1), true));
    const row = el('div', 'ytsp-slider-row');
    row.append(slowerBtn, slider, fasterBtn);

    presetsEl = el('div', 'ytsp-presets');
    body.append(display, row, presetsEl);
    mainPage.append(head, body);
  }

  function buildUI() {
    btn = el('button', 'ytsp-btn');
    btn.type = 'button';
    btn.title = 'Playback speed (Shift+. / Shift+,), scroll to change';
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', (e) => {
      if (panel.hidden) openPanel(e.detail === 0); else closePanel();
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

  // Match the time display's size, which YouTube enlarges in big mode.
  function matchTimeDisplay() {
    if (!btn || !player || player.id !== 'movie_player') return;
    const time = player.querySelector('.ytp-time-display');
    btn.style.fontSize = time ? getComputedStyle(time).fontSize : '';
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
    matchTimeDisplay();
    if (hint) {
      if (hint.parentNode !== p) p.append(hint);
      hint.classList.toggle('ytsp-hint-up', shorts);
      observeHint();
    }
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

  // Above the button on a regular video; below it on Shorts, whose controls
  // sit at the top.
  function positionHint() {
    if (!hint || !visible(btn)) return;
    const p = player.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    if (hint.classList.contains('ytsp-hint-up')) {
      hint.style.top = (b.bottom - p.top + 12) + 'px';
      hint.style.bottom = '';
    } else {
      hint.style.bottom = (p.bottom - b.top + 12) + 'px';
      hint.style.top = '';
    }
    // the caret is 12px wide, so its centre sits 6px in from its right offset
    hint.style.setProperty('--arrow', Math.max(10, p.right - 12 - (b.left + b.width / 2) - 6) + 'px');
  }

  // YouTube lays out its control bar after we mount; re-aim when it settles or resizes.
  function observeHint() {
    if (hintObserver) hintObserver.disconnect();
    hintObserver = new ResizeObserver(positionHint);
    hintObserver.observe(btn.parentNode);
    hintObserver.observe(player);
    requestAnimationFrame(positionHint);
  }

  function maybeHint() {
    if (hintDone || hint || !visible(btn)) return;
    hint = el('div', 'ytsp-hint');
    hint.setAttribute('role', 'note');
    hint.classList.toggle('ytsp-hint-up', player.id === 'shorts-player');
    const got = el('button', 'ytsp-hint-btn', 'Got it');
    got.type = 'button';
    got.addEventListener('click', dismissHint);
    const kbd = (t) => el('kbd', null, t);
    const keys = el('div', 'ytsp-hint-keys');
    const line = (combo, what) => {
      const c = el('span');
      c.append(...combo.flatMap((k, i) => (i ? [' + ', kbd(k)] : [kbd(k)])));
      keys.append(c, el('span', null, what));
    };
    line(['Shift', '.'], 'faster');
    line(['Shift', ','], 'slower');
    line(['R'], '1x and back');
    hint.append(
      el('strong', null, 'Your speed controls'),
      el('p', null, 'Click this button for a slider and presets, or scroll over it. YouTube’s speed keys now go past 2x:'),
      keys,
      got,
    );
    stopAll(hint);
    player.append(hint);
    positionHint();
    observeHint();
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
    btn.setAttribute('aria-label', 'Playback speed ' + fmt(want));
    display.textContent = fmt(want);
    slider.value = nearest(want);
    slider.setAttribute('aria-valuetext', fmt(want));
    slowerBtn.disabled = want <= cfg.min;
    fasterBtn.disabled = want >= cfg.max;
    presetEls.forEach((b, i) => {
      const on = shownPresets[i] === want;
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

  function openPanel(fromKeyboard) {
    dismissHint();
    panel.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    fitPanel();
    document.addEventListener('pointerdown', outside, true);
    if (fromKeyboard) slider.focus();
  }

  function closePanel() {
    if (!panel || panel.hidden) return;
    const hadFocus = panel.contains(document.activeElement);
    panel.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside, true);
    if (hadFocus) btn.focus();
  }

  // ---- Full settings, over the page ----

  // The same page as the toolbar popup, in an iframe, opened like a popup:
  // no dimming, a click outside or Escape closes it. It goes inside the
  // fullscreen element when there is one, so it also works in fullscreen.
  const EXT_ORIGIN = new URL(browser.runtime.getURL('')).origin;
  let frameH = 560;

  // VARIANT: 'corner' opens where the toolbar popup does (top right);
  // 'button' rises from the speed button (drops below it on Shorts).
  function placeSettings() {
    if (!overlay || overlay.hidden) return;
    const gap = 8;
    const corner = { top: gap, right: gap, room: innerHeight - 2 * gap, above: false };
    let at = corner;
    if (pos === 'button' && visible(btn)) {
      const b = btn.getBoundingClientRect();
      const right = Math.max(gap, innerWidth - player.getBoundingClientRect().right + 12);
      at = player.id === 'shorts-player'
        ? { top: b.bottom + 12, right, room: innerHeight - b.bottom - 12 - gap, above: false }
        : { bottom: b.top - 12, right, room: b.top - 12 - gap, above: true };
      if (at.room < 320) at = corner; // not enough space next to the button
    }
    const h = Math.min(frameH, at.room);
    frame.style.height = h + 'px';
    overlay.style.right = at.right + 'px';
    overlay.style.top = (at.above ? at.bottom - h : at.top) + 'px';
  }

  function settingsOutside(e) {
    if (overlay && !overlay.contains(e.target)) closeSettings();
  }
  // Keep keyboard focus inside the settings while they're open.
  function keepFocus(e) {
    if (overlay && !overlay.contains(e.target)) frame.focus();
  }

  function openSettings() {
    closePanel();
    if (!overlay) {
      overlay = el('div', 'ytsp-dialog');
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', 'Granular Speed settings');
      frame = el('iframe', 'ytsp-frame');
      frame.title = 'Granular Speed settings';
      overlay.append(frame);
      stopAll(overlay);
    }
    frame.src = browser.runtime.getURL('options.html?view=overlay');
    (document.fullscreenElement || document.body).append(overlay);
    overlay.hidden = false;
    placeSettings();
    document.addEventListener('pointerdown', settingsOutside, true);
    document.addEventListener('focusin', keepFocus, true);
    addEventListener('resize', placeSettings);
    frame.focus();
  }

  function closeSettings() {
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    frame.src = 'about:blank';
    document.removeEventListener('pointerdown', settingsOutside, true);
    document.removeEventListener('focusin', keepFocus, true);
    removeEventListener('resize', placeSettings);
    if (visible(btn)) btn.focus();
  }

  window.addEventListener('message', (e) => {
    if (!frame || e.source !== frame.contentWindow || e.origin !== EXT_ORIGIN) return;
    const d = e.data || {};
    if (d.ytsp === 'close') closeSettings();
    if (d.ytsp === 'size' && Number.isFinite(d.h)) { frameH = d.h; placeSettings(); }
  });

  document.addEventListener('fullscreenchange', () => {
    matchTimeDisplay();
    if (overlay && !overlay.hidden) {
      const host = document.fullscreenElement || document.body;
      if (overlay.parentNode !== host) host.append(overlay);
      placeSettings();
    }
  });

  // ---- Keep the speed applied ----

  // Recent clicks in YouTube's own menus (the gear menu, Shorts' menu). A
  // speed picked there is undone like any other change, but with the bubble,
  // so it's clear the extension is in charge.
  let menuClick = 0;
  const MENUS = '.ytp-settings-menu, .ytp-popup, tp-yt-iron-dropdown, ytd-menu-popup-renderer, yt-sheet-view-model, [role="menu"], [role="menuitem"], [role="menuitemradio"]';
  for (const ev of ['click', 'input', 'keydown']) {
    document.addEventListener(ev, (e) => {
      const t = e.composedPath()[0];
      if (e.isTrusted && t && t.nodeType === 1 && t.closest(MENUS)) menuClick = performance.now();
    }, true);
  }

  // YouTube resets the rate on every new video/ad. Media events don't bubble,
  // but capture-phase listeners on document still see them.
  for (const ev of ['loadeddata', 'playing', 'ratechange']) {
    document.addEventListener(ev, (e) => {
      const v = e.target;
      if (v.localName !== 'video') return;
      const p = playerOf(v);
      if (!p) return; // hover previews and other embedded players keep their own speed
      if (ev === 'ratechange' && pressing && !holding && v.playbackRate === 2) startHold();
      const changed = apply(v);
      if (ev === 'ratechange') {
        if (changed && !holding && performance.now() - menuClick < 1500) show();
        ensureUI();
        return;
      }
      if (p !== player || !visible(btn)) mount(p); else ensureUI();
    }, true);
  }

  // ---- Press and hold on the video ----

  const NOT_VIDEO = '.ytp-chrome-bottom, .ytp-chrome-top, .ytp-settings-menu, .ytp-popup, ytd-shorts-player-controls, .ytsp-panel, .ytsp-btn, .ytsp-hint, .ytsp-dialog';

  function startHold() {
    clearTimeout(holdTimer);
    holding = true;
    for (const p of document.querySelectorAll('#movie_player, #shorts-player')) p.classList.add('ytsp-holding');
    applyAll();
    if (target() !== want) show(target(), true);
  }

  function endHold() {
    clearTimeout(holdTimer);
    pressing = 0;
    if (!holding) return;
    holding = false;
    for (const p of document.querySelectorAll('.ytsp-holding')) p.classList.remove('ytsp-holding');
    applyAll();
    hideBezel();
  }

  window.addEventListener('pointerdown', (e) => {
    if (!e.isTrusted || e.button !== 0) return;
    const t = e.composedPath()[0];
    const p = t && t.nodeType === 1 && t.closest('#movie_player, #shorts-player');
    if (!p || t.closest(NOT_VIDEO)) return;
    pressing = performance.now();
    // At exactly 2x, YouTube's switch to 2x fires no ratechange, so watch for
    // its hold overlay instead.
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      if (pressing && !holding && want === 2 && visible(p.querySelector('.ytp-speedmaster-overlay'))) startHold();
    }, 700);
  }, true);
  for (const ev of ['pointerup', 'pointercancel']) window.addEventListener(ev, endHold, true);
  window.addEventListener('blur', endHold);

  // ---- Hotkeys ----

  // Capture on window runs before YouTube's own key handlers.
  window.addEventListener('keydown', (e) => {
    if (!e.isTrusted || e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.code === 'Escape' && overlay && !overlay.hidden) { closeSettings(); return; }
    if (e.code === 'Escape' && panel && !panel.hidden) closePanel();
    const t = e.composedPath()[0]; // real target, even inside shadow DOM
    const inPanel = panel && t && t.nodeType === 1 && panel.contains(t);
    if (!inPanel && t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (!activePlayer()) return; // no video on this page (home, search): the keys stay YouTube's

    let next;
    if (e.shiftKey && e.code === 'Period') next = step(1);
    else if (e.shiftKey && e.code === 'Comma') next = step(-1);
    else if (!e.shiftKey && e.code === 'KeyR') next = want === clamp(1) ? returnSpeed() : clamp(1);
    else return;

    e.preventDefault();
    e.stopImmediatePropagation();
    dismissHint();
    set(next);
  }, true);

  // ---- Startup ----

  browser.storage.local.get(['want', 'last', 'settings', 'hintDone', 'devVariant']).then((s) => {
    if (Number.isFinite(s.want)) want = s.want;
    if (Number.isFinite(s.last)) last = s.last;
    hintDone = s.hintDone === true;
    if (s.devVariant && s.devVariant.pos) pos = s.devVariant.pos; // VARIANT
    applySettings(s.settings); // also clamps want/last and applies
    ensureUI();
    maybeHint();
  });

  // Keep tabs in sync and pick up changes from any settings view.
  browser.storage.onChanged.addListener((c) => {
    if (c.settings) applySettings(c.settings.newValue);
    if (c.want && Number.isFinite(c.want.newValue)) { want = clamp(c.want.newValue); applyAll(); render(); }
    if (c.last && Number.isFinite(c.last.newValue)) last = clamp(c.last.newValue);
    if (c.devVariant && c.devVariant.newValue) { pos = c.devVariant.newValue.pos || 'corner'; placeSettings(); } // VARIANT
  });
})();
