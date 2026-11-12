(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const fmt = (x) => x + '×';
  const NS = 'http://www.w3.org/2000/svg';

  // Where this page is shown: 'popup' (toolbar), 'overlay' (popup over YouTube,
  // opened from the player panel) or 'page' (about:addons). The first two are
  // compact so everything fits without scrolling.
  const view = new URLSearchParams(location.search).get('view') || 'page';
  document.documentElement.dataset.view = view;
  const compact = view !== 'page';

  let cfg = GS.normalize();
  let statusTimer, undoCfg = null;
  const rows = {};

  // Visible row names; GS.FIELDS has the full names for screen readers.
  const LABELS = {
    stepLow: (s) => 'Each press below ' + fmt(s.threshold),
    threshold: () => 'Steps change at',
    stepHigh: (s) => 'Each press above ' + fmt(s.threshold),
    min: () => 'Slowest',
    max: () => 'Fastest',
  };

  // ---- small DOM helpers ----

  function svgEl(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.append(e);
    return e;
  }

  function icon(d) {
    const svg = svgEl('svg', { viewBox: '0 0 24 24', width: 18, height: 18, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'aria-hidden': 'true' });
    svgEl('path', { d }, svg);
    return svg;
  }
  const MINUS = 'M6 12h12';
  const PLUS = 'M12 6v12M6 12h12';
  const CLOSE = 'M7 7l10 10M17 7L7 17';

  // Status in the header. With `undo`, an Undo button stays for 5 seconds.
  function flash(text, undo = null) {
    const s = $('status');
    s.textContent = text;
    s.classList.add('on');
    undoCfg = undo;
    $('undo').hidden = !undo;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      s.classList.remove('on');
      $('undo').hidden = true;
      undoCfg = null;
    }, undo ? 5000 : 1600);
  }

  function save(next, msg = 'Saved', undo = null) {
    cfg = next;
    render();
    browser.storage.local.set({ settings: next }).then(() => flash(msg, undo));
  }

  $('undo').addEventListener('click', () => {
    if (undoCfg) save(undoCfg, 'Restored');
  });

  // ---- stepper rows ----

  function buildRows() {
    for (const f of GS.FIELDS) {
      const row = document.createElement('div');
      row.className = 'row';
      const id = 'v-' + f.key;
      const label = document.createElement('label');
      label.htmlFor = id;
      const text = document.createElement('span');
      const idle = document.createElement('span');
      idle.className = 'idle-note';
      idle.textContent = 'not used';
      label.append(text, idle);
      const stepper = document.createElement('div');
      stepper.className = 'stepper';
      const minus = document.createElement('button');
      minus.type = 'button';
      minus.className = 'step';
      minus.append(icon(MINUS));
      const plus = document.createElement('button');
      plus.type = 'button';
      plus.className = 'step';
      plus.append(icon(PLUS));
      const value = document.createElement('span');
      value.className = 'value';
      const input = document.createElement('input');
      input.id = id;
      input.type = 'number';
      input.inputMode = 'decimal';
      input.step = '0.01';
      const unit = document.createElement('span');
      unit.className = 'unit';
      unit.textContent = '×';
      unit.setAttribute('aria-hidden', 'true');
      value.append(input, unit);
      stepper.append(minus, value, plus);
      row.append(label, stepper);
      (f.key === 'min' || f.key === 'max' ? $('rangeRows') : $('stepRows')).append(row);

      minus.addEventListener('click', () => save(GS.nudge(cfg, f.key, -1)));
      plus.addEventListener('click', () => save(GS.nudge(cfg, f.key, 1)));
      input.addEventListener('change', () => {
        const typed = parseFloat(input.value);
        // A cleared or unreadable field goes back to what it was.
        if (!Number.isFinite(typed)) { input.value = cfg[f.key]; return; }
        const asked = { ...cfg, [f.key]: typed };
        const next = GS.normalize(asked);
        // Mark every value that had to move, not only the one typed into.
        const moved = GS.FIELDS.filter(({ key }) => next[key] !== asked[key]).map(({ key }) => key);
        save(next, moved.length ? 'Adjusted to fit' : 'Saved');
        for (const key of moved) markAdjusted(rows[key].row);
      });
      rows[f.key] = { f, row, text, input, minus, plus };
    }
  }

  // A corrected value is marked in place instead of changing silently.
  function markAdjusted(row) {
    row.classList.remove('adjusted');
    void row.offsetWidth;
    row.classList.add('adjusted');
  }

  // ---- presets ----

  function presetError(text) {
    const e = $('presetError');
    e.textContent = text;
    e.hidden = !text;
  }

  function renderChips() {
    const box = $('chips');
    box.textContent = '';
    for (const p of cfg.presets) {
      // Presets outside the range stay saved but the player hides them.
      const off = p < cfg.min || p > cfg.max;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip' + (off ? ' off' : '');
      chip.setAttribute('aria-label', 'Remove preset ' + fmt(p) + (off ? ' (outside your range, hidden in the player)' : ''));
      if (off) chip.title = 'Outside your range, so the player hides it';
      const t = document.createElement('span');
      t.textContent = fmt(p);
      chip.append(t, icon(CLOSE));
      chip.addEventListener('click', () => {
        const prev = cfg;
        save(GS.withoutPreset(cfg, p), 'Removed ' + fmt(p), prev);
        requestAnimationFrame(() => (box.querySelector('.chip') || $('addInput')).focus());
      });
      box.append(chip);
    }
    if (!cfg.presets.length) {
      const empty = document.createElement('span');
      empty.className = 'empty';
      empty.textContent = 'No presets. The player panel hides the preset row.';
      box.append(empty);
    }
    // At the limit, the Add field gives way to a short note in the same spot.
    const full = cfg.presets.length >= GS.LIMITS.presets;
    $('addForm').hidden = full;
    $('presetNote').hidden = !full;
    if (full) presetError('');
  }

  $('addInput').addEventListener('input', () => presetError(''));
  $('addForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = $('addInput').value.trim();
    if (!raw) return;
    const v = GS.r2(parseFloat(raw));
    if (!Number.isFinite(v)) { presetError('Type a speed, like 2.3'); return; }
    if (v < cfg.min || v > cfg.max) { presetError(fmt(v) + ' is outside your range, ' + fmt(cfg.min) + ' to ' + fmt(cfg.max)); return; }
    if (cfg.presets.includes(v)) { presetError(fmt(v) + ' is already a preset'); return; }
    $('addInput').value = '';
    presetError('');
    save(GS.withPreset(cfg, v), 'Added ' + fmt(v));
  });

  // ---- the speed scale ----

  const scale = $('scale');
  let drag = null; // threshold while dragging, before it is saved

  function drawScale(s) {
    // Draw at the real pixel width so ticks and labels render 1:1.
    const W = Math.max(240, Math.round(scale.getBoundingClientRect().width) || 320);
    const H = compact ? 60 : 78;
    scale.setAttribute('viewBox', `0 0 ${W} ${H}`);
    scale.textContent = '';
    const pad = 16;
    const span = s.max - s.min;
    const x = (v) => pad + ((v - s.min) / span) * (W - 2 * pad);
    const list = GS.speeds(s);
    const base = compact ? 40 : 46;
    const MAJOR = 22;
    const len = (v) => {
      if (Number.isInteger(v) || v === s.min || v === s.max) return MAJOR;
      if (Number.isInteger(v * 2)) return 15;
      return 9;
    };

    // zone above the switch point, where the second step size applies
    svgEl('rect', { class: 'zone', x: x(s.threshold), y: base - 26, width: x(s.max) - x(s.threshold), height: 28, rx: 3 }, scale);
    svgEl('line', { class: 'base', x1: pad - 6, x2: W - pad + 6, y1: base + 0.5, y2: base + 0.5 }, scale);
    for (const v of list) {
      const cls = 'tick' + (v > s.threshold + 1e-9 ? ' fine' : '') + (len(v) === MAJOR ? ' major' : '');
      const X = x(v);
      svgEl('line', { class: cls, x1: X, x2: X, y1: base, y2: base - len(v) }, scale);
    }
    for (const p of GS.activePresets(s)) svgEl('circle', { class: 'preset', cx: x(p), cy: base - 28, r: 3 }, scale);

    // labels: ends, 1×, then whole speeds as room allows; never on top of the marker
    const labelY = base + (compact ? 17 : 19);
    const wanted = [s.min, s.max];
    if (s.min < 1 && 1 < s.max) wanted.push(1);
    const every = span <= 5 ? 1 : span <= 10 ? 2 : 4;
    for (let n = Math.ceil(s.min); n <= s.max; n++) if (n % every === 0) wanted.push(n);
    const placed = [x(s.threshold)];
    for (const v of wanted) {
      const X = x(v);
      if (placed.some((p) => Math.abs(p - X) < 30)) continue;
      placed.push(X);
      const t = svgEl('text', { class: 'label', x: X, y: labelY, 'text-anchor': 'middle' }, scale);
      t.textContent = String(v);
    }

    // marker for where steps change; the only part of the scale you can drag
    const mx = x(s.threshold);
    const g = svgEl('g', { class: 'marker', tabindex: 0, role: 'slider', 'aria-label': 'Where steps change', 'aria-valuemin': s.min, 'aria-valuemax': s.max, 'aria-valuenow': s.threshold, 'aria-valuetext': fmt(s.threshold) }, scale);
    svgEl('rect', { class: 'hit', x: mx - 14, y: 1, width: 28, height: H - 2, rx: 6 }, g);
    svgEl('line', { class: 'needle', x1: mx, x2: mx, y1: base - 32, y2: base + 2 }, g);
    svgEl('path', { class: 'head', d: `M${mx} ${base + 3} L${mx + 6} ${base + 11} L${mx - 6} ${base + 11} Z` }, g);
    const t = svgEl('text', { class: 'mlabel', x: mx, y: base - 36, 'text-anchor': 'middle' }, g);
    t.textContent = fmt(s.threshold);

    scale.dataset.min = s.min;
    scale.dataset.max = s.max;
    scale.dataset.pad = pad;
    scale.dataset.w = W;

    // The same picture in words, for screen readers.
    const below = s.threshold > s.min ? fmt(s.min) + ' to ' + fmt(s.threshold) + ' by ' + fmt(s.stepLow) : '';
    const above = s.threshold < s.max ? (below ? 'then ' : fmt(s.threshold) + ' ') + 'to ' + fmt(s.max) + ' by ' + fmt(s.stepHigh) : '';
    $('scaleSummary').textContent = list.length + ' speeds: ' + [below, above].filter(Boolean).join(', ') + '.';
    renderLegend(s);
  }

  // A one-line key under the scale.
  function renderLegend(s) {
    const lg = $('legend');
    lg.textContent = '';
    const item = (cls, text) => {
      const i = document.createElement('span');
      i.className = 'key';
      const sw = document.createElement('span');
      sw.className = 'sw ' + cls;
      sw.setAttribute('aria-hidden', 'true');
      i.append(sw, text);
      lg.append(i);
    };
    if (s.threshold < s.max) item('sw-zone', fmt(s.stepHigh) + ' steps');
    if (GS.activePresets(s).length) item('sw-preset', 'preset');
    item('sw-marker', 'drag to move');
  }

  function valueAt(clientX) {
    const r = scale.getBoundingClientRect();
    const W = +scale.dataset.w, pad = +scale.dataset.pad, min = +scale.dataset.min, max = +scale.dataset.max;
    const px = ((clientX - r.left) / r.width) * W;
    const v = min + ((px - pad) / (W - 2 * pad)) * (max - min);
    return Math.round(v / 0.05) * 0.05;
  }

  scale.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.marker')) return; // a stray click on the scale changes nothing
    scale.setPointerCapture(e.pointerId);
    drag = GS.normalize({ ...cfg, threshold: valueAt(e.clientX) });
    renderPreview(drag);
  });
  scale.addEventListener('pointermove', (e) => {
    if (!drag) return;
    drag = GS.normalize({ ...cfg, threshold: valueAt(e.clientX) });
    renderPreview(drag);
  });
  const endDrag = () => {
    if (!drag) return;
    const next = drag;
    drag = null;
    if (next.threshold !== cfg.threshold) save(next); else render();
  };
  scale.addEventListener('pointerup', endDrag);
  scale.addEventListener('pointercancel', endDrag);
  scale.addEventListener('keydown', (e) => {
    if (!e.target.closest('.marker')) return;
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = e.shiftKey
      ? GS.normalize({ ...cfg, threshold: cfg.threshold + dir * 0.05 })
      : GS.nudge(cfg, 'threshold', dir);
    save(next);
    requestAnimationFrame(() => scale.querySelector('.marker').focus());
  });

  // ---- render ----

  function renderRows(s) {
    for (const key in rows) {
      const r = rows[key];
      const name = r.f.name(s);
      r.text.textContent = LABELS[key](s);
      if (document.activeElement !== r.input) r.input.value = s[key];
      r.input.setAttribute('aria-label', name);
      r.minus.disabled = !GS.canNudge(s, key, -1);
      r.plus.disabled = !GS.canNudge(s, key, 1);
      r.minus.setAttribute('aria-label', 'Decrease ' + name.toLowerCase());
      r.plus.setAttribute('aria-label', 'Increase ' + name.toLowerCase());
    }
    // With the switch point at an end, one step size has nothing to act on.
    rows.stepLow.row.classList.toggle('idle', s.threshold <= s.min);
    rows.stepHigh.row.classList.toggle('idle', s.threshold >= s.max);
    $('audioNote').hidden = s.max <= 8;
  }

  function renderPreview(s) {
    drawScale(s);
    renderRows(s);
  }

  function render() {
    renderPreview(cfg);
    renderChips();
  }

  $('reset').addEventListener('click', () => {
    const prev = cfg;
    save(GS.normalize(), 'Defaults restored', prev);
  });

  // Shown over YouTube: tell the player script our height, and let it close us.
  if (view === 'overlay') {
    const YT = 'https://www.youtube.com';
    const close = () => parent.postMessage({ ytsp: 'close' }, YT);
    const btn = $('close');
    btn.hidden = false;
    btn.append(icon(CLOSE));
    btn.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    new ResizeObserver(() => parent.postMessage({ ytsp: 'size', h: document.documentElement.scrollHeight }, YT))
      .observe(document.body);
  }

  buildRows();
  // Redraw when the page width changes (popup vs about:addons, window resize).
  let lastW = 0;
  new ResizeObserver(() => {
    const w = Math.round(scale.getBoundingClientRect().width);
    if (w && w !== lastW) { lastW = w; drawScale(drag || cfg); }
  }).observe(scale);
  browser.storage.local.get('settings').then((r) => {
    cfg = GS.normalize(r.settings);
    render();
  });
  // Changes made in the player panel show up here live.
  browser.storage.onChanged.addListener((c) => {
    if (c.settings && !drag) {
      cfg = GS.normalize(c.settings.newValue);
      render();
    }
  });
})();
