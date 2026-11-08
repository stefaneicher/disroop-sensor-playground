// Gemeinsamer Header: Verbindungsstatus, Gerät, Batterie. Einbindung: <link rel="stylesheet" href="header.css"> und <script src="header.js"></script>.
(() => {
  const bar = document.createElement('div');
  bar.id = 'thingy-header';
  bar.innerHTML = '<span class="dot"></span><span class="status">nicht verbunden</span><span class="dev"></span><span class="grow"></span><span class="bat"></span>';
  const q = (c) => bar.querySelector('.' + c);
  const mount = () => { document.body.classList.add('has-thingy-header'); document.body.prepend(bar); };
  if (document.body) mount(); else addEventListener('DOMContentLoaded', mount);

  const prevLink = window.__thingyLink;
  window.__thingyLink = (source, text) => {
    bar.classList.toggle('on', !!source);
    q('status').textContent = text || (source ? 'verbunden' : 'nicht verbunden');
    if (typeof prevLink === 'function') prevLink(source, text);
  };
  // Von Android: window.__thingyHeader({name, battery})
  window.__thingyHeader = (s) => {
    if (s.name !== undefined) q('dev').textContent = s.name || '';
    if (s.battery !== undefined && s.battery !== null) {
      const b = q('bat');
      b.textContent = 'Akku ' + s.battery + ' %';
      b.classList.toggle('low', s.battery <= 15);
    }
  };
})();
