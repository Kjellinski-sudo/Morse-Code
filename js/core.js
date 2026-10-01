'use strict';
/* =========================================================
   MORSELINK – core: helpers, data, i18n, storage, audio, haptics
   ========================================================= */

/* ---------- DOM helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
function addKids(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k.nodeType ? k : document.createTextNode(k));
  }
}
function mk(el, attrs, kids) {
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  addKids(el, kids);
  return el;
}
const h = (tag, attrs, ...kids) => mk(document.createElement(tag), attrs, kids);
const s = (tag, attrs, ...kids) => mk(document.createElementNS('http://www.w3.org/2000/svg', tag), attrs, kids);

/* ---------- Morse data ---------- */
const MORSE = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---',
  K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-',
  U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-',
  '&': '.-...', ':': '---...', ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.',
  '$': '...-..-', '@': '.--.-.', 'Ä': '.-.-', 'Ö': '---.', 'Ü': '..--', 'ß': '...--..'
};
const REV = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));
const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const DIGITS = [...'0123456789'];
const SPECIAL = ['Ä', 'Ö', 'Ü', 'ß', ...'.,?!\'/()&:;=+-_"$@'];
const ALL = [...LETTERS, ...DIGITS, ...SPECIAL];
const KOCH = [...'KMRSUAPTLOWI.NJEF0Y,VG5/Q9ZH38B?427C1D6X'];

function tokenize(text) {
  const out = [];
  for (const c of text) {
    if (/\s/.test(c)) {
      if (out.length && out[out.length - 1].code !== '/') out.push({ ch: ' ', code: '/' });
      continue;
    }
    const u = c === 'ß' ? 'ß' : c.toUpperCase();
    if (MORSE[u]) out.push({ ch: u, code: MORSE[u] });
  }
  while (out.length && out[out.length - 1].code === '/') out.pop();
  return out;
}
function decodeMorse(str) {
  str = str.replace(/[·•∙]/g, '.').replace(/[–—−‐_]/g, '-');
  const words = str.split(/\s*\/\s*|\s{2,}|\n+/).map(w => w.trim()).filter(Boolean);
  let text = '';
  const parts = [];
  words.forEach((w, wi) => {
    if (wi) { text += ' '; parts.push({ ch: ' ', code: '/' }); }
    w.split(/\s+/).forEach(code => {
      const ch = /^[.-]+$/.test(code) ? (REV[code] || '?') : '?';
      text += ch; parts.push({ ch, code });
    });
  });
  return { text, parts };
}

/* ---------- i18n ---------- */
const L = {
  de: {
    'nav.home': 'Home', 'nav.practice': 'Üben', 'nav.learn': 'Lernen', 'nav.stats': 'Statistik', 'nav.settings': 'Einstellungen',
    'status.ready': 'BEREIT', 'home.station': 'STATION', 'home.level': 'Level {0}', 'home.xp': '{0} / {1} XP',
    'home.learned': 'Gelernte Zeichen', 'home.daily': 'Daily Challenge', 'home.daily.desc': 'Erkenne 20 Morsezeichen so schnell wie möglich.',
    'home.daily.done': 'Heute erledigt', 'home.daily.start': 'Challenge starten', 'home.daily.again': 'Nochmal spielen',
    'home.best': 'Bestleistung', 'home.quick': 'Morse-Taste', 'home.quick.desc': 'Direkt losfunken', 'home.days': 'Tage in Folge',
    'home.progress': 'Lernfortschritt', 'home.next': 'Nächstes Ziel: {0}', 'home.train': 'Adaptiv trainieren', 'points': 'Punkte',
    'p.key': 'Taste', 'p.t2m': 'Text→Morse', 'p.m2t': 'Morse→Text', 'p.hear': 'Hören', 'p.quiz': 'Quiz',
    'key.tap': 'TIPPEN', 'key.hold': 'oder HALTEN', 'key.aria': 'Morse-Taste. Kurz tippen für Punkt, lang halten für Strich.',
    'key.back': 'Zurück', 'key.clear': 'Alles löschen', 'key.space': 'Leerzeichen', 'key.hint': 'Kurz = Punkt · Lang = Strich',
    'key.out': 'Eingegebener Text', 'dot': 'Punkt', 'dash': 'Strich',
    't2m.ph': 'Text eingeben …', 'play': 'Abspielen', 'stop': 'Stopp', 'copy': 'Kopieren', 'copied': 'Kopiert',
    'sound': 'Ton', 'light': 'Licht', 'vib': 'Vibration', 'wpm': 'WPM',
    'm2t.ph': 'Morsecode eingeben, z. B. ... --- ...', 'm2t.help': 'Leerzeichen trennt Buchstaben, / trennt Wörter.',
    'm2t.result': 'Übersetzung', 'letterGap': 'Buchstabe', 'wordGap': 'Wort',
    'q.m2l': 'Morse → Buchstabe', 'q.m2l.d': 'Code sehen & hören, Buchstabe wählen',
    'q.l2m': 'Buchstabe → Morse', 'q.l2m.d': 'Buchstabe sehen, Code tippen',
    'q.hear': 'Hören → Text', 'q.hear.d': 'Nur hören, Zeichen erkennen – Tempo passt sich an',
    'pool.adaptive': 'Adaptiv', 'pool.letters': 'Buchstaben', 'pool.digits': 'Zahlen', 'pool.special': 'Sonderzeichen', 'pool.all': 'Alles',
    'q.mode': 'Modus', 'q.pool': 'Zeichen', 'q.start': 'Start', 'q.of': 'Frage {0}/{1}', 'q.correct': 'Richtig!', 'q.wrong': 'Falsch – das war',
    'q.replay': 'Nochmal hören', 'q.check': 'Prüfen', 'q.hint': 'Lösung zeigen', 'q.listen': 'Hör zu …', 'q.listenq': 'Welches Zeichen?',
    'q.tapcode': 'Tippe den Morsecode für', 'q.adaptive.info': 'Neue Zeichen werden freigeschaltet, sobald du die aktuellen sicher beherrschst ({0} aktiv).',
    'r.title': 'Ergebnis', 'r.acc': 'Trefferquote', 'r.avg': 'Ø Zeit', 'r.xp': 'XP', 'r.score': 'Punkte', 'r.time': 'Zeit', 'r.newbest': 'NEUE BESTLEISTUNG',
    'r.again': 'Nochmal', 'r.done': 'Fertig', 'r.streak': 'Beste Serie',
    'l.letters': 'Buchstaben', 'l.digits': 'Zahlen', 'l.special': 'Zeichen', 'l.tree': 'Baum', 'l.train': 'Training starten',
    'l.try': 'Selbst tippen', 'l.tryinfo': 'Tippe den Code für', 'l.attempts': 'Versuche', 'l.acc': 'Quote', 'l.best': 'Beste Zeit', 'l.mastered': 'Gemeistert',
    'l.setdesc': '{0} von {1} gemeistert',
    'tree.start': 'START', 'tree.path': 'Pfad', 'tree.reset': 'Start', 'tree.none': 'Hier endet der Baum', 'tree.help': 'Tippe Punkt oder Strich – oder berühre einen Knoten.',
    'tree.zoomin': 'Vergrößern', 'tree.zoomout': 'Verkleinern',
    's.total': 'Übungen', 's.acc': 'Trefferquote', 's.fastest': 'Schnellste Erkennung', 's.avg': 'Ø Antwortzeit', 's.wpm': 'Aktuelle WPM',
    's.streak': 'Längste Serie', 's.learned': 'Gelernte Zeichen', 's.today': 'Heute gelernt', 's.xp': 'Gesamt-XP', 's.days': 'Tage in Folge',
    's.chart1': 'Übungen pro Tag', 's.chart2': 'Trefferquote (%)', 's.matrix': 'Zeichen-Übersicht', 's.range7': '7 Tage', 's.range30': '30 Tage',
    's.min': 'Min.', 's.none': 'Noch keine Daten – leg los!',
    'st.wpm': 'Geschwindigkeit', 'st.freq': 'Tonhöhe', 'st.vol': 'Lautstärke', 'st.sound': 'Akustisches Signal', 'st.vib': 'Haptik / Vibration',
    'st.flash': 'Blinklicht-Anzeige', 'st.theme': 'Darstellung', 'st.auto': 'System', 'st.dark': 'Dunkel', 'st.light': 'Hell', 'st.lang': 'Sprache',
    'st.alt': 'Zusatztasten für Punkt & Strich (Barrierefreiheit)', 'st.reset': 'Fortschritt zurücksetzen', 'st.reset.q': 'Wirklich alle Lernfortschritte löschen?',
    'st.privacy': 'Alle Daten bleiben ausschließlich auf deinem Gerät. Keine Registrierung, kein Tracking, vollständig offline nutzbar.',
    'st.test': 'Testton', 'st.section.sig': 'Signal', 'st.section.ui': 'Oberfläche', 'st.section.data': 'Daten', 'st.vibnote': 'Auf manchen iPhones ist nur ein einzelner Tipp-Impuls möglich.',
    'sos.title': 'SOS-MODUS', 'sos.warn': 'Kein Ersatz für einen echten Notruf! Im Notfall 112 (EU) · 110 (DE) · 911 (US) wählen.',
    'sos.go': 'SOS', 'sos.stop': 'STOPP', 'sos.close': 'Schließen', 'sos.sending': 'Sende · · · – – – · · ·', 'sos.idle': 'Tippen zum Senden',
    'levelup': '🎉 Level {0} erreicht!', 'back': 'Zurück',
  },
  en: {
    'nav.home': 'Home', 'nav.practice': 'Practice', 'nav.learn': 'Learn', 'nav.stats': 'Stats', 'nav.settings': 'Settings',
    'status.ready': 'READY', 'home.station': 'STATION', 'home.level': 'Level {0}', 'home.xp': '{0} / {1} XP',
    'home.learned': 'Characters learned', 'home.daily': 'Daily Challenge', 'home.daily.desc': 'Identify 20 Morse characters as fast as you can.',
    'home.daily.done': 'Done today', 'home.daily.start': 'Start challenge', 'home.daily.again': 'Play again',
    'home.best': 'Personal best', 'home.quick': 'Morse key', 'home.quick.desc': 'Start transmitting', 'home.days': 'day streak',
    'home.progress': 'Learning progress', 'home.next': 'Next goal: {0}', 'home.train': 'Adaptive training', 'points': 'points',
    'p.key': 'Key', 'p.t2m': 'Text→Morse', 'p.m2t': 'Morse→Text', 'p.hear': 'Listen', 'p.quiz': 'Quiz',
    'key.tap': 'TAP', 'key.hold': 'or HOLD', 'key.aria': 'Morse key. Tap briefly for a dot, hold for a dash.',
    'key.back': 'Undo', 'key.clear': 'Clear all', 'key.space': 'Space', 'key.hint': 'Short = dot · Long = dash',
    'key.out': 'Entered text', 'dot': 'Dot', 'dash': 'Dash',
    't2m.ph': 'Enter text …', 'play': 'Play', 'stop': 'Stop', 'copy': 'Copy', 'copied': 'Copied',
    'sound': 'Sound', 'light': 'Light', 'vib': 'Haptics', 'wpm': 'WPM',
    'm2t.ph': 'Enter Morse code, e.g. ... --- ...', 'm2t.help': 'Space separates letters, / separates words.',
    'm2t.result': 'Translation', 'letterGap': 'Letter', 'wordGap': 'Word',
    'q.m2l': 'Morse → Letter', 'q.m2l.d': 'See & hear the code, pick the letter',
    'q.l2m': 'Letter → Morse', 'q.l2m.d': 'See a letter, key in the code',
    'q.hear': 'Listen → Text', 'q.hear.d': 'Audio only – speed adapts to you',
    'pool.adaptive': 'Adaptive', 'pool.letters': 'Letters', 'pool.digits': 'Numbers', 'pool.special': 'Symbols', 'pool.all': 'All',
    'q.mode': 'Mode', 'q.pool': 'Characters', 'q.start': 'Start', 'q.of': 'Question {0}/{1}', 'q.correct': 'Correct!', 'q.wrong': 'Wrong – it was',
    'q.replay': 'Replay', 'q.check': 'Check', 'q.hint': 'Show answer', 'q.listen': 'Listen …', 'q.listenq': 'Which character?',
    'q.tapcode': 'Key in the Morse code for', 'q.adaptive.info': 'New characters unlock once you master the current ones ({0} active).',
    'r.title': 'Result', 'r.acc': 'Accuracy', 'r.avg': 'Avg time', 'r.xp': 'XP', 'r.score': 'Score', 'r.time': 'Time', 'r.newbest': 'NEW PERSONAL BEST',
    'r.again': 'Again', 'r.done': 'Done', 'r.streak': 'Best streak',
    'l.letters': 'Letters', 'l.digits': 'Numbers', 'l.special': 'Symbols', 'l.tree': 'Tree', 'l.train': 'Start training',
    'l.try': 'Try it yourself', 'l.tryinfo': 'Key in the code for', 'l.attempts': 'Attempts', 'l.acc': 'Accuracy', 'l.best': 'Best time', 'l.mastered': 'Mastered',
    'l.setdesc': '{0} of {1} mastered',
    'tree.start': 'START', 'tree.path': 'Path', 'tree.reset': 'Start', 'tree.none': 'The tree ends here', 'tree.help': 'Tap dot or dash – or touch a node.',
    'tree.zoomin': 'Zoom in', 'tree.zoomout': 'Zoom out',
    's.total': 'Exercises', 's.acc': 'Accuracy', 's.fastest': 'Fastest recognition', 's.avg': 'Avg response time', 's.wpm': 'Current WPM',
    's.streak': 'Longest streak', 's.learned': 'Characters learned', 's.today': 'Practice today', 's.xp': 'Total XP', 's.days': 'Day streak',
    's.chart1': 'Exercises per day', 's.chart2': 'Accuracy (%)', 's.matrix': 'Character overview', 's.range7': '7 days', 's.range30': '30 days',
    's.min': 'min', 's.none': 'No data yet – get going!',
    'st.wpm': 'Speed', 'st.freq': 'Pitch', 'st.vol': 'Volume', 'st.sound': 'Audio signal', 'st.vib': 'Haptics / vibration',
    'st.flash': 'Flashing light', 'st.theme': 'Appearance', 'st.auto': 'System', 'st.dark': 'Dark', 'st.light': 'Light', 'st.lang': 'Language',
    'st.alt': 'Extra dot & dash buttons (accessibility)', 'st.reset': 'Reset progress', 'st.reset.q': 'Really delete all learning progress?',
    'st.privacy': 'All data stays on your device. No sign-up, no tracking, fully usable offline.',
    'st.test': 'Test tone', 'st.section.sig': 'Signal', 'st.section.ui': 'Interface', 'st.section.data': 'Data', 'st.vibnote': 'Some iPhones only support a single tap pulse.',
    'sos.title': 'SOS MODE', 'sos.warn': 'Not a substitute for a real emergency call! In an emergency dial 112 (EU) · 110 (DE) · 911 (US).',
    'sos.go': 'SOS', 'sos.stop': 'STOP', 'sos.close': 'Close', 'sos.sending': 'Sending · · · – – – · · ·', 'sos.idle': 'Tap to transmit',
    'levelup': '🎉 Reached level {0}!', 'back': 'Back',
  }
};
function t(key, ...args) {
  const lang = (typeof S !== 'undefined' && S.settings.lang) || 'de';
  let str = (L[lang] && L[lang][key]) ?? L.de[key] ?? key;
  args.forEach((a, i) => { str = str.replace('{' + i + '}', a); });
  return str;
}

/* ---------- Storage / state ---------- */
const STORE_KEY = 'morselink.v1';
const defaults = () => ({
  settings: { wpm: 15, freq: 620, volume: 0.7, sound: true, vibration: true, flash: true, theme: 'auto', lang: (navigator.language || 'de').startsWith('de') ? 'de' : 'en', altInput: false },
  xp: 0, chars: {}, days: {}, daily: {}, dailyBest: null, bestStreak: 0, curStreak: 0, hearWpm: 0, fastest: 0, sumMs: 0, msN: 0
});
let S;
try {
  const raw = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
  S = Object.assign(defaults(), raw);
  S.settings = Object.assign(defaults().settings, raw.settings || {});
} catch (e) { S = defaults(); }
let saveTimer;
function save(now) {
  clearTimeout(saveTimer);
  const doSave = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* private mode */ } };
  if (now) doSave(); else saveTimer = setTimeout(doSave, 250);
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(true); });

const todayKey = () => new Date().toLocaleDateString('sv');
const dayStats = (d = todayKey()) => (S.days[d] ||= { n: 0, ok: 0, xp: 0, secs: 0 });
const levelOf = xp => Math.floor(Math.sqrt(xp / 50)) + 1;
const levelStart = l => 50 * (l - 1) ** 2;
const mastered = ch => {
  const c = S.chars[ch];
  return !!c && c.hist.length >= 3 && (c.hist.split('1').length - 1) / c.hist.length >= 0.75;
};
const masteredCount = () => ALL.filter(mastered).length;
function adaptivePool() {
  let n = 2;
  while (n < KOCH.length && KOCH.slice(0, n).every(mastered)) n++;
  return KOCH.slice(0, n);
}
function dayStreak() {
  let n = 0; const d = new Date();
  if (!(S.days[d.toLocaleDateString('sv')]?.n)) d.setDate(d.getDate() - 1);
  while (S.days[d.toLocaleDateString('sv')]?.n) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function pickChar(pool, last, rand = Math.random) {
  const cands = pool.filter(c => c !== last);
  const list = cands.length ? cands : pool;
  const w = list.map(c => {
    const st = S.chars[c];
    if (!st || !st.n) return 3;
    return 1 + (1 - st.ok / st.n) * 3 + (mastered(c) ? 0 : 0.5);
  });
  let r = rand() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) { r -= w[i]; if (r <= 0) return list[i]; }
  return list[list.length - 1];
}
function record({ ch, ok, ms }) {
  const c = (S.chars[ch] ||= { n: 0, ok: 0, best: 0, sum: 0, msN: 0, hist: '' });
  c.n++; if (ok) c.ok++;
  c.hist = (c.hist + (ok ? '1' : '0')).slice(-8);
  const d = dayStats(); d.n++; if (ok) d.ok++;
  let gain = 0;
  if (ok) {
    gain = 10;
    if (ms > 0) {
      c.best = c.best ? Math.min(c.best, ms) : ms; c.sum += ms; c.msN++;
      if (!S.fastest || ms < S.fastest) S.fastest = ms;
      S.sumMs += ms; S.msN++;
      gain += Math.max(0, Math.round((2500 - ms) / 250));
    }
    S.curStreak++; S.bestStreak = Math.max(S.bestStreak, S.curStreak);
  } else S.curStreak = 0;
  const before = levelOf(S.xp);
  S.xp += gain; d.xp += gain;
  if (levelOf(S.xp) > before) toast(t('levelup', levelOf(S.xp)));
  save();
  return gain;
}
function addXP(n) {
  const before = levelOf(S.xp); S.xp += n; dayStats().xp += n;
  if (levelOf(S.xp) > before) toast(t('levelup', levelOf(S.xp)));
  save();
}
/* active-time tracking */
let lastAct = Date.now();
['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, () => { lastAct = Date.now(); }, true));
setInterval(() => {
  if (document.visibilityState === 'visible' && Date.now() - lastAct < 30000) { dayStats().secs += 5; save(); }
}, 5000);

/* ---------- Toast ---------- */
let toastT;
function toast(msg) {
  const el = $('#toast'); if (!el) return;
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------- Haptics ---------- */
const Haptics = {
  el: null,
  init() {
    const input = h('input', { type: 'checkbox', tabindex: '-1', 'aria-hidden': 'true' });
    input.setAttribute('switch', '');
    this.el = h('label', { class: 'haptic-sink', 'aria-hidden': 'true' }, input);
    document.body.append(this.el);
  },
  _ios() { try { this.el && this.el.click(); } catch (e) { /* ignore */ } },
  tick(force) {
    if (!force && !S.settings.vibration) return;
    if (navigator.vibrate) navigator.vibrate(12); else this._ios();
  },
  vibe(ms) { if (navigator.vibrate) navigator.vibrate(Math.max(10, ms)); else this._ios(); },
  ok() { if (!S.settings.vibration) return; if (navigator.vibrate) navigator.vibrate([15, 40, 15]); else this._ios(); },
  bad() {
    if (!S.settings.vibration) return;
    if (navigator.vibrate) navigator.vibrate([60, 40, 60]); else { this._ios(); setTimeout(() => this._ios(), 90); }
  }
};

/* ---------- Audio ---------- */
const Audio_ = (() => {
  let ctx, master, live = null;
  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination);
    }
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* ignore */ }
    if (ctx.state !== 'running') ctx.resume();
    master.gain.value = S.settings.volume;
    return ctx;
  }
  function startTone() {
    if (!S.settings.sound || !ensure()) return;
    stopTone();
    const o = ctx.createOscillator(), g = ctx.createGain(), n = ctx.currentTime;
    o.type = 'sine'; o.frequency.value = S.settings.freq;
    g.gain.setValueAtTime(0, n); g.gain.linearRampToValueAtTime(1, n + 0.006);
    o.connect(g); g.connect(master); o.start(); live = { o, g };
  }
  function stopTone() {
    if (!live) return;
    const { o, g } = live; live = null; const n = ctx.currentTime;
    g.gain.cancelScheduledValues(n); g.gain.setValueAtTime(g.gain.value, n);
    g.gain.linearRampToValueAtTime(0, n + 0.01); o.stop(n + 0.02);
  }
  function timeline(code, wpm) {
    const u = 1200 / wpm, ev = []; let gap = 0, tok = -1;
    for (const tk of code.trim().split(/\s+/)) {
      if (!tk) continue;
      tok++;
      if (tk === '/') { gap = 7 * u; continue; }
      if (ev.length) ev.push({ on: false, ms: gap || 3 * u });
      gap = 0;
      [...tk].forEach((sym, i) => {
        if (i) ev.push({ on: false, ms: u });
        ev.push({ on: true, ms: (sym === '.' ? 1 : 3) * u, tok });
      });
    }
    return ev;
  }
  /** play(code, {wpm, sound, haptic, onTone(on, ev)}) -> {done:Promise<'done'|'stopped'>, stop(), duration} */
  function play(code, o = {}) {
    const wpm = o.wpm || S.settings.wpm, ev = timeline(code, wpm), timers = [];
    let osc = null, stopped = false, resolve;
    const done = new Promise(r => { resolve = r; });
    const total = ev.reduce((a, e) => a + e.ms, 0);
    if ((o.sound ?? S.settings.sound) && ensure()) {
      const t0 = ctx.currentTime + 0.08, g = ctx.createGain();
      osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = S.settings.freq;
      g.gain.setValueAtTime(0, t0);
      let tt = t0;
      for (const e of ev) {
        const d = e.ms / 1000;
        if (e.on) {
          g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(1, tt + 0.006);
          g.gain.setValueAtTime(1, tt + d - 0.006); g.gain.linearRampToValueAtTime(0, tt + d);
        }
        tt += d;
      }
      osc.connect(g); g.connect(master); osc.start(t0); osc.stop(tt + 0.05); osc._g = g;
    }
    let acc = 80;
    for (const e of ev) {
      const a = acc;
      if (e.on) {
        timers.push(setTimeout(() => { o.onTone && o.onTone(true, e); if (o.haptic) Haptics.vibe(e.ms); }, a));
        timers.push(setTimeout(() => { o.onTone && o.onTone(false, e); }, a + e.ms));
      }
      acc += e.ms;
    }
    timers.push(setTimeout(() => { if (!stopped) { stopped = true; resolve('done'); } }, acc + 30));
    return {
      done, duration: total,
      stop() {
        if (stopped) return; stopped = true; timers.forEach(clearTimeout);
        if (osc) { try { osc._g.gain.cancelScheduledValues(ctx.currentTime); osc._g.gain.setValueAtTime(0, ctx.currentTime); osc.stop(ctx.currentTime + 0.01); } catch (e) { /* ignore */ } }
        o.onTone && o.onTone(false, {});
        if (navigator.vibrate && o.haptic) navigator.vibrate(0);
        resolve('stopped');
      }
    };
  }
  return { ensure, startTone, stopTone, play };
})();
