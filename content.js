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
  let overlay, frame; // full settings, shown over the page

  // Press-and-hold on the video: YouTube plays at 2x while held; we play at
  // twice your speed instead (capped at Fastest), without saving it.
  let pressing = 0; // time of the current press on the video, 0 when none
  let holding = false;
  let holdTimer;

  const clamp = (x) => GS.r2(Math.min(cfg.max, Math.max(cfg.min, Number.isFinite(x) ? x : 1)));
  const fmt = (x) => x + 'x'; // YouTube's own convention inside the player ("1.5x")
  const visible = (e) => e && e.isConnected && e.offsetWidth > 0;
  const target = () => (holding ? clamp(want * 2) : want);
  // Bubble text while holding: the real speed, or "4x · fastest" at the cap.
  const holdText = () => (want * 2 > cfg.max + 1e-9 ? fmt(cfg.max) + ' · fastest' : fmt(target()));

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
  // answering for a moment instead of trading events with it forever. Only
  // undoing changes we didn't make counts; your own key presses never do.
  let fights = [], restUntil = 0;
  function resting() {
    const now = performance.now();
    if (now < restUntil) return true;
    fights = fights.filter((t) => now - t < 1000);
    fights.push(now);
    if (fights.length > 30) {
      restUntil = now + 3000;
      fights = [];
      setTimeout(applyAll, 3000); // then put your speed back once
      return true;
    }
    return false;
  }

  let ownWrite = { v: null, rate: 0, at: 0 }; // our last playbackRate write

  // `forced`: answering a change something else made (a media event).
  function apply(v, forced = false) {
    const p = playerOf(v);
    if (!p || atLiveEdge(v, p)) return false;
    const t = target();
    if (v.playbackRate === t) return false;
    if (forced && resting()) return false;
    v.playbackRate = t;
    ownWrite = { v, rate: t, at: performance.now() };
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
  // `x` is a speed or ready-made text; `sticky` keeps it up (while holding)
  // until hideBezel().
  function show(x = want, sticky = false) {
    const host = (visible(player) && player) || activePlayer() || document.body;
    if (!bezel) bezel = el('div', 'ytsp-bezel');
    if (bezel.parentNode !== host) host.appendChild(bezel);
    const text = typeof x === 'number' ? fmt(x) : x;
    bezel.textContent = text;
    bezel.hidden = false;
    clearTimeout(bezelTimer);
    if (!sticky) bezelTimer = setTimeout(hideBezel, 700);
    announce('Speed ' + text);
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
    if (!fromUI) show(holding ? holdText() : want, holding);
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
    btn.title = 'Playback speed. Shift+. faster, Shift+, slower, or scroll';
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
    render();
  }

  function ensureUI() {
    if (visible(btn)) return;
    for (const p of document.querySelectorAll('#shorts-player, #movie_player')) {
      if (visible(p)) { mount(p); if (visible(btn)) return; }
    }
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

  // Top right, where the toolbar popup opens.
  function placeSettings() {
    if (!overlay || overlay.hidden) return;
    const gap = 8;
    frame.style.height = Math.min(frameH, innerHeight - 2 * gap) + 'px';
    overlay.style.top = gap + 'px';
    overlay.style.right = gap + 'px';
  }

  // A click outside only closes the settings, like a toolbar popup: the rest
  // of that click (mousedown, mouseup, click) never reaches YouTube, so it
  // doesn't pause the video or follow a link.
  function settingsOutside(e) {
    if (!overlay || overlay.contains(e.target)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    closeSettings();
    swallowGesture();
  }
  function swallowGesture() {
    const types = ['pointerup', 'mousedown', 'mouseup', 'click', 'dblclick'];
    let timer;
    const done = () => {
      clearTimeout(timer);
      for (const t of types) removeEventListener(t, kill, true);
    };
    const kill = (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.type === 'click') done();
      // click follows mouseup at once; if it never comes, stop shortly after
      if (e.type === 'pointerup') { clearTimeout(timer); timer = setTimeout(done, 300); }
    };
    for (const t of types) addEventListener(t, kill, true);
    timer = setTimeout(done, 5000); // a press held very long: give up eventually
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
    addEventListener('pointerdown', settingsOutside, true);
    document.addEventListener('focusin', keepFocus, true);
    addEventListener('resize', placeSettings);
    frame.focus();
  }

  function closeSettings() {
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    frame.src = 'about:blank';
    removeEventListener('pointerdown', settingsOutside, true);
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
  const MENUS = '.ytp-settings-menu, .ytp-popup, tp-yt-iron-dropdown, ytd-menu-popup-renderer, yt-sheet-view-model';
  for (const ev of ['click', 'input', 'keydown']) {
    document.addEventListener(ev, (e) => {
      const t = e.composedPath()[0];
      if (e.isTrusted && t && t.nodeType === 1 && t.closest(MENUS)) menuClick = performance.now();
    }, true);
  }

  // YouTube's hold sets 2x. It counts as a hold only if the press has lasted
  // a moment and the 2x isn't our own write (e.g. a key press to 2x).
  function isYouTubeHold(v) {
    const now = performance.now();
    if (!pressing || holding || v.playbackRate !== 2 || now - pressing < 300) return false;
    return !(ownWrite.v === v && ownWrite.rate === 2 && now - ownWrite.at < 250);
  }

  // YouTube resets the rate on every new video/ad. Media events don't bubble,
  // but capture-phase listeners on document still see them. 'seeked' covers
  // going back from a live stream's live edge.
  for (const ev of ['loadeddata', 'playing', 'seeked', 'ratechange']) {
    document.addEventListener(ev, (e) => {
      const v = e.target;
      if (v.localName !== 'video') return;
      const p = playerOf(v);
      if (!p) return; // hover previews and other embedded players keep their own speed
      if (ev === 'ratechange' && isYouTubeHold(v)) startHold();
      const changed = apply(v, true);
      if (ev === 'ratechange') {
        if (changed && !holding && performance.now() - menuClick < 1500) show();
        ensureUI();
        return;
      }
      if (p !== player || !visible(btn)) mount(p); else ensureUI();
    }, true);
  }

  // ---- Press and hold on the video ----

  const NOT_VIDEO = '.ytp-chrome-bottom, .ytp-chrome-top, .ytp-settings-menu, .ytp-popup, ytd-shorts-player-controls, .ytsp-panel, .ytsp-btn, .ytsp-dialog';

  function startHold() {
    clearTimeout(holdTimer);
    holding = true;
    for (const p of document.querySelectorAll('#movie_player, #shorts-player')) p.classList.add('ytsp-holding');
    applyAll();
    show(holdText(), true); // also at Fastest, so the hold is never silent
  }

  // A release we missed (over another frame, outside the window): the next
  // move with no button down ends the press.
  function pointerCheck(e) {
    if (e.buttons === 0) endHold();
  }

  function endHold() {
    clearTimeout(holdTimer);
    pressing = 0;
    removeEventListener('pointermove', pointerCheck, true);
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
    addEventListener('pointermove', pointerCheck, true);
    // At exactly 2x, YouTube's switch to 2x fires no ratechange, so watch for
    // its hold overlay instead.
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      if (pressing && !holding && want === 2 && visible(p.querySelector('.ytp-speedmaster-overlay'))) startHold();
    }, 700);
  }, true);
  for (const ev of ['pointerup', 'pointercancel']) window.addEventListener(ev, endHold, true);
  window.addEventListener('blur', endHold);
  document.addEventListener('visibilitychange', () => { if (document.hidden) endHold(); });

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
    set(next);
  }, true);

  // ---- Startup ----

  browser.storage.local.get(['want', 'last', 'settings']).then((s) => {
    if (Number.isFinite(s.want)) want = s.want;
    if (Number.isFinite(s.last)) last = s.last;
    applySettings(s.settings); // also clamps want/last and applies
    ensureUI();
  });

  // Keep tabs in sync and pick up changes from any settings view.
  browser.storage.onChanged.addListener((c) => {
    if (c.settings) applySettings(c.settings.newValue);
    if (c.want && Number.isFinite(c.want.newValue)) { want = clamp(c.want.newValue); applyAll(); render(); }
    if (c.last && Number.isFinite(c.last.newValue)) last = clamp(c.last.newValue);
  });
})();
