(() => {
  'use strict';

  // A working demo of the step logic, using the user's own settings.
  const $ = (id) => document.getElementById(id);
  const fmt = (x) => x + '×';
  const NS = 'http://www.w3.org/2000/svg';
  let cfg = GS.normalize();
  let list = GS.speeds(cfg);
  let speed = 1;
  let last = null; // what R returns to; until you pick a speed, the first preset above 1×

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
  $('trySlower').append(icon('M6 12h12'));
  $('tryFaster').append(icon('M12 6v12M6 12h12'));

  function step(dir) {
    if (dir > 0) return list.find((s) => s > speed + 1e-9) ?? cfg.max;
    return list.findLast((s) => s < speed - 1e-9) ?? cfg.min;
  }

  function draw() {
    const svg = $('tryScale');
    const W = Math.max(240, Math.round(svg.getBoundingClientRect().width) || 320);
    const H = 68;
    const base = 42;
    const pad = 16;
    const x = (v) => pad + ((v - cfg.min) / (cfg.max - cfg.min)) * (W - 2 * pad);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.textContent = '';
    svgEl('rect', { class: 'zone', x: x(cfg.threshold), y: base - 24, width: x(cfg.max) - x(cfg.threshold), height: 26, rx: 3 }, svg);
    svgEl('line', { class: 'base', x1: pad - 6, x2: W - pad + 6, y1: base + 0.5, y2: base + 0.5 }, svg);
    for (const v of list) {
      const major = Number.isInteger(v) || v === cfg.min || v === cfg.max;
      const len = major ? 20 : Number.isInteger(v * 2) ? 14 : 8;
      svgEl('line', { class: 'tick' + (v > cfg.threshold + 1e-9 ? ' fine' : '') + (major ? ' major' : ''), x1: x(v), x2: x(v), y1: base, y2: base - len }, svg);
    }
    const placed = [x(cfg.threshold)]; // the marker carries its own label
    for (const v of [cfg.min, 1, ...Array.from({ length: Math.floor(cfg.max) }, (_, i) => i + 1), cfg.max]) {
      if (v < cfg.min || v > cfg.max || placed.some((p) => Math.abs(p - x(v)) < 30)) continue;
      placed.push(x(v));
      svgEl('text', { class: 'label', x: x(v), y: base + 19, 'text-anchor': 'middle' }, svg).textContent = String(v);
    }
    // The amber ▲ marks where steps change, as on the settings page; the
    // current speed is a plain dot riding on the line.
    const mx = x(cfg.threshold);
    svgEl('line', { class: 'needle', x1: mx, x2: mx, y1: base - 28, y2: base + 2 }, svg);
    svgEl('path', { class: 'head', d: `M${mx} ${base + 3} L${mx + 5} ${base + 10} L${mx - 5} ${base + 10} Z` }, svg);
    svgEl('text', { class: 'mlabel', x: mx, y: base - 32, 'text-anchor': 'middle' }, svg).textContent = fmt(cfg.threshold);
    svgEl('circle', { class: 'now', cx: x(speed), cy: base, r: 5 }, svg);
  }

  function render() {
    $('trySpeed').textContent = fmt(speed);
    const next = step(1);
    const by = GS.r2(next - speed);
    // Explain the second step size once, at the point where it starts.
    const why = speed === cfg.threshold && cfg.stepHigh < cfg.stepLow && cfg.threshold < cfg.max
      ? ' Above ' + fmt(cfg.threshold) + ' the step is smaller, where small changes matter more.'
      : '';
    $('tryNote').textContent = speed >= cfg.max
      ? 'That’s the fastest speed in your settings. R jumps back to 1×.'
      : 'Next press: +' + by + '× to ' + fmt(next) + '.' + why;
    $('trySlower').disabled = speed <= cfg.min;
    $('tryFaster').disabled = speed >= cfg.max;
    draw();
  }

  function set(v) {
    speed = v;
    if (v !== 1) last = v;
    render();
  }
  const back = () => last ?? GS.activePresets(cfg).find((p) => p > 1) ?? step(1);

  $('trySlower').addEventListener('click', () => set(step(-1)));
  $('tryFaster').addEventListener('click', () => set(step(1)));
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.shiftKey && e.code === 'Period') set(step(1));
    else if (e.shiftKey && e.code === 'Comma') set(step(-1));
    else if (!e.shiftKey && e.code === 'KeyR') set(speed === 1 ? back() : 1);
    else return;
    e.preventDefault();
  });

  $('openSettings').addEventListener('click', () => browser.runtime.openOptionsPage());
  new ResizeObserver(draw).observe($('tryScale'));

  browser.storage.local.get('settings').then((r) => {
    cfg = GS.normalize(r.settings);
    list = GS.speeds(cfg);
    if (speed < cfg.min || speed > cfg.max) speed = cfg.min > 1 ? cfg.min : cfg.max;
    $('range').textContent = fmt(cfg.min) + ' to ' + fmt(cfg.max);
    $('holdMax').textContent = fmt(cfg.max);
    $('audioNote').hidden = cfg.max <= 8;
    const d = GS.DEFAULTS;
    if (cfg.stepLow !== d.stepLow || cfg.stepHigh !== d.stepHigh || cfg.threshold !== d.threshold) {
      $('stepsText').textContent = 'With your settings, speed moves ' + cfg.stepLow + '× at a time up to ' + fmt(cfg.threshold) +
        ', then ' + cfg.stepHigh + '×. Near the top of what you can follow, a small change decides whether you keep up with the speaker, so the second step is usually the smaller one. You can change both, and where they change, in the settings.';
    }
    render();
  });
})();
