/** QR panel for the phone mode: shows room code, QR code to the pad page and the joined players. */
import qrcode from 'qrcode-generator';
import type { MotionLink } from './link.ts';
import { padUrl } from './relay.ts';

const CSS = `
.relay-panel{position:fixed;right:14px;bottom:14px;z-index:50;background:rgba(17,24,39,.92);color:#e5e7eb;
  border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:14px;font:14px/1.4 system-ui,sans-serif;width:230px;
  box-shadow:0 10px 30px rgba(0,0,0,.35)}
.relay-panel.small{width:auto;padding:8px 12px;cursor:pointer}
.relay-panel .qr{background:#fff;border-radius:8px;padding:6px;margin:8px 0}
.relay-panel .qr svg{display:block;width:100%;height:auto}
.relay-panel .code{font:700 1.6rem/1 ui-monospace,monospace;letter-spacing:.18em;color:#fff}
.relay-panel .muted{color:#9ca3af;font-size:12px}
.relay-panel ol{margin:6px 0 0 18px;padding:0;font-size:12px;color:#cbd5e1}
.relay-panel .pads{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.relay-panel .pad{display:inline-flex;align-items:center;gap:6px;font-size:12px;background:rgba(255,255,255,.06);padding:3px 8px;border-radius:999px}
.relay-panel .dot{width:10px;height:10px;border-radius:50%}
.relay-panel .pad.active{outline:2px solid #fff}
@media (max-height:500px){.relay-panel{width:170px;padding:10px}.relay-panel ol{display:none}}
`;

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function qrSvg(text: string): string {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
}

/** Mounts the panel if the link runs in phone mode. Returns false otherwise. */
export function mountRelayPanel(link: MotionLink): boolean {
  if (!link.relay) return false;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  const el = document.createElement('div');
  el.className = 'relay-panel';
  document.body.append(el);
  let expanded = false;
  let lastQr = '';
  let qrHtml = '';
  el.addEventListener('click', () => {
    expanded = !expanded;
    render();
  });

  function render(): void {
    const st = link.relay!;
    const pads = st.pads
      .map((p) => `<span class="pad${p.pad === st.active ? ' active' : ''}"><span class="dot" style="background:${esc(p.color)}"></span>${esc(p.name)}</span>`)
      .join('');
    if (!st.room) {
      el.className = 'relay-panel';
      el.innerHTML = `<b>Handy-Controller</b><div class="muted">Verbinde mit ${esc(new URL(st.origin).host)} …</div>`;
      return;
    }
    const url = padUrl(st.origin, st.room);
    if (url !== lastQr) {
      lastQr = url;
      qrHtml = qrSvg(url);
    }
    const playing = st.active !== null;
    if (playing && !expanded) {
      el.className = 'relay-panel small';
      el.innerHTML = `<div class="pads" style="margin:0">${pads}</div><div class="muted">Raum <b>${esc(st.room)}</b> · antippen für QR</div>`;
      return;
    }
    el.className = 'relay-panel';
    el.innerHTML =
      `<b>Mit dem Handy spielen</b>` +
      `<div class="qr">${qrHtml}</div>` +
      `<div class="muted">Raum</div><div class="code">${esc(st.room)}</div>` +
      `<ol><li>QR-Code mit der Kamera scannen</li><li>Namen eingeben, «Los» tippen</li><li>Handy quer und flach halten</li></ol>` +
      (pads ? `<div class="pads">${pads}</div>` : '');
  }

  link.onRelayChange = render;
  render();
  return true;
}
