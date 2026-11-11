(() => {
  'use strict';

  // A working demo of the step logic, using the user's own settings.
  const $ = (id) => document.getElementById(id);
  const fmt = (x) => x + '×';
  const NS = 'http://www.w3.org/2000/svg';
  let cfg = GS.normalize();
  let list = GS.speeds(cfg);
  let speed = 1;
  let last = 1;

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
    const placed = [];
    for (const v of [cfg.min, 1, ...Array.from({ length: Math.floor(cfg.max) }, (_, i) => i + 1), cfg.max]) {
      if (v < cfg.min || v > cfg.max || placed.some((p) => Math.abs(p - x(v)) < 30)) continue;
      placed.push(x(v));
      svgEl('text', { class: 'label', x: x(v), y: base + 19, 'text-anchor': 'middle' }, svg).textContent = String(v);
    }
    // the needle follows the current speed
    // head above the ticks so it never covers an axis label
    svgEl('line', { class: 'needle', x1: x(speed), x2: x(speed), y1: base - 28, y2: base + 2 }, svg);
    svgEl('path', { class: 'head', d: `M${x(speed) - 6} ${base - 36} L${x(speed) + 6} ${base - 36} L${x(speed)} ${base - 28} Z` }, svg);
  }

  function render() {
    $('trySpeed').textContent = fmt(speed);
    const next = step(1);
    const by = GS.r2(next - speed);
    $('tryNote').textContent = speed >= cfg.max
      ? 'That’s the fastest speed in your settings. R jumps back to 1×.'
      : 'Next press: +' + by + '× to ' + fmt(next) + '. The step gets smaller above ' + fmt(cfg.threshold) + ', where small changes matter more.';
    $('trySlower').disabled = speed <= cfg.min;
    $('tryFaster').disabled = speed >= cfg.max;
    draw();
  }

  function set(v) {
    speed = v;
    if (v !== 1) last = v;
    render();
  }

  $('trySlower').addEventListener('click', () => set(step(-1)));
  $('tryFaster').addEventListener('click', () => set(step(1)));
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.shiftKey && e.code === 'Period') set(step(1));
    else if (e.shiftKey && e.code === 'Comma') set(step(-1));
    else if (!e.shiftKey && e.code === 'KeyR') set(speed === 1 ? last : 1);
    else return;
    e.preventDefault();
  });

  $('openSettings').addEventListener('click', () => browser.runtime.openOptionsPage());
  new ResizeObserver(draw).observe($('tryScale'));

  browser.storage.local.get('settings').then((r) => {
    cfg = GS.normalize(r.settings);
    list = GS.speeds(cfg);
    const d = GS.DEFAULTS;
    if (cfg.stepLow !== d.stepLow || cfg.stepHigh !== d.stepHigh || cfg.threshold !== d.threshold) {
      $('stepsText').textContent = 'With your settings, speed moves ' + cfg.stepLow + '× at a time up to ' + fmt(cfg.threshold) +
        ', then ' + cfg.stepHigh + '×. Change it any time with the tune icon in the speed panel, or the toolbar button.';
    }
    render();
  });
})();
