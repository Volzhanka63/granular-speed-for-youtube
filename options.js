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
  let statusTimer;
  const rows = {};

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

  function flash(text) {
    const s = $('status');
    s.textContent = text;
    s.classList.add('on');
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => s.classList.remove('on'), 1600);
  }

  function save(next, msg = 'Saved') {
    cfg = next;
    render();
    browser.storage.local.set({ settings: next }).then(() => flash(msg));
  }

  // ---- stepper rows ----

  function buildRows() {
    for (const f of GS.FIELDS) {
      const row = document.createElement('div');
      row.className = 'row';
      const id = 'v-' + f.key;
      const label = document.createElement('label');
      label.htmlFor = id;
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
        const next = GS.normalize({ ...cfg, [f.key]: typed });
        const adjusted = !(typed === next[f.key]);
        save(next, adjusted ? 'Adjusted to fit' : 'Saved');
        if (adjusted) markAdjusted(row);
      });
      rows[f.key] = { f, row, label, input, minus, plus };
    }
  }

  // A corrected value is marked in place instead of changing silently.
  function markAdjusted(row) {
    row.classList.remove('adjusted');
    void row.offsetWidth;
    row.classList.add('adjusted');
  }

  // ---- presets ----

  function renderChips() {
    const box = $('chips');
    box.textContent = '';
    for (const p of cfg.presets) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.setAttribute('aria-label', 'Remove preset ' + fmt(p));
      const t = document.createElement('span');
      t.textContent = fmt(p);
      chip.append(t, icon(CLOSE));
      chip.addEventListener('click', () => save(GS.withoutPreset(cfg, p), 'Removed ' + fmt(p)));
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
  }

  $('addForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = GS.r2(parseFloat($('addInput').value));
    if (!Number.isFinite(v)) return;
    if (v < cfg.min || v > cfg.max) {
      flash(fmt(v) + ' is outside ' + fmt(cfg.min) + ' to ' + fmt(cfg.max));
      return;
    }
    if (cfg.presets.includes(v)) {
      flash(fmt(v) + ' is already a preset');
      return;
    }
    $('addInput').value = '';
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
    const len = (v) => {
      if (Number.isInteger(v) || v === s.min || v === s.max) return 22;
      if (Number.isInteger(v * 2)) return 15;
      return 9;
    };

    // fine-step zone above the switch point
    svgEl('rect', { class: 'zone', x: x(s.threshold), y: base - 26, width: x(s.max) - x(s.threshold), height: 28, rx: 3 }, scale);
    svgEl('line', { class: 'base', x1: pad - 6, x2: W - pad + 6, y1: base + 0.5, y2: base + 0.5 }, scale);
    for (const v of list) {
      const cls = 'tick' + (v > s.threshold + 1e-9 ? ' fine' : '') + (len(v) === 20 ? ' major' : '');
      const X = x(v);
      svgEl('line', { class: cls, x1: X, x2: X, y1: base, y2: base - len(v) }, scale);
    }
    for (const p of s.presets) svgEl('circle', { class: 'preset', cx: x(p), cy: base - 28, r: 3 }, scale);

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

    // switch-point marker
    const mx = x(s.threshold);
    const g = svgEl('g', { class: 'marker', tabindex: 0, role: 'slider', 'aria-label': 'Step size changes at', 'aria-valuemin': s.min, 'aria-valuemax': s.max, 'aria-valuenow': s.threshold, 'aria-valuetext': fmt(s.threshold) }, scale);
    svgEl('rect', { class: 'hit', x: mx - 14, y: 0, width: 28, height: H }, g);
    svgEl('line', { class: 'needle', x1: mx, x2: mx, y1: base - 32, y2: base + 2 }, g);
    svgEl('path', { class: 'head', d: `M${mx} ${base + 3} L${mx + 6} ${base + 11} L${mx - 6} ${base + 11} Z` }, g);
    const t = svgEl('text', { class: 'mlabel', x: mx, y: base - 36, 'text-anchor': 'middle' }, g);
    t.textContent = fmt(s.threshold);

    scale.dataset.min = s.min;
    scale.dataset.max = s.max;
    scale.dataset.pad = pad;
    scale.dataset.w = W;
  }

  function valueAt(clientX) {
    const r = scale.getBoundingClientRect();
    const W = +scale.dataset.w, pad = +scale.dataset.pad, min = +scale.dataset.min, max = +scale.dataset.max;
    const px = ((clientX - r.left) / r.width) * W;
    const v = min + ((px - pad) / (W - 2 * pad)) * (max - min);
    return Math.round(v / 0.05) * 0.05;
  }

  scale.addEventListener('pointerdown', (e) => {
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
      r.label.textContent = r.f.label(s);
      if (document.activeElement !== r.input) r.input.value = s[key];
      r.minus.disabled = !GS.canNudge(s, key, -1);
      r.plus.disabled = !GS.canNudge(s, key, 1);
      r.minus.setAttribute('aria-label', 'Decrease ' + r.label.textContent.toLowerCase());
      r.plus.setAttribute('aria-label', 'Increase ' + r.label.textContent.toLowerCase());
    }
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

  $('reset').addEventListener('click', () => save(GS.normalize(), 'Defaults restored'));

  // Shown over YouTube: tell the player script our height, and let it close us.
  if (view === 'overlay') {
    const close = () => parent.postMessage({ ytsp: 'close' }, '*');
    const btn = $('close');
    btn.hidden = false;
    btn.append(icon(CLOSE));
    btn.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    new ResizeObserver(() => parent.postMessage({ ytsp: 'size', h: document.documentElement.scrollHeight }, '*'))
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
