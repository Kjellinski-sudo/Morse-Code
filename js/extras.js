'use strict';
/* MORSELINK – extras: mnemonics, words, badges, confetti, extra strings */

Object.assign(L.de, {
  'key.hint2': 'Links = Punkt · Rechts = Strich (gedrückt halten wiederholt)', 'mode.key': 'Taste', 'mode.paddle': 'Paddle',
  'st.dash': 'Strich-Schwelle', 'st.dash.d': 'Ab dieser Druckdauer zählt ein Druck als Strich.', 'st.farns': 'Farnsworth-Tempo', 'st.farns.d': 'Zeichen schnell, Pausen länger – ideal zum Hörenlernen.',
  'st.input': 'Eingabeart', 'off': 'aus', 'q.word': 'Wörter hören', 'q.word.d': 'Ganze Wörter erkennen', 'l.mnemo': 'Eselsbrücke', 'l.mnemo.d': 'GROSSE Silbe = Strich, kleine = Punkt',
  's.badges': 'Abzeichen', 'share': 'Teilen', 'share.audio': 'Audio (WAV)', 'saved': 'Gespeichert'
});
Object.assign(L.en, {
  'key.hint2': 'Left = dot · Right = dash (hold to repeat)', 'mode.key': 'Key', 'mode.paddle': 'Paddle',
  'st.dash': 'Dash threshold', 'st.dash.d': 'Presses longer than this count as a dash.', 'st.farns': 'Farnsworth speed', 'st.farns.d': 'Fast characters, longer pauses – ideal for learning to listen.',
  'st.input': 'Input style', 'off': 'off', 'q.word': 'Listen to words', 'q.word.d': 'Recognise whole words', 'l.mnemo': 'Mnemonic', 'l.mnemo.d': 'CAPITAL syllable = dash, small = dot',
  's.badges': 'Badges', 'share': 'Share', 'share.audio': 'Audio (WAV)', 'saved': 'Saved'
});

/* Mnemonics (German; CAPS = dash, lowercase = dot) */
const MNEMO = {
  A: 'a-HA', B: 'BUN-des-li-ga', C: 'CO-ca-CO-la', D: 'DO-mi-no', E: 'er', F: 'fo-to-GRA-fie', G: 'GOLD-FISCH-e', H: 'ha-lo-ge-ne',
  I: 'i-gel', J: 'ja-BIT-TE-SEHR', K: 'KA-ra-TE', L: 'li-TE-ra-tur', M: 'MON-TAG', N: 'NA-me', O: 'OH-MEIN-GOTT', P: 'phi-LO-SOPH-en',
  Q: 'QUAR-TETT-ge-SANG', R: 're-GIE-rung', S: 'sa-la-mi', T: 'TAG', U: 'u-ni-FORM', V: 'vi-ta-mi-NE', W: 'wa-GEN-RAD', X: 'XY-lo-gra-PHIE',
  Y: 'YO-ga-MAT-TE', Z: 'ZAHN-ARZT-pra-xis'
};
const WORDS = {
  de: ['HALLO', 'MORSE', 'FUNK', 'NOTRUF', 'HAUS', 'BAUM', 'ERDE', 'MOND', 'SONNE', 'WASSER', 'BROT', 'KATZE', 'HUND', 'FREUND', 'LICHT', 'STERN', 'ZUG', 'BOOT', 'WALD', 'FEUER', 'BERG', 'MEER', 'NACHT', 'RADIO', 'SIGNAL', 'ANTENNE', 'WELLE', 'KABEL', 'TURM', 'WOLKE'],
  en: ['HELLO', 'MORSE', 'RADIO', 'HELP', 'HOUSE', 'TREE', 'EARTH', 'MOON', 'SUN', 'WATER', 'BREAD', 'CAT', 'DOG', 'FRIEND', 'LIGHT', 'STAR', 'TRAIN', 'BOAT', 'WOOD', 'FIRE', 'MOUNTAIN', 'OCEAN', 'NIGHT', 'SIGNAL', 'WAVE', 'CABLE', 'TOWER', 'CLOUD', 'STORM', 'WIND']
};

/* Badges */
const totalAnswers = () => Object.values(S.chars).reduce((a, c) => a + c.n, 0);
const BADGES = [
  { id: 'first', ico: '🚀', de: 'Erster Funkspruch', en: 'First transmission', ok: () => totalAnswers() >= 1 },
  { id: 'a100', ico: '📡', de: '100 Antworten', en: '100 answers', ok: () => totalAnswers() >= 100 },
  { id: 'a500', ico: '🛰️', de: '500 Antworten', en: '500 answers', ok: () => totalAnswers() >= 500 },
  { id: 's10', ico: '🔥', de: '10er-Serie', en: '10 in a row', ok: () => S.bestStreak >= 10 },
  { id: 's25', ico: '⚡', de: '25er-Serie', en: '25 in a row', ok: () => S.bestStreak >= 25 },
  { id: 'm10', ico: '🧠', de: '10 Zeichen gemeistert', en: '10 characters mastered', ok: () => masteredCount() >= 10 },
  { id: 'abc', ico: '🔤', de: 'Alle Buchstaben', en: 'All letters', ok: () => LETTERS.every(mastered) },
  { id: 'lv5', ico: '⭐', de: 'Level 5', en: 'Level 5', ok: () => levelOf(S.xp) >= 5 },
  { id: 'lv10', ico: '🏅', de: 'Level 10', en: 'Level 10', ok: () => levelOf(S.xp) >= 10 },
  { id: 'd3', ico: '📅', de: '3 Tage in Folge', en: '3-day streak', ok: () => dayStreak() >= 3 },
  { id: 'd7', ico: '🗓️', de: '7 Tage in Folge', en: '7-day streak', ok: () => dayStreak() >= 7 },
  { id: 'daily', ico: '🎯', de: 'Daily Challenge', en: 'Daily Challenge', ok: () => Object.keys(S.daily).length >= 1 },
  { id: 'fast', ico: '💨', de: 'Unter 0,8 s', en: 'Under 0.8 s', ok: () => S.fastest > 0 && S.fastest < 800 }
];
function checkBadges() {
  for (const b of BADGES) {
    if (!S.badges[b.id] && b.ok()) {
      S.badges[b.id] = todayKey();
      toast('🏆 ' + b[S.settings.lang]); celebrate();
    }
  }
}
function celebrate() {
  Audio_.chime(); Haptics.ok();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = h('canvas', { class: 'confetti', 'aria-hidden': 'true' });
  c.width = innerWidth; c.height = innerHeight; document.body.append(c);
  const x = c.getContext('2d'), cols = ['#35e0ff', '#ff4fd8', '#3dffa8', '#ffc247', '#ffffff'];
  const ps = Array.from({ length: 90 }, () => ({ x: innerWidth / 2, y: innerHeight * .35, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 3, r: 3 + Math.random() * 4, c: cols[Math.floor(Math.random() * cols.length)] }));
  let f = 0;
  (function step() {
    x.clearRect(0, 0, c.width, c.height);
    ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .4; p.vx *= .99; x.globalAlpha = Math.max(0, 1 - f / 90); x.fillStyle = p.c; x.fillRect(p.x, p.y, p.r, p.r * 1.6); });
    if (++f < 90) requestAnimationFrame(step); else c.remove();
  })();
}
