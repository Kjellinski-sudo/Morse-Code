'use strict';
/* =========================================================
   MORSELINK – components & views
   ========================================================= */

const nav = { tab: 'home', practice: 'key', learn: 'letters', preset: null, statsRange: 7 };
let cleanups = [];
const onCleanup = fn => cleanups.push(fn);
const runCleanups = () => { const c = cleanups; cleanups = []; c.forEach(f => { try { f(); } catch (e) { /* ignore */ } }); };

/* ---------- small shared pieces ---------- */
const put = (el, ...k) => addKids(el, k);
const glyphNodes = code => [...code].map(c => h('i', { class: c === '.' ? 'g-dot' : 'g-dash' }));
const glyphs = (code, cls = '') => h('span', { class: 'glyphs ' + cls, 'aria-label': code.replace(/\./g, t('dot') + ' ').replace(/-/g, t('dash') + ' ') }, glyphNodes(code));
const shuffle = (arr, rand = Math.random) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t_ = Math.imul(a ^ a >>> 15, 1 | a); t_ = t_ + Math.imul(t_ ^ t_ >>> 7, 61 | t_) ^ t_; return ((t_ ^ t_ >>> 14) >>> 0) / 4294967296; };
const poolOf = id => id === 'letters' ? LETTERS : id === 'digits' ? DIGITS : id === 'special' ? SPECIAL : id === 'all' ? ALL : adaptivePool();
const fmtMs = ms => ms ? (ms / 1000).toFixed(2) + ' s' : '–';
const fmtMin = secs => Math.round(secs / 60);
const lamp = () => h('div', { class: 'lamp', 'aria-hidden': 'true' });

function seg(items, current, onSelect, cls = '') {
  const el = h('div', { class: 'seg ' + cls, role: 'tablist' });
  items.forEach(([id, label]) => {
    el.append(h('button', {
      class: 'seg-btn' + (id === current ? ' on' : ''), role: 'tab', 'aria-selected': id === current ? 'true' : 'false', type: 'button',
      onclick: () => onSelect(id)
    }, label));
  });
  return el;
}
function stepper(onChange) {
  const val = h('b', { class: 'mono' }, S.settings.wpm);
  const set = d => { S.settings.wpm = Math.max(5, Math.min(30, S.settings.wpm + d)); val.textContent = S.settings.wpm; save(); onChange && onChange(); };
  return h('div', { class: 'stepper', role: 'group', 'aria-label': 'WPM' },
    h('button', { type: 'button', class: 'btn sm ghost', 'aria-label': '−', onclick: () => set(-1) }, '−'),
    h('span', { class: 'stepper-v' }, val, h('small', {}, ' ' + t('wpm'))),
    h('button', { type: 'button', class: 'btn sm ghost', 'aria-label': '+', onclick: () => set(1) }, '+'));
}
function chip(label, on, onclick) {
  return h('button', { type: 'button', class: 'chip' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', onclick }, label);
}
function openSheet(build) {
  const host = $('#sheet'), local = [];
  const close = () => { local.forEach(f => f()); host.classList.remove('open'); host.replaceChildren(); document.removeEventListener('keydown', esc); };
  const esc = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', esc);
  host.replaceChildren(
    h('div', { class: 'sheet-bg', onclick: close }),
    h('div', { class: 'sheet-panel', role: 'dialog', 'aria-modal': 'true' },
      h('button', { class: 'sheet-close', type: 'button', 'aria-label': t('sos.close'), onclick: close }, '✕'),
      build({ close, onClose: f => local.push(f) })));
  host.classList.add('open');
}

/* ---------- Morse key (tap = dot, hold = dash) ---------- */
function MorseKey({ size = 'lg', onSymbol, onCommit, onSpace, onChange } = {}) {
  let cur = '', downAt = 0, thrT = null, gapT = null, lastAct = 0, sawPointer = false;
  const unit = () => 1200 / S.settings.wpm;
  const thr = () => S.settings.dashMs;
  const gap = () => Math.max(700, 5 * unit());
  const ring = s('svg', { viewBox: '0 0 100 100', class: 'key-ring', 'aria-hidden': 'true' },
    s('circle', { class: 'ring-bg', cx: 50, cy: 50, r: 46 }), s('circle', { class: 'ring-fg', cx: 50, cy: 50, r: 46 }));
  const btn = h('button', { class: 'key key-' + size, type: 'button', 'aria-label': t('key.aria') },
    ring, h('span', { class: 'key-label', 'aria-hidden': 'true' }, h('b', {}, t('key.tap')), h('small', {}, t('key.hold'))));

  function inject(sym) {
    clearTimeout(gapT);
    cur += sym; lastAct = performance.now();
    onSymbol && onSymbol(sym, cur); onChange && onChange(cur);
    if (cur.length >= 8) commit(); else gapT = setTimeout(commit, gap());
  }
  function commit() {
    clearTimeout(gapT);
    if (!cur) return;
    const code = cur; cur = ''; lastAct = performance.now();
    onChange && onChange('');
    onCommit && onCommit(code, REV[code] || null);
  }
  if (S.settings.inputMode === 'paddle') {
    const stops = [];
    const mkPad = sym => {
      const b = h('button', { class: 'pad-key ' + (sym === '.' ? 'dot' : 'dash'), type: 'button', 'aria-label': sym === '.' ? t('dot') : t('dash') }, glyphs(sym, 'lg'));
      let rep = null, saw = false;
      const loop = () => { Audio_.play(sym, { haptic: false }); Haptics.tick(); inject(sym); rep = setTimeout(loop, (sym === '.' ? 2 : 4) * unit()); };
      const stop = () => { clearTimeout(rep); rep = null; b.classList.remove('down'); };
      stops.push(stop);
      b.addEventListener('pointerdown', e => { e.preventDefault(); saw = true; try { b.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } Audio_.ensure(); b.classList.add('down'); if (!rep) loop(); });
      b.addEventListener('pointerup', stop); b.addEventListener('pointercancel', stop);
      b.addEventListener('contextmenu', e => e.preventDefault());
      b.addEventListener('click', () => { if (!saw) inject(sym); saw = false; });
      return b;
    };
    const el = h('div', { class: 'paddle size-' + size }, mkPad('.'), mkPad('-'));
    return {
      el, getCur: () => cur, inject, commit,
      back() { if (!cur) return false; cur = cur.slice(0, -1); clearTimeout(gapT); onChange && onChange(cur); if (cur) gapT = setTimeout(commit, gap()); return true; },
      reset() { clearTimeout(gapT); cur = ''; onChange && onChange(''); },
      destroy() { clearTimeout(gapT); stops.forEach(f => f()); }
    };
  }
  function down(e) {
    if (downAt) return;
    if (e && e.preventDefault) e.preventDefault();
    clearTimeout(gapT);
    const now = performance.now();
    if (!cur && lastAct && now - lastAct > gap() * 3) { lastAct = 0; onSpace && onSpace(); }
    downAt = now; btn.classList.add('down'); btn.classList.remove('dash');
    ring.style.setProperty('--thr', thr() + 'ms'); ring.classList.remove('run'); void ring.getBoundingClientRect(); ring.classList.add('run');
    Audio_.startTone(); Haptics.tick();
    thrT = setTimeout(() => { btn.classList.add('dash'); Haptics.tick(); }, thr());
  }
  function up() {
    if (!downAt) return;
    const d = performance.now() - downAt; downAt = 0; clearTimeout(thrT);
    btn.classList.remove('down', 'dash'); ring.classList.remove('run'); Audio_.stopTone();
    inject(d >= thr() ? '-' : '.');
  }
  btn.addEventListener('pointerdown', e => { sawPointer = true; try { btn.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } down(e); });
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointercancel', up);
  btn.addEventListener('contextmenu', e => e.preventDefault());
  btn.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { sawPointer = true; e.preventDefault(); down(); } });
  btn.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); up(); } });
  btn.addEventListener('click', () => { if (!sawPointer) { Haptics.tick(); inject('.'); } sawPointer = false; }); // VoiceOver / assistive activation
  return {
    el: btn, getCur: () => cur, inject, commit,
    back() { if (!cur) return false; cur = cur.slice(0, -1); clearTimeout(gapT); onChange && onChange(cur); if (cur) gapT = setTimeout(commit, gap()); return true; },
    reset() { clearTimeout(gapT); cur = ''; onChange && onChange(''); },
    destroy() { clearTimeout(gapT); clearTimeout(thrT); Audio_.stopTone(); }
  };
}
/* Dot/Dash alternative buttons for accessibility */
function altButtons(key) {
  return h('div', { class: 'alt-row' },
    h('button', { type: 'button', class: 'btn', onclick: () => { Haptics.tick(); key.inject('.'); } }, h('i', { class: 'g-dot' }), ' ' + t('dot')),
    h('button', { type: 'button', class: 'btn', onclick: () => { Haptics.tick(); key.inject('-'); } }, h('i', { class: 'g-dash' }), ' ' + t('dash')));
}

/* =========================================================
   HOME
   ========================================================= */
function viewHome(root) {
  const lvl = levelOf(S.xp), a = levelStart(lvl), b = levelStart(lvl + 1), pct = (S.xp - a) / (b - a);
  const C = 2 * Math.PI * 42;
  const ringEl = s('svg', { viewBox: '0 0 100 100', class: 'xp-ring', 'aria-hidden': 'true' },
    s('circle', { cx: 50, cy: 50, r: 42, class: 'ring-bg' }),
    s('circle', { cx: 50, cy: 50, r: 42, class: 'ring-fg', style: { strokeDasharray: C, strokeDashoffset: C * (1 - pct) } }));
  const learned = masteredCount(), pool = adaptivePool(), next = pool[pool.length - 1];
  const dailyToday = S.daily[todayKey()], streak = dayStreak();

  const chips = h('div', { class: 'chipgrid', role: 'img', 'aria-label': t('home.learned') + ': ' + learned + '/' + (LETTERS.length + DIGITS.length) },
    [...LETTERS, ...DIGITS].map(c => h('span', { class: 'cell ' + (mastered(c) ? 'm' : S.chars[c] ? 's' : '') }, c)));

  put(root, 
    h('section', { class: 'card hero' },
      h('div', { class: 'hero-ring' }, ringEl, h('div', { class: 'hero-lvl' }, h('small', {}, t('home.station')), h('b', {}, lvl))),
      h('div', { class: 'hero-info' },
        h('h2', {}, t('home.level', lvl)),
        h('div', { class: 'mono muted' }, t('home.xp', S.xp - a, b - a)),
        h('div', { class: 'pill-row' },
          h('span', { class: 'pill' }, '🔥 ' + streak + ' ' + t('home.days')),
          h('span', { class: 'pill' }, '◎ ' + learned + ' ' + t('home.learned'))))),

    h('section', { class: 'card daily' },
      h('div', { class: 'card-head' }, h('h3', {}, t('home.daily')), dailyToday ? h('span', { class: 'badge ok' }, '✓ ' + t('home.daily.done')) : h('span', { class: 'badge' }, 'NEW')),
      h('p', { class: 'muted' }, t('home.daily.desc')),
      dailyToday ? h('div', { class: 'daily-res mono' },
        h('span', {}, dailyToday.score + ' ' + t('points')), h('span', {}, Math.round(dailyToday.acc * 100) + '%'), h('span', {}, dailyToday.secs.toFixed(1) + ' s')) : null,
      S.dailyBest ? h('div', { class: 'muted small' }, '★ ' + t('home.best') + ': ' + S.dailyBest.score + ' ' + t('points') + ' · ' + S.dailyBest.secs.toFixed(1) + ' s') : null,
      h('button', { class: 'btn primary wide', type: 'button', onclick: () => go('daily') }, dailyToday ? t('home.daily.again') : t('home.daily.start'))),

    h('div', { class: 'grid2' },
      h('button', { class: 'card tile', type: 'button', onclick: () => go('practice', 'key') },
        h('div', { class: 'tile-ico' }, glyphs('.-.')), h('b', {}, t('home.quick')), h('span', { class: 'muted' }, t('home.quick.desc'))),
      h('button', { class: 'card tile sos-tile', type: 'button', onclick: openSOS },
        h('div', { class: 'tile-ico mono' }, 'SOS'), h('b', {}, t('sos.title')), h('span', { class: 'muted' }, '··· ––– ···'))),

    h('section', { class: 'card' },
      h('div', { class: 'card-head' }, h('h3', {}, t('home.progress')), h('span', { class: 'mono muted' }, learned + '/36')),
      chips,
      h('div', { class: 'muted small' }, t('home.next', next)),
      h('button', { class: 'btn wide', type: 'button', onclick: () => { nav.preset = { mode: 'm2l', pool: 'adaptive' }; go('practice', 'quiz'); } }, t('home.train'))));
}

/* =========================================================
   PRACTICE
   ========================================================= */
function viewPractice(root) {
  const tabs = [['key', t('p.key')], ['t2m', t('p.t2m')], ['m2t', t('p.m2t')], ['hear', t('p.hear')], ['quiz', t('p.quiz')]];
  const body = h('div', { class: 'practice-body' });
  put(root, seg(tabs, nav.practice, id => { nav.practice = id; nav.preset = null; render(); }, 'scroll'), body);
  ({ key: practiceKey, t2m: practiceT2M, m2t: practiceM2T, hear: p => quizSetup(p, 'hear'), quiz: p => quizSetup(p, 'm2l') })[nav.practice](body);
}

function practiceKey(root) {
  let text = '';
  const out = h('div', { class: 'lcd-text', 'aria-live': 'polite' });
  const codeEl = h('div', { class: 'lcd-code' });
  const candEl = h('div', { class: 'lcd-cand' }, '·');
  function refresh(cur) {
    codeEl.replaceChildren(...glyphNodes(cur));
    const ch = cur ? REV[cur] : null;
    candEl.textContent = cur ? (ch || '?') : '·';
    candEl.classList.toggle('bad', !!cur && !ch);
    out.replaceChildren(text, h('span', { class: 'cursor' }, '▌'));
  }
  const key = MorseKey({
    onChange: refresh,
    onCommit: (code, ch) => {
      if (ch) text += ch; else { Haptics.bad(); candEl.classList.add('shake'); setTimeout(() => candEl.classList.remove('shake'), 400); }
      refresh('');
    },
    onSpace: () => { if (text && !text.endsWith(' ')) { text += ' '; refresh(key.getCur()); } }
  });
  onCleanup(() => key.destroy());
  refresh('');
  put(root, 
    h('section', { class: 'lcd card' },
      h('div', { class: 'lcd-top' }, h('span', { class: 'mono muted' }, 'TX'), stepper(), h('span', { class: 'mono muted' }, S.settings.freq + ' Hz')),
      h('div', { class: 'lcd-mid' }, codeEl, candEl), out),
    seg([['key', t('mode.key')], ['paddle', t('mode.paddle')]], S.settings.inputMode, v => { S.settings.inputMode = v; save(); render(); }, 'inline'),
    h('div', { class: 'key-wrap' }, key.el, h('div', { class: 'muted small center' }, S.settings.inputMode === 'paddle' ? t('key.hint2') : t('key.hint'))),
    S.settings.altInput ? altButtons(key) : null,
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn', type: 'button', onclick: () => { if (!key.back()) { text = text.slice(0, -1); refresh(''); } } }, '⌫ ' + t('key.back')),
      h('button', { class: 'btn', type: 'button', onclick: () => { text += text && !text.endsWith(' ') ? ' ' : ''; refresh(key.getCur()); } }, '␣ ' + t('key.space')),
      h('button', { class: 'btn ghost', type: 'button', onclick: () => { text = ''; key.reset(); refresh(''); } }, t('key.clear'))));
}

function practiceT2M(root) {
  const input = h('textarea', { class: 'field', rows: 3, maxlength: 200, placeholder: t('t2m.ph'), 'aria-label': t('p.t2m'), autocapitalize: 'characters', spellcheck: 'false' });
  input.value = nav.t2mText ?? 'SOS';
  const outEl = h('div', { class: 'morse-out mono', 'aria-live': 'polite' });
  const L_ = lamp();
  const opt = { sound: S.settings.sound, light: S.settings.flash, vib: S.settings.vibration };
  let player = null, toks = [], spans = [];
  const playBtn = h('button', { class: 'btn primary', type: 'button' }, '▶ ' + t('play'));
  function stopPlay() { if (player) { player.stop(); player = null; } playBtn.textContent = '▶ ' + t('play'); spans.forEach(sp => sp.classList.remove('active')); L_.classList.remove('on'); }
  function rebuild() {
    stopPlay(); nav.t2mText = input.value;
    toks = tokenize(input.value); spans = [];
    outEl.replaceChildren(...toks.map(tk => { const sp = h('span', { class: 'tok' + (tk.code === '/' ? ' wordsep' : '') }, tk.code === '/' ? '/' : tk.code.replace(/\./g, '·').replace(/-/g, '–')); sp.title = tk.ch; spans.push(sp); return sp; }));
    if (!toks.length) outEl.textContent = '…';
  }
  input.addEventListener('input', rebuild);
  playBtn.onclick = () => {
    if (player) return stopPlay();
    if (!toks.length) return;
    playBtn.textContent = '■ ' + t('stop');
    player = Audio_.play(toks.map(x => x.code).join(' '), {
      sound: opt.sound, haptic: opt.vib,
      onTone: (on, e) => {
        L_.classList.toggle('on', on && opt.light);
        if (on) { spans.forEach(sp => sp.classList.remove('active')); spans[e.tok] && spans[e.tok].classList.add('active'); }
      }
    });
    const p = player; p.done.then(r => { if (player === p) { player = null; stopPlay(); } });
  };
  onCleanup(stopPlay);
  put(root, 
    h('section', { class: 'card' }, input),
    h('section', { class: 'card lcd' },
      h('div', { class: 'lcd-top' }, h('span', { class: 'mono muted' }, 'MORSE'), stepper()),
      outEl),
    h('section', { class: 'card flash-card' }, L_,
      h('div', { class: 'chips' },
        chip('🔊 ' + t('sound'), opt.sound, e => { opt.sound = !opt.sound; e.currentTarget.classList.toggle('on', opt.sound); e.currentTarget.setAttribute('aria-pressed', opt.sound); }),
        chip('💡 ' + t('light'), opt.light, e => { opt.light = !opt.light; e.currentTarget.classList.toggle('on', opt.light); e.currentTarget.setAttribute('aria-pressed', opt.light); }),
        chip('📳 ' + t('vib'), opt.vib, e => { opt.vib = !opt.vib; e.currentTarget.classList.toggle('on', opt.vib); e.currentTarget.setAttribute('aria-pressed', opt.vib); }))),
    h('div', { class: 'btn-row' }, playBtn,
      h('button', { class: 'btn ghost', type: 'button', onclick: async () => { try { await navigator.clipboard.writeText(toks.map(x => x.code).join(' ')); toast(t('copied')); } catch (e) { /* ignore */ } } }, t('copy'))),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn', type: 'button', onclick: () => {
        if (!toks.length) return;
        const txt = input.value.trim() + '\n' + toks.map(x => x.code).join(' ');
        if (navigator.share) navigator.share({ text: txt }).catch(() => { });
        else navigator.clipboard && navigator.clipboard.writeText(txt).then(() => toast(t('copied')));
      } }, '↗ ' + t('share')),
      h('button', { class: 'btn', type: 'button', onclick: () => {
        if (!toks.length) return;
        const blob = Audio_.wav(toks.map(x => x.code).join(' '), S.settings.wpm), file = new File([blob], 'morse.wav', { type: 'audio/wav' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], text: input.value.trim() }).catch(() => { });
        else { const a = h('a', { href: URL.createObjectURL(blob), download: 'morse.wav' }); document.body.append(a); a.click(); a.remove(); toast(t('saved')); }
      } }, '♪ ' + t('share.audio'))));
  rebuild();
}

function practiceM2T(root) {
  const input = h('textarea', { class: 'field mono', rows: 3, maxlength: 600, placeholder: t('m2t.ph'), 'aria-label': t('p.m2t'), autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false' });
  input.value = nav.m2tText ?? '';
  const res = h('div', { class: 'lcd-text big', 'aria-live': 'polite' });
  const parts = h('div', { class: 'parts' });
  function update() {
    nav.m2tText = input.value;
    const { text, parts: p } = decodeMorse(input.value);
    res.textContent = text || '…';
    parts.replaceChildren(...p.filter(x => x.ch !== ' ').map(x => h('span', { class: 'part' + (x.ch === '?' ? ' bad' : '') }, h('b', {}, x.ch), h('small', { class: 'mono' }, x.code.replace(/\./g, '·').replace(/-/g, '–')))));
  }
  const ins = txt => () => { Haptics.tick(); input.value += txt; input.dispatchEvent(new Event('input')); input.focus({ preventScroll: true }); };
  input.addEventListener('input', update);
  put(root, 
    h('section', { class: 'card' }, input,
      h('div', { class: 'padrow' },
        h('button', { type: 'button', class: 'btn pad', 'aria-label': t('dot'), onclick: ins('.') }, h('i', { class: 'g-dot' })),
        h('button', { type: 'button', class: 'btn pad', 'aria-label': t('dash'), onclick: ins('-') }, h('i', { class: 'g-dash' })),
        h('button', { type: 'button', class: 'btn pad', onclick: ins(' ') }, '␣ ' + t('letterGap')),
        h('button', { type: 'button', class: 'btn pad', onclick: ins(' / ') }, '/ ' + t('wordGap')),
        h('button', { type: 'button', class: 'btn pad', 'aria-label': t('key.back'), onclick: () => { input.value = input.value.slice(0, -1); update(); } }, '⌫')),
      h('div', { class: 'muted small' }, t('m2t.help'))),
    h('section', { class: 'card lcd' }, h('div', { class: 'lcd-top' }, h('span', { class: 'mono muted' }, 'RX · ' + t('m2t.result'))), res, parts));
  update();
}

/* ---------- Quiz ---------- */
function quizSetup(root, preset) {
  const cfg = Object.assign({ mode: preset, pool: 'adaptive' }, nav.preset || {});
  if (nav.practice === 'hear') cfg.mode = 'hear';
  const modes = [['m2l', 'q.m2l', 'q.m2l.d'], ['l2m', 'q.l2m', 'q.l2m.d'], ['hear', 'q.hear', 'q.hear.d'], ['word', 'q.word', 'q.word.d']];
  const pools = ['adaptive', 'letters', 'digits', 'special', 'all'];
  function draw() {
    root.replaceChildren(
      h('section', { class: 'card' }, h('h3', {}, t('q.mode')),
        h('div', { class: 'modes' }, modes.map(([id, l, d]) => h('button', {
          type: 'button', class: 'mode' + (cfg.mode === id ? ' on' : ''), 'aria-pressed': cfg.mode === id ? 'true' : 'false',
          onclick: () => { cfg.mode = id; draw(); }
        }, h('b', {}, t(l)), h('small', { class: 'muted' }, t(d)))))),
      cfg.mode === 'word' ? null : h('section', { class: 'card' }, h('h3', {}, t('q.pool')),
        h('div', { class: 'chips' }, pools.map(p => chip(t('pool.' + p), cfg.pool === p, () => { cfg.pool = p; draw(); }))),
        cfg.pool === 'adaptive' ? h('div', { class: 'muted small' }, t('q.adaptive.info', adaptivePool().join(' '))) : null),
      h('button', { class: 'btn primary wide big', type: 'button', onclick: () => { Audio_.ensure(); run(); } }, '▶ ' + t('q.start')));
  }
  function run() {
    nav.preset = { mode: cfg.mode, pool: cfg.pool };
    root.replaceChildren();
    Quiz(root, { mode: cfg.mode, pool: poolOf(cfg.pool), total: 10, onExit: draw, onAgain: run });
  }
  draw();
}

function Quiz(root, cfg) {
  const rand = cfg.rand || Math.random;
  const st = { i: 0, ok: 0, msSum: 0, msN: 0, xp: 0, streak: 0, best: 0, wpm: Math.round(S.hearWpm || S.settings.wpm), start: performance.now(), last: null, q: null, locked: false };
  let timers = [], player = null, key = null, tick = null;
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); };
  const cleanup = () => { timers.forEach(clearTimeout); clearInterval(tick); if (player) player.stop(); if (key) key.destroy(); };
  onCleanup(cleanup);

  const bar = h('i'), info = h('span', { class: 'mono' }), side = h('span', { class: 'mono muted' });
  const head = h('div', { class: 'qhead' }, h('div', { class: 'qbar' }, bar), h('div', { class: 'qinfo' }, info, side));
  const body = h('div', { class: 'qbody' });
  put(root, head, body);
  if (cfg.daily) tick = setInterval(() => { side.textContent = ((performance.now() - st.start) / 1000).toFixed(1) + ' s'; }, 100);

  function updateHead() {
    bar.style.width = ((st.i - 1) / cfg.total * 100) + '%';
    info.textContent = t('q.of', st.i, cfg.total);
    if (!cfg.daily) side.textContent = (st.streak ? '🔥' + st.streak : '') + (cfg.mode === 'hear' || cfg.mode === 'word' ? '  ' + st.wpm + ' ' + t('wpm') : '');
  }
  function choices(correct, n) {
    const pool = cfg.pool.length >= n ? cfg.pool : [...new Set([...cfg.pool, ...LETTERS, ...DIGITS])];
    const others = shuffle(pool.filter(c => c !== correct), rand).slice(0, n - 1);
    return shuffle([correct, ...others], rand);
  }
  function next() {
    if (st.i >= cfg.total) return finish();
    st.i++; st.locked = false;
    let ch;
    if (cfg.mode === 'word') {
      const list = WORDS[S.settings.lang] || WORDS.de;
      do { ch = list[Math.floor(rand() * list.length)]; } while (ch === st.last);
      st.last = ch; st.q = { ch, code: tokenize(ch).map(x => x.code).join(' '), t0: 0 };
      updateHead(); return drawChoice();
    }
    ch = cfg.seq ? cfg.seq[st.i - 1] : pickChar(cfg.pool, st.last, rand);
    st.last = ch; st.q = { ch, code: MORSE[ch], t0: 0 };
    updateHead();
    if (cfg.mode === 'l2m') drawL2M(); else drawChoice();
  }
  function fbBox() { return h('div', { class: 'fb', 'aria-live': 'assertive' }); }
  function answer(ok, btnEl) {
    if (st.locked) return; st.locked = true;
    const ms = st.q.t0 ? performance.now() - st.q.t0 : 0;
    if (player) { player.stop(); player = null; }
    if (cfg.mode === 'word') { const d = dayStats(); d.n++; if (ok) d.ok++; const g = ok ? 15 : 0; addXP(g); st.xp += g; if (ok) { S.curStreak++; S.bestStreak = Math.max(S.bestStreak, S.curStreak); } else S.curStreak = 0; }
    else st.xp += record({ ch: st.q.ch, ok, ms });
    if (ok) { st.ok++; st.streak++; st.best = Math.max(st.best, st.streak); if (ms) { st.msSum += ms; st.msN++; } } else st.streak = 0;
    if (cfg.mode === 'hear' && !cfg.daily) { st.wpm = ok ? (st.streak >= 3 ? Math.min(30, st.wpm + 1) : st.wpm) : Math.max(8, st.wpm - 1); S.hearWpm = st.wpm; save(); }
    ok ? Haptics.ok() : Haptics.bad();
    body.querySelectorAll('.choice').forEach(b => { b.disabled = true; if (b.dataset.c === st.q.ch) b.classList.add('ok'); });
    if (btnEl && !ok) btnEl.classList.add('bad');
    const fb = body.querySelector('.fb');
    if (fb) { fb.className = 'fb show ' + (ok ? 'ok' : 'bad'); fb.replaceChildren(ok ? t('q.correct') : t('q.wrong') + ' ', ok ? '' : h('b', {}, st.q.ch), ' ', cfg.mode === 'word' ? '' : glyphs(st.q.code, 'sm')); }
    body.classList.add(ok ? 'flash-ok' : 'flash-bad');
    updateHead();
    later(next, ok ? 750 : 1800);
  }
  function drawChoice() {
    body.className = 'qbody'; const word = cfg.mode === 'word', hear = cfg.mode === 'hear' || word;
    const stage = hear
      ? h('div', { class: 'orb' }, h('div', { class: 'orb-core' }, '?'), h('div', { class: 'muted' }, t('q.listenq')))
      : h('div', { class: 'codeshow' }, glyphs(st.q.code, 'xl'), h('div', { class: 'muted small' }, t('q.listenq')));
    const opts = word ? shuffle([st.q.ch, ...shuffle((WORDS[S.settings.lang] || WORDS.de).filter(w => w !== st.q.ch), rand).slice(0, 3)], rand) : choices(st.q.ch, hear ? 6 : 4);
    const grid = h('div', { class: 'choices n' + (word ? 'w' : hear ? 6 : 4) }, opts.map(c =>
      h('button', { class: 'choice' + (word ? ' word' : ''), type: 'button', 'data-c': c, onclick: e => answer(c === st.q.ch, e.currentTarget) }, c)));
    const replay = h('button', { class: 'btn ghost', type: 'button', onclick: () => playQ() }, '↻ ' + t('q.replay'));
    body.replaceChildren(stage, grid, replay, fbBox());
    const orb = stage;
    function playQ() {
      if (player) player.stop();
      orb.classList.add('playing');
      st.q.t0 = 0;
      player = Audio_.play(st.q.code, {
        wpm: hear ? st.wpm : undefined, sound: hear ? true : undefined,
        onTone: on => { orb.classList.toggle('pulse', on); }
      });
      const p = player;
      p.done.then(r => { orb.classList.remove('playing', 'pulse'); if (r === 'done' && !st.locked) st.q.t0 = performance.now(); });
    }
    if (hear) later(playQ, 350);
    else { st.q.t0 = performance.now(); if (S.settings.sound) later(() => { const keep = st.q.t0; playQ(); st.q.t0 = keep; }, 250); }
  }
  function drawL2M() {
    body.className = 'qbody';
    if (key) key.destroy();
    const codeEl = h('div', { class: 'lcd-code' }), candEl = h('div', { class: 'lcd-cand' }, '·');
    key = MorseKey({
      size: 'md',
      onChange: cur => { codeEl.replaceChildren(...glyphNodes(cur)); candEl.textContent = cur ? (REV[cur] || '?') : '·'; },
      onCommit: code => { if (!st.locked) answer(code === st.q.code); }
    });
    st.q.t0 = performance.now();
    body.replaceChildren(
      h('div', { class: 'codeshow' }, h('div', { class: 'muted small' }, t('q.tapcode')), h('div', { class: 'bigchar' }, st.q.ch)),
      h('div', { class: 'lcd card' }, h('div', { class: 'lcd-mid' }, codeEl, candEl)),
      h('div', { class: 'key-wrap' }, key.el),
      ...(S.settings.altInput ? [altButtons(key)] : []),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn', type: 'button', onclick: () => key.back() }, '⌫'),
        h('button', { class: 'btn primary', type: 'button', onclick: () => key.commit() }, t('q.check')),
        h('button', { class: 'btn ghost', type: 'button', onclick: () => answer(false) }, t('q.hint'))),
      fbBox());
  }
  function finish() {
    clearInterval(tick); if (key) key.destroy();
    const secs = (performance.now() - st.start) / 1000, acc = st.ok / cfg.total;
    let extra = null;
    if (cfg.daily) {
      const score = st.ok * 100 + Math.max(0, Math.round((90 - secs) * 10 * acc));
      const date = todayKey(), prev = S.daily[date];
      if (!prev) addXP(50);
      if (!prev || score > prev.score) S.daily[date] = { score, ok: st.ok, total: cfg.total, secs, acc };
      const newBest = !S.dailyBest || score > S.dailyBest.score;
      if (newBest) S.dailyBest = { score, secs, date };
      save(); extra = { score, newBest };
    }
    const stat = (v, l) => h('div', { class: 'stat' }, h('b', { class: 'mono' }, v), h('small', {}, l));
    body.className = 'qbody'; head.style.display = 'none';
    body.replaceChildren(h('section', { class: 'card result' },
      extra && extra.newBest ? h('div', { class: 'badge ok glow' }, '★ ' + t('r.newbest')) : null,
      h('h2', {}, t('r.title')),
      extra ? h('div', { class: 'score mono' }, extra.score, h('small', {}, ' ' + t('points'))) : h('div', { class: 'score mono' }, Math.round(acc * 100) + '%'),
      h('div', { class: 'grid3' },
        stat(Math.round(acc * 100) + '%', t('r.acc')), stat(st.msN ? fmtMs(st.msSum / st.msN) : '–', t('r.avg')),
        stat(cfg.daily ? secs.toFixed(1) + ' s' : '+' + st.xp, cfg.daily ? t('r.time') : t('r.xp'))),
      h('div', { class: 'muted small center' }, t('r.streak') + ': ' + st.best),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn primary', type: 'button', onclick: () => cfg.onAgain ? cfg.onAgain() : go('daily') }, t('r.again')),
        h('button', { class: 'btn', type: 'button', onclick: () => cfg.onExit() }, t('r.done')))));
    Haptics.ok();
  }
  next();
}

/* ---------- Daily ---------- */
function viewDaily(root) {
  const date = todayKey();
  const rand = mulberry([...date].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7));
  const pool = [...LETTERS, ...DIGITS], seq = []; let last = null;
  for (let i = 0; i < 20; i++) { let c; do { c = pool[Math.floor(rand() * pool.length)]; } while (c === last); seq.push(c); last = c; }
  put(root, h('div', { class: 'daily-title' }, h('b', {}, t('home.daily')), h('span', { class: 'mono muted' }, date)));
  Audio_.ensure();
  Quiz(root, { mode: 'm2l', total: 20, seq, daily: true, rand, pool, onExit: () => go('home'), onAgain: () => render() });
}

/* =========================================================
   LEARN
   ========================================================= */
function viewLearn(root) {
  const tabs = [['letters', t('l.letters')], ['digits', t('l.digits')], ['special', t('l.special')], ['tree', t('l.tree')]];
  put(root, seg(tabs, nav.learn, id => { nav.learn = id; render(); }, 'scroll'));
  if (nav.learn === 'tree') return viewTree(root);
  const set = poolOf(nav.learn), n = set.filter(mastered).length;
  put(root, 
    h('section', { class: 'card setinfo' },
      h('div', {}, h('b', {}, t('l.setdesc', n, set.length)), h('div', { class: 'meter' }, h('i', { style: { width: (n / set.length * 100) + '%' } }))),
      h('button', { class: 'btn primary', type: 'button', onclick: () => { nav.preset = { mode: 'm2l', pool: nav.learn }; go('practice', 'quiz'); } }, t('l.train'))),
    h('div', { class: 'cards' }, set.map(ch => {
      const c = S.chars[ch];
      return h('button', { class: 'ccard' + (mastered(ch) ? ' m' : c ? ' s' : ''), type: 'button', 'aria-label': ch + ' ' + MORSE[ch], onclick: () => charSheet(ch) },
        h('b', {}, ch), glyphs(MORSE[ch], 'sm'));
    })));
}
function charSheet(ch) {
  openSheet(({ onClose }) => {
    const code = MORSE[ch], L_ = lamp();
    let player = null, key = null, ok = false;
    onClose(() => { if (player) player.stop(); if (key) key.destroy(); });
    const gl = glyphs(code, 'xl');
    const playIt = () => { if (player) player.stop(); player = Audio_.play(code, { onTone: on => L_.classList.toggle('on', on), haptic: S.settings.vibration }); };
    const c = S.chars[ch] || { n: 0, ok: 0, best: 0 };
    const codeEl = h('div', { class: 'lcd-code' }), msg = h('div', { class: 'fb show', style: { visibility: 'hidden' } }, ' ');
    key = MorseKey({
      size: 'md', onChange: cur => { codeEl.replaceChildren(...glyphNodes(cur)); },
      onCommit: cd => {
        ok = cd === code; record({ ch, ok, ms: 0 }); ok ? Haptics.ok() : Haptics.bad();
        msg.style.visibility = 'visible'; msg.className = 'fb show ' + (ok ? 'ok' : 'bad'); msg.textContent = ok ? t('q.correct') : t('q.wrong') + ' ' + ch + ' ' + code.replace(/\./g, '·').replace(/-/g, '–');
      }
    });
    return h('div', { class: 'sheet-body' },
      h('div', { class: 'sheet-char' }, ch), gl, L_,
      h('button', { class: 'btn primary', type: 'button', onclick: () => { Audio_.ensure(); playIt(); } }, '▶ ' + t('play')),
      h('div', { class: 'grid3' },
        h('div', { class: 'stat' }, h('b', { class: 'mono' }, c.n), h('small', {}, t('l.attempts'))),
        h('div', { class: 'stat' }, h('b', { class: 'mono' }, c.n ? Math.round(c.ok / c.n * 100) + '%' : '–'), h('small', {}, t('l.acc'))),
        h('div', { class: 'stat' }, h('b', { class: 'mono' }, fmtMs(c.best)), h('small', {}, t('l.best')))),
      MNEMO[ch] && S.settings.lang === 'de' ? h('div', { class: 'mnemo' }, h('small', { class: 'muted' }, '💡 ' + t('l.mnemo') + ' – ' + t('l.mnemo.d')),
        h('div', { class: 'mnemo-w' }, MNEMO[ch].split('-').map(sy => h('span', { class: 'syl ' + (sy === sy.toUpperCase() ? 'dash' : 'dot') }, sy)))) : null,
      h('h3', {}, t('l.try')), h('div', { class: 'muted small' }, t('l.tryinfo') + ' ' + ch),
      codeEl, h('div', { class: 'key-wrap' }, key.el), S.settings.altInput ? altButtons(key) : null, msg);
  });
}

/* ---------- Morse tree ---------- */
function viewTree(root) {
  const D = 5, SLOT = 24, ROW = 78, PAD = 36, nodes = new Map();
  nodes.set('', { code: '', ch: null, d: 0 });
  for (const [ch, code] of Object.entries(MORSE)) {
    if (code.length > D) continue;
    for (let i = 1; i <= code.length; i++) { const c = code.slice(0, i); if (!nodes.has(c)) nodes.set(c, { code: c, ch: REV[c] || null, d: i }); }
  }
  const xOf = code => { let bits = 0; for (const c of code) bits = (bits << 1) | (c === '-' ? 1 : 0); const d = code.length; return ((bits << (D - d + 1)) + (1 << (D - d))) * SLOT; };
  const yOf = d => PAD + d * ROW;
  const W = 64 * SLOT, H = PAD * 2 + D * ROW;
  let cur = '', zoom = window.innerWidth > 800 ? 1 : 0.8, player = null;
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'tree', role: 'img', 'aria-label': t('l.tree') });
  const gEdges = s('g'), gNodes = s('g');
  svg.append(gEdges, gNodes);
  const els = new Map();
  for (const [code, n] of nodes) {
    if (!code) continue;
    const parent = code.slice(0, -1), sym = code.slice(-1) === '.' ? 'dot' : 'dash';
    const p1 = { x: xOf(parent), y: yOf(parent.length) }, p2 = { x: xOf(code), y: yOf(code.length) };
    const edge = s('line', { class: 'edge ' + sym, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, style: { '--d': n.d } });
    gEdges.append(edge);
    const g = s('g', { class: 'node ' + sym, transform: `translate(${p2.x},${p2.y})`, tabindex: '0', role: 'button', 'aria-label': (n.ch || '') + ' ' + code, style: { '--d': n.d } },
      s('circle', { r: n.d >= 5 ? 14 : 17 }), s('text', { y: 1 }, n.ch || ''));
    const act = () => setCur(code, true);
    g.addEventListener('click', act);
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
    gNodes.append(g); els.set(code, { g, edge });
  }
  const rootG = s('g', { class: 'node start', transform: `translate(${xOf('')},${yOf(0)})`, tabindex: '0', role: 'button', 'aria-label': t('tree.start') },
    s('circle', { r: 22 }), s('text', { y: 1, class: 'small' }, t('tree.start')));
  rootG.addEventListener('click', () => setCur('', true));
  gNodes.append(rootG); els.set('', { g: rootG });

  const info = h('div', { class: 'tree-info', 'aria-live': 'polite' });
  const wrap = h('div', { class: 'tree-wrap' }, svg);
  const applyZoom = () => { svg.style.width = (W * zoom) + 'px'; svg.style.height = (H * zoom) + 'px'; };
  function setCur(code, play) {
    cur = code;
    for (const [c, { g, edge }] of els) {
      const on = code.startsWith(c) && c !== code || c === code;
      g.classList.toggle('on', on && c !== ''); g.classList.toggle('cur', c === code);
      if (edge) edge.classList.toggle('on', on);
    }
    rootG.classList.toggle('cur', code === '');
    const n = nodes.get(code);
    info.replaceChildren(
      h('span', { class: 'tree-path' }, code ? glyphs(code, 'md') : h('span', { class: 'muted' }, t('tree.help'))),
      h('span', { class: 'tree-char' }, code ? (n.ch || '·') : '·'));
    const x = xOf(code) * zoom;
    wrap.scrollTo({ left: x - wrap.clientWidth / 2, behavior: 'smooth' });
    if (play && code) { if (player) player.stop(); Audio_.ensure(); player = Audio_.play(code, { haptic: S.settings.vibration }); }
  }
  function step(sym) {
    const nx = cur + sym;
    if (!nodes.has(nx)) { Haptics.bad(); toast(t('tree.none')); return; }
    Haptics.tick(); setCur(nx, true);
  }
  onCleanup(() => { if (player) player.stop(); });
  put(root, 
    h('section', { class: 'card lcd' }, info),
    h('div', { class: 'btn-row tree-ctl' },
      h('button', { class: 'btn', type: 'button', onclick: () => step('.') }, h('i', { class: 'g-dot' }), ' ' + t('dot')),
      h('button', { class: 'btn', type: 'button', onclick: () => step('-') }, h('i', { class: 'g-dash' }), ' ' + t('dash')),
      h('button', { class: 'btn ghost', type: 'button', onclick: () => setCur(cur.slice(0, -1), false) }, '⌫'),
      h('button', { class: 'btn ghost', type: 'button', onclick: () => setCur('', false) }, '⟲ ' + t('tree.reset')),
      h('button', { class: 'btn ghost', type: 'button', 'aria-label': t('tree.zoomout'), onclick: () => { zoom = Math.max(0.4, zoom - 0.2); applyZoom(); } }, '−'),
      h('button', { class: 'btn ghost', type: 'button', 'aria-label': t('tree.zoomin'), onclick: () => { zoom = Math.min(2, zoom + 0.2); applyZoom(); } }, '+')),
    wrap);
  applyZoom();
  setTimeout(() => wrap.scrollTo({ left: (W * zoom - wrap.clientWidth) / 2 }), 0);
}

/* =========================================================
   STATS
   ========================================================= */
function viewStats(root) {
  const total = Object.values(S.chars).reduce((a, c) => a + c.n, 0), okc = Object.values(S.chars).reduce((a, c) => a + c.ok, 0);
  const wpm = S.hearWpm || S.settings.wpm, td = S.days[todayKey()];
  const card = (v, l, sub) => h('div', { class: 'card stat-card' }, h('b', { class: 'mono' }, v), h('small', {}, l), sub ? h('span', { class: 'muted small' }, sub) : null);
  const days = [];
  for (let i = nav.statsRange - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = d.toLocaleDateString('sv'); days.push({ k, d, ...(S.days[k] || { n: 0, ok: 0, secs: 0 }) }); }

  function chart(title, valueOf, maxV, cls, fmt) {
    const N = days.length, W = 300, Hh = 100, bw = W / N;
    const svgEl = s('svg', { viewBox: `0 0 ${W} ${Hh + 16}`, class: 'chart ' + cls, role: 'img', 'aria-label': title, preserveAspectRatio: 'none' });
    [0, .5, 1].forEach(f => svgEl.append(s('line', { x1: 0, x2: W, y1: Hh - f * Hh * .9, y2: Hh - f * Hh * .9, class: 'grid' })));
    days.forEach((d, i) => {
      const v = valueOf(d), hh = maxV ? Math.min(1, v / maxV) * Hh * .9 : 0;
      svgEl.append(s('rect', { x: i * bw + bw * .18, y: Hh - hh, width: bw * .64, height: Math.max(hh, v ? 2 : 0), rx: 2, class: 'bar' }, s('title', {}, d.k + ': ' + fmt(v))));
      if (N <= 7 || i % 5 === 0) svgEl.append(s('text', { x: i * bw + bw / 2, y: Hh + 12, class: 'ax' }, N <= 7 ? d.d.toLocaleDateString(S.settings.lang, { weekday: 'short' }).slice(0, 2) : d.d.getDate()));
    });
    return h('section', { class: 'card' }, h('h3', {}, title), svgEl);
  }
  const maxN = Math.max(10, ...days.map(d => d.n));
  const learned = ALL.filter(mastered).length;

  put(root, 
    h('div', { class: 'grid2 stats' },
      card(total, t('s.total')),
      card(total ? Math.round(okc / total * 100) + '%' : '–', t('s.acc')),
      card(fmtMs(S.fastest), t('s.fastest')),
      card(S.msN ? fmtMs(S.sumMs / S.msN) : '–', t('s.avg')),
      card(wpm, t('s.wpm')),
      card(S.bestStreak, t('s.streak')),
      card(learned + '/' + ALL.length, t('s.learned')),
      card(td ? fmtMin(td.secs) + ' ' + t('s.min') : '0 ' + t('s.min'), t('s.today')),
      card(S.xp, t('s.xp'), t('home.level', levelOf(S.xp))),
      card(dayStreak(), t('s.days'))),
    seg([[7, t('s.range7')], [30, t('s.range30')]], nav.statsRange, v => { nav.statsRange = v; render(); }),
    chart(t('s.chart1'), d => d.n, maxN, 'c1', v => v),
    chart(t('s.chart2'), d => d.n ? d.ok / d.n * 100 : 0, 100, 'c2', v => Math.round(v) + '%'),
    chart(t('s.today') + ' (' + t('s.min') + ')', d => d.secs / 60, Math.max(5, ...days.map(d => d.secs / 60)), 'c3', v => v.toFixed(1)),
    h('section', { class: 'card' }, h('h3', {}, t('s.badges') + ' · ' + Object.keys(S.badges).length + '/' + BADGES.length),
      h('div', { class: 'badges' }, BADGES.map(b => h('div', { class: 'bdg' + (S.badges[b.id] ? ' on' : ''), title: b[S.settings.lang] },
        h('span', { class: 'bdg-i' }, b.ico), h('small', {}, b[S.settings.lang]))))),
    h('section', { class: 'card' }, h('h3', {}, t('s.matrix')),
      h('div', { class: 'matrix' }, ALL.map(ch => {
        const c = S.chars[ch], acc = c && c.n ? c.ok / c.n : -1;
        return h('button', { type: 'button', class: 'mcell', style: { '--a': acc < 0 ? 0 : 0.18 + acc * 0.82 }, 'data-state': acc < 0 ? 'none' : acc < .6 ? 'low' : acc < .85 ? 'mid' : 'hi', onclick: () => charSheet(ch), title: ch + (c ? ' · ' + Math.round(acc * 100) + '% (' + c.n + ')' : '') }, ch);
      }))));
}

/* =========================================================
   SETTINGS
   ========================================================= */
function viewSettings(root) {
  const set = (k, v) => { S.settings[k] = v; save(); };
  const row = (label, ctl, sub) => h('div', { class: 'row' }, h('div', {}, h('label', {}, label), sub ? h('div', { class: 'muted small' }, sub) : null), ctl);
  const toggle = (k, after) => h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: S.settings[k], onchange: e => { set(k, e.target.checked); after && after(); } }), h('span'));
  const slider = (k, min, max, step, fmt) => {
    const out = h('b', { class: 'mono' }, fmt(S.settings[k]));
    return h('div', { class: 'slider' }, h('input', { type: 'range', min, max, step, value: S.settings[k], 'aria-label': k, oninput: e => { set(k, +e.target.value); out.textContent = fmt(+e.target.value); } }), out);
  };
  put(root, 
    h('section', { class: 'card' }, h('h3', {}, t('st.section.sig')),
      row(t('st.wpm'), slider('wpm', 5, 30, 1, v => v + ' ' + t('wpm'))),
      row(t('st.dash'), slider('dashMs', 100, 500, 10, v => v + ' ms'), t('st.dash.d')),
      row(t('st.farns'), slider('farns', 0, 25, 1, v => v ? v + ' ' + t('wpm') : t('off')), t('st.farns.d')),
      row(t('st.input'), seg([['key', t('mode.key')], ['paddle', t('mode.paddle')]], S.settings.inputMode, v => { set('inputMode', v); render(); }, 'inline')),
      row(t('st.freq'), slider('freq', 300, 1000, 10, v => v + ' Hz')),
      row(t('st.vol'), slider('volume', 0, 1, 0.05, v => Math.round(v * 100) + '%')),
      row(t('st.sound'), toggle('sound')),
      row(t('st.vib'), toggle('vibration'), t('st.vibnote')),
      row(t('st.flash'), toggle('flash')),
      h('button', { class: 'btn', type: 'button', onclick: () => { Audio_.ensure(); Audio_.play('... --- ...', { sound: true, haptic: S.settings.vibration }); } }, '▶ ' + t('st.test'))),
    h('section', { class: 'card' }, h('h3', {}, t('st.section.ui')),
      row(t('st.theme'), seg([['auto', t('st.auto')], ['dark', t('st.dark')], ['light', t('st.light')]], S.settings.theme, v => { set('theme', v); applyTheme(); render(); }, 'inline')),
      row(t('st.lang'), seg([['de', 'Deutsch'], ['en', 'English']], S.settings.lang, v => { set('lang', v); render(); }, 'inline')),
      row(t('st.alt'), toggle('altInput'))),
    h('section', { class: 'card' }, h('h3', {}, t('st.section.data')),
      h('p', { class: 'muted' }, t('st.privacy')),
      h('button', { class: 'btn danger', type: 'button', onclick: () => { if (confirm(t('st.reset.q'))) { const keep = S.settings; S = defaults(); S.settings = keep; save(true); toast('✓'); render(); } } }, t('st.reset'))));
}

/* =========================================================
   SOS
   ========================================================= */
function openSOS() {
  const host = $('#sos'); let running = false, player = null, loopT = null, wake = null;
  const opt = { sound: S.settings.sound, vib: S.settings.vibration, light: true };
  const status = h('div', { class: 'sos-status mono', 'aria-live': 'polite' }, t('sos.idle'));
  const big = h('button', { class: 'sos-btn', type: 'button', 'aria-label': 'SOS' }, h('b', {}, t('sos.go')), h('small', { class: 'mono' }, '··· ––– ···'));
  const dots = h('div', { class: 'sos-dots' }, glyphs('...---...', 'lg'));
  const close = () => { stop(); host.classList.remove('open'); host.replaceChildren(); document.removeEventListener('keydown', esc); };
  const esc = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', esc);

  async function start() {
    running = true; big.classList.add('run'); big.firstChild.textContent = t('sos.stop'); status.textContent = t('sos.sending');
    Audio_.ensure(); try { wake = await navigator.wakeLock?.request('screen'); } catch (e) { /* ignore */ }
    cycle();
  }
  function cycle() {
    if (!running) return;
    player = Audio_.play('... --- ...', { wpm: 10, sound: opt.sound, haptic: opt.vib, onTone: on => host.classList.toggle('lit', on && opt.light) });
    const p = player; p.done.then(r => { if (r === 'done' && running) loopT = setTimeout(cycle, 2500); });
  }
  function stop() {
    running = false; clearTimeout(loopT); if (player) player.stop(); host.classList.remove('lit');
    try { wake && wake.release(); } catch (e) { /* ignore */ } wake = null;
    big.classList.remove('run'); big.firstChild.textContent = t('sos.go'); status.textContent = t('sos.idle');
  }
  big.onclick = () => running ? stop() : start();
  host.replaceChildren(h('div', { class: 'sos-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('sos.title') },
    h('div', { class: 'sos-top' }, h('b', { class: 'mono' }, t('sos.title')), h('button', { class: 'btn sm ghost', type: 'button', onclick: close }, '✕ ' + t('sos.close'))),
    h('div', { class: 'sos-warn', role: 'alert' }, '⚠ ' + t('sos.warn')),
    dots, big, status,
    h('div', { class: 'chips center' },
      chip('🔊 ' + t('sound'), opt.sound, e => { opt.sound = !opt.sound; e.currentTarget.classList.toggle('on', opt.sound); }),
      chip('📳 ' + t('vib'), opt.vib, e => { opt.vib = !opt.vib; e.currentTarget.classList.toggle('on', opt.vib); }),
      chip('💡 ' + t('light'), opt.light, e => { opt.light = !opt.light; e.currentTarget.classList.toggle('on', opt.light); }))));
  host.classList.add('open');
}
