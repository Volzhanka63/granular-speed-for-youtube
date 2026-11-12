// Settings model, shared by content.js and the settings page.
const GS = (() => {
  'use strict';

  const DEFAULTS = {
    min: 0.25,
    max: 4,
    threshold: 2, // where the step size changes
    stepLow: 0.25, // step below the threshold
    stepHigh: 0.1, // step above the threshold
    presets: [1, 1.5, 2, 2.5, 3, 4],
  };

  // Firefox accepts playbackRate 0.0625..16.
  const LIMITS = { min: 0.1, max: 16, stepMin: 0.01, stepMax: 4, presets: 8 };

  const r2 = (x) => Math.round(x * 100) / 100;
  const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const fit = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

  // Fill in defaults and pull every value into a valid range. Presets keep
  // speeds outside the current range (they come back when the range widens);
  // activePresets() gives the ones in range.
  function normalize(s) {
    if (!s || typeof s !== 'object') s = {};
    const min = r2(fit(num(s.min, DEFAULTS.min), LIMITS.min, LIMITS.max - 0.1));
    const max = r2(fit(num(s.max, DEFAULTS.max), min + 0.1, LIMITS.max));
    const threshold = r2(fit(num(s.threshold, DEFAULTS.threshold), min, max));
    const stepLow = r2(fit(num(s.stepLow, DEFAULTS.stepLow), LIMITS.stepMin, LIMITS.stepMax));
    const stepHigh = r2(fit(num(s.stepHigh, DEFAULTS.stepHigh), LIMITS.stepMin, LIMITS.stepMax));
    const src = Array.isArray(s.presets) ? s.presets : DEFAULTS.presets;
    const presets = [...new Set(src.filter((p) => Number.isFinite(p)).map(r2))]
      .filter((p) => p >= LIMITS.min && p <= LIMITS.max)
      .sort((a, b) => a - b)
      .slice(0, LIMITS.presets);
    return { min, max, threshold, stepLow, stepHigh, presets };
  }

  const activePresets = (s) => s.presets.filter((p) => p >= s.min && p <= s.max);

  // Every speed you can step to. The low grid is anchored at 1x so 1x is
  // always reachable; the high grid starts at the threshold.
  function speeds(s) {
    const out = new Set([s.min, s.threshold, s.max]);
    if (s.min <= 1 && 1 <= s.max) out.add(1);
    const a = s.min <= 1 && 1 <= s.threshold ? 1 : s.threshold;
    for (let k = Math.ceil((s.min - a) / s.stepLow - 1e-9); a + k * s.stepLow <= s.threshold + 1e-9; k++) {
      out.add(r2(a + k * s.stepLow));
    }
    for (let k = 1; s.threshold + k * s.stepHigh <= s.max + 1e-9; k++) {
      out.add(r2(s.threshold + k * s.stepHigh));
    }
    return [...out].filter((x) => x >= s.min && x <= s.max).sort((x, y) => x - y);
  }

  // −/+ buttons move along these ladders instead of a fixed increment, so a
  // step size goes 0.05 → 0.1 → 0.2 → 0.25 in one press each.
  const LADDERS = {
    stepLow: [0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1],
    stepHigh: [0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1],
    min: [0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.75, 1],
    max: [1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8, 10, 12, 16],
  };

  // Settings that the −/+ steppers edit. `name` is the full name for screen
  // readers; the settings page picks the visible wording.
  const times = (x) => x + '×';
  const FIELDS = [
    { key: 'stepLow', name: (s) => 'Step below ' + times(s.threshold) },
    { key: 'threshold', name: () => 'Where steps change' },
    { key: 'stepHigh', name: (s) => 'Step above ' + times(s.threshold) },
    { key: 'min', name: () => 'Slowest speed' },
    { key: 'max', name: () => 'Fastest speed' },
  ];

  function nudge(s, key, dir) {
    const cur = s[key];
    let next;
    if (key === 'threshold') {
      // quarter grid: 2.1 goes up to 2.25 and down to 2
      const q = cur / 0.25;
      next = (dir > 0 ? Math.floor(q + 1e-9) + 1 : Math.ceil(q - 1e-9) - 1) * 0.25;
    } else {
      const L = LADDERS[key];
      next = dir > 0
        ? (L.find((v) => v > cur + 1e-9) ?? cur)
        : (L.findLast((v) => v < cur - 1e-9) ?? cur);
    }
    return normalize({ ...s, [key]: next });
  }

  const canNudge = (s, key, dir) => nudge(s, key, dir)[key] !== s[key];

  const withPreset = (s, v) => normalize({ ...s, presets: [...s.presets, v] });
  const withoutPreset = (s, v) => normalize({ ...s, presets: s.presets.filter((p) => p !== v) });

  return { DEFAULTS, LIMITS, FIELDS, normalize, activePresets, speeds, nudge, canNudge, withPreset, withoutPreset, r2 };
})();
