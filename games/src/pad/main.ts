/**
 * Pad page: the phone becomes a controller. Opened via the QR code on the game screen
 * (served by the relay under /games/pad/?room=CODE). Sends MotionFrames over /ws/pad, vibrates on feedback.
 * Without motion sensors (desktop, permission denied) dragging on the pad emulates tilting.
 */
import { phoneFrame, type Orientation } from '../input/phone.ts';
import { pitchDeg, rollDeg } from '../input/quat.ts';
import { parseRelayMessage, relayOrigin, relayWs } from '../input/relay.ts';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
const params = new URLSearchParams(location.search);
const origin = relayOrigin(params.get('relay') ?? '', location.origin);

const store = {
  get: (k: string): string => {
    try {
      return localStorage.getItem(k) ?? '';
    } catch {
      return '';
    }
  },
  set: (k: string, v: string): void => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* private mode */
    }
  },
};

const roomIn = $<HTMLInputElement>('room');
const nameIn = $<HTMLInputElement>('name');
roomIn.value = (params.get('room') ?? '').toUpperCase();
nameIn.value = store.get('pad-name');
if (roomIn.value) nameIn.focus();

// ---- sensors -------------------------------------------------------------

let orientation: Orientation | null = null;
let rotationRate: Orientation | null = null;
let accel: { x: number | null; y: number | null; z: number | null } | null = null;
let button = false;
let drag: { x0: number; y0: number; dx: number; dy: number } | null = null;

window.addEventListener('deviceorientation', (e) => {
  if (e.beta === null && e.gamma === null) return;
  orientation = { alpha: e.alpha, beta: e.beta, gamma: e.gamma };
});
window.addEventListener('devicemotion', (e) => {
  rotationRate = e.rotationRate ? { alpha: e.rotationRate.alpha, beta: e.rotationRate.beta, gamma: e.rotationRate.gamma } : null;
  const a = e.accelerationIncludingGravity;
  accel = a ? { x: a.x, y: a.y, z: a.z } : null;
});

type PermissionApi = { requestPermission?: () => Promise<'granted' | 'denied'> };
async function askSensors(): Promise<boolean> {
  const apis = [globalThis.DeviceOrientationEvent as unknown as PermissionApi, globalThis.DeviceMotionEvent as unknown as PermissionApi];
  try {
    for (const api of apis) if (api?.requestPermission && (await api.requestPermission()) !== 'granted') return false;
    return true;
  } catch {
    return false;
  }
}

const screenAngle = (): number => {
  const a = screen.orientation?.angle ?? (window as unknown as { orientation?: number }).orientation ?? 0;
  return ((a % 360) + 360) % 360;
};

/** Without sensors: dragging emulates tilt (±45° over 1/3 of the pad). */
function dragOrientation(): Orientation {
  const pad = $('pad').getBoundingClientRect();
  const k = 45 / Math.max(80, Math.min(pad.width, pad.height) / 3);
  const dx = Math.max(-60, Math.min(60, (drag?.dx ?? 0) * k));
  const dy = Math.max(-60, Math.min(60, (drag?.dy ?? 0) * k));
  return { alpha: 0, beta: dy, gamma: dx }; // portrait frame: gamma = roll right, beta = nose up (drag down)
}

// ---- connection ------------------------------------------------------------

let ws: WebSocket | null = null;
let sent = 0;
let sentAt = performance.now();

function connect(room: string, name: string): void {
  const u = new URL(relayWs(origin, '/ws/pad'));
  u.searchParams.set('room', room);
  u.searchParams.set('name', name);
  const sock = new WebSocket(u);
  ws = sock;
  $('play-msg').textContent = 'Verbinde …';
  sock.onmessage = (m) => {
    const msg = typeof m.data === 'string' ? parseRelayMessage(m.data) : null;
    if (!msg) return;
    if (msg.type === 'welcome') {
      document.documentElement.style.setProperty('--accent', msg.color);
      $('who').textContent = msg.name;
      $('room-label').textContent = `Raum ${msg.room}`;
      $('play-msg').textContent = '';
      store.set('pad-name', msg.name);
    } else if (msg.type === 'feedback') {
      navigator.vibrate?.(msg.kind === 'hit' ? 30 : msg.kind === 'point' ? [40, 40, 40] : 90);
    } else if (msg.type === 'error') {
      showSetup(msg.text === 'unbekannter Raum' ? 'Diesen Raum gibt es nicht (mehr). Code auf dem Bildschirm prüfen.' : msg.text);
    }
  };
  sock.onclose = (e) => {
    if (ws !== sock) return;
    ws = null;
    if ($('play').hidden) return;
    showSetup(e.reason ? `Verbindung beendet: ${e.reason}` : 'Verbindung verloren. Nochmals «Los» tippen.');
  };
}

function showSetup(msg: string): void {
  ws?.close();
  ws = null;
  $('play').hidden = true;
  $('setup').hidden = false;
  $('setup-msg').textContent = msg;
}

// ---- loop ----------------------------------------------------------------

function tick(): void {
  if (ws?.readyState === WebSocket.OPEN) {
    const angle = orientation ? screenAngle() : 0;
    const f = phoneFrame({
      t: Date.now(),
      orientation: orientation ?? dragOrientation(),
      rotationRate,
      accel,
      screenAngle: angle,
      button,
    });
    ws.send(JSON.stringify({ type: 'frame', f }));
    sent++;
    const roll = rollDeg(f.q);
    const pitch = pitchDeg(f.q);
    $('bubble').style.transform = `translate(${Math.max(-46, Math.min(46, roll))}px, ${Math.max(-46, Math.min(46, -pitch))}px)`;
  }
  const now = performance.now();
  if (now - sentAt > 1000) {
    $('rate').textContent = ws ? `${Math.round((sent * 1000) / (now - sentAt))} Hz${orientation ? '' : ' · ohne Sensoren: ziehen = kippen'}` : '';
    sent = 0;
    sentAt = now;
  }
}
setInterval(tick, 1000 / 60);

// ---- UI --------------------------------------------------------------------

const pad = $('pad');
pad.addEventListener('pointerdown', (e) => {
  button = true;
  pad.classList.add('down');
  drag = { x0: e.clientX, y0: e.clientY, dx: 0, dy: 0 };
  pad.setPointerCapture(e.pointerId);
});
pad.addEventListener('pointermove', (e) => {
  if (drag) Object.assign(drag, { dx: e.clientX - drag.x0, dy: e.clientY - drag.y0 });
});
const release = (): void => {
  button = false;
  pad.classList.remove('down');
  drag = null;
};
pad.addEventListener('pointerup', release);
pad.addEventListener('pointercancel', release);

$('go').addEventListener('click', async () => {
  const room = roomIn.value.trim().toUpperCase();
  const name = nameIn.value.trim();
  if (!/^[A-Z0-9]{4}$/.test(room)) {
    $('setup-msg').textContent = 'Bitte den 4-stelligen Raum-Code vom Bildschirm eingeben.';
    roomIn.focus();
    return;
  }
  const sensors = await askSensors();
  try {
    await document.documentElement.requestFullscreen?.();
    await (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.('landscape');
  } catch {
    /* not supported (iOS) – fine */
  }
  $('setup').hidden = true;
  $('play').hidden = false;
  $('setup-msg').textContent = '';
  if (!sensors) $('play-msg').textContent = 'Bewegungssensoren nicht freigegeben – ziehen auf dem Feld steuert.';
  connect(room, name);
});
roomIn.addEventListener('input', () => {
  $('setup-msg').textContent = '';
});
nameIn.addEventListener('input', () => {
  $('setup-msg').textContent = '';
});
