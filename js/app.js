'use strict';
/* MORSELINK – shell, router, boot */

const TABS = [
  ['home', 'nav.home', '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'],
  ['practice', 'nav.practice', '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>'],
  ['learn', 'nav.learn', '<path d="M4 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4zM20 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z"/>'],
  ['stats', 'nav.stats', '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>'],
  ['settings', 'nav.settings', '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>']
];
const VIEWS = { home: viewHome, practice: viewPractice, learn: viewLearn, stats: viewStats, settings: viewSettings, daily: viewDaily };

function applyTheme() {
  document.documentElement.dataset.theme = S.settings.theme;
  document.documentElement.lang = S.settings.lang;
  requestAnimationFrame(() => {
    const m = document.querySelector('meta[name=theme-color]');
    if (m) m.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#060a12';
  });
}
function go(tab, sub) {
  if (tab === 'practice' && sub) nav.practice = sub;
  if (tab === 'learn' && sub) nav.learn = sub;
  nav.tab = tab; render();
}
function render() {
  runCleanups();
  const root = $('#view');
  root.replaceChildren();
  root.className = 'view view-' + nav.tab;
  window.scrollTo(0, 0);
  VIEWS[nav.tab](root);
  renderChrome();
}
function renderChrome() {
  const active = nav.tab === 'daily' ? 'home' : nav.tab;
  $('#tabbar').replaceChildren(...TABS.map(([id, key, icon]) => {
    const b = h('button', { class: 'tab' + (id === active ? ' on' : ''), type: 'button', role: 'tab', 'aria-selected': id === active ? 'true' : 'false', onclick: () => { if (id === nav.tab) return; if (id === 'practice') nav.preset = null; go(id); } });
    b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icon}</svg><span>${t(key)}</span>`;
    return b;
  }));
  $('#sos-open').setAttribute('aria-label', 'SOS');
  $('#hdr-status').textContent = t('status.ready');
  $('#hdr-lvl').textContent = 'LV ' + levelOf(S.xp);
  $('#hdr-wpm').textContent = S.settings.wpm + ' WPM';
}

function boot() {
  Haptics.init();
  applyTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  $('#sos-open').addEventListener('click', openSOS);
  render();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
}
document.addEventListener('DOMContentLoaded', boot);
