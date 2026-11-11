(() => {
  'use strict';

  const NUM = ['stepLow', 'threshold', 'stepHigh', 'min', 'max'];
  const $ = (id) => document.getElementById(id);
  const fmt = (x) => x + '×';
  let statusTimer;

  // Read the form. Empty or invalid fields fall back to defaults in normalize().
  function read() {
    const s = {};
    for (const k of NUM) s[k] = parseFloat($(k).value);
    s.presets = $('presets').value
      .split(/[\s,;]+/)
      .filter(Boolean)
      .map((p) => parseFloat(p.replace(/[x×]$/i, '')));
    return s;
  }

  function fill(s) {
    for (const k of NUM) $(k).value = s[k];
    $('presets').value = s.presets.join(', ');
    preview(s);
  }

  function preview(s) {
    $('lowLabel').textContent = 'Step below ' + fmt(s.threshold);
    $('highLabel').textContent = 'Step above ' + fmt(s.threshold);
    $('audioNote').hidden = s.max <= 8;

    const list = GS.speeds(s);
    $('count').textContent = list.length + ' speeds';
    const box = $('preview');
    box.textContent = '';
    const shown = list.length > 48 ? [...list.slice(0, 30), null, ...list.slice(-12)] : list;
    for (const x of shown) {
      const chip = document.createElement('span');
      if (x === null) {
        chip.textContent = '…';
        chip.className = 'gap';
      } else {
        chip.textContent = fmt(x);
        if (x > s.threshold) chip.className = 'hi';
        if (x === 1) chip.className += ' one';
      }
      box.append(chip);
    }
  }

  function flash(text) {
    $('status').textContent = text;
    $('status').classList.add('on');
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => $('status').classList.remove('on'), 1600);
  }

  function save(s, msg) {
    browser.storage.local.set({ settings: s }).then(() => flash(msg));
  }

  // Live preview while typing; save when a field is committed (blur/Enter).
  document.addEventListener('input', () => preview(GS.normalize(read())));
  document.addEventListener('change', () => {
    const raw = read();
    const s = GS.normalize(raw);
    const adjusted = NUM.some((k) => raw[k] !== s[k]) || raw.presets.join() !== s.presets.join();
    fill(s);
    save(s, adjusted ? 'Saved, adjusted to fit' : 'Saved');
  });

  $('reset').addEventListener('click', () => {
    const s = GS.normalize();
    fill(s);
    save(s, 'Defaults restored');
  });

  browser.storage.local.get('settings').then((r) => fill(GS.normalize(r.settings)));
})();
