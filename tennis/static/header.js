// Gemeinsamer Header (Dashboard, Tennis, Ski). Einbindung: header.css + header.js.
// Daten: Bridge per /api/stream (SSE), Android per window.__thingyHeader({name, battery}).
(() => {
  const here = location.pathname;
  const page = /\/ski\//.test(here) ? 'ski' : here.startsWith('/tennis') || location.host === 'tennis.local' ? 'tennis' : 'sensors';
  const root = /\/ski\//.test(here) ? '../' : '';
  const android = location.host === 'tennis.local';
  const nav = [['sensors', '/', '📈 Sensoren'], ['tennis', '/tennis/', '🎾 Tennis'], ['ski', '/ski/', '⛷ Ski']]
    .filter(([id]) => !android || id !== 'sensors')
    .map(([id, href, label]) => `<a href="${android ? (id === 'ski' ? '/ski/index.html' : '/index.html') : href}"${id === page ? ' class="on" aria-current="page"' : ''}>${label}</a>`).join('');
  const bar = document.createElement('header');
  bar.id = 'thingy-header';
  bar.innerHTML = `<a class="brand" href="${android ? '#' : '/'}"><img class="logo" src="${root}disroop.png" alt="Disroop"><span><span class="name">Playground</span><br><span class="dev">–</span></span></a>`
    + `<nav aria-label="Bereiche">${nav}</nav>`
    + '<div class="st"><span class="pill"><i class="dot"></i><span class="status">Keine Daten</span></span>'
    + '<span class="pill opt time" title="Zeitpunkt des letzten Messwerts">–</span>'
    + '<span class="pill opt rssi" title="Signalstärke">▂ –</span><span class="pill bat" title="Akku">🔋 –</span></div>';
  const q = (c) => bar.querySelector('.' + c);
  const mount = () => { document.body.classList.add('has-thingy-header'); document.body.prepend(bar); };
  if (document.body) mount(); else addEventListener('DOMContentLoaded', mount);

  const setBattery = (pct) => {
    if (pct === undefined || pct === null) return;
    q('bat').textContent = '🔋 ' + pct + ' %';
    q('bat').classList.toggle('low', pct <= 15);
  };
  const setLink = (on, text) => { bar.classList.toggle('on', !!on); q('status').textContent = text || (on ? 'Verbunden' : 'Keine Daten'); };

  const prevLink = window.__thingyLink;
  window.__thingyLink = (source, text) => { setLink(!!source, text); if (typeof prevLink === 'function') prevLink(source, text); };
  window.__thingyHeader = (s) => {
    if (s.name !== undefined) q('dev').textContent = s.name || '–';
    setBattery(s.battery);
  };

  if (android || typeof EventSource === 'undefined') return;
  const es = new EventSource('/api/stream');
  es.addEventListener('telemetry', (e) => {
    let s; try { s = JSON.parse(e.data); } catch { return; }
    const d = s.device || {};
    setLink(s.connected, s.connected ? (d.source === 'sim' ? 'Simulator' : 'Verbunden') : 'Keine Daten');
    q('dev').textContent = [d.name, d.address].filter(Boolean).join(' · ') || '–';
    if (s.ts) q('time').textContent = new Date(s.ts).toLocaleTimeString('de-CH');
    if (typeof d.rssi === 'number') q('rssi').textContent = (d.rssi > -60 ? '▂▄▆' : d.rssi > -75 ? '▂▄' : '▂') + ' ' + d.rssi + ' dBm';
    setBattery(d.battery_pct);
  });
  es.addEventListener('error', () => setLink(false));
})();
