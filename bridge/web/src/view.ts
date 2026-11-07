// Thin DOM layer: writes reducer state into the page. All decisions live in the pure modules.
import { DASH, fmt, fmtSigned, orientationLabel, tapArrow, clock, isNum } from './format.ts';
import { co2Level, batteryLevel, rssiBars, batteryTrendView } from './classify.ts';
import { buildAttitude, renderAttitude } from './attitude-view.ts';
import { normalizeColor, rgbToHex } from './color.ts';
import { orientationTransform } from './orientation.ts';
import { dbfsToPercent, micView, type Peak } from './level.ts';
import { CHORUS_HZ, songProgress } from './chorus.ts';
import { statusBadge } from './badge.ts';
import type { ConnectionView, LogEntry } from './state.ts';
import type { Device, Environment, Motion, Snapshot, Sound, Ui } from './telemetry.ts';

// Element id -> expected element type; bindDom() fails fast if the markup does not match.
const ELEMENTS = {
  'status': HTMLElement, 'status-label': HTMLElement, 'sim-banner': HTMLElement,
  'device-name': HTMLElement, 'device-address': HTMLElement, 'rssi': HTMLElement, 'rssi-bars': HTMLElement,
  'battery': HTMLElement, 'battery-icon': HTMLElement, 'battery-fill': HTMLElement, 'battery-pill': HTMLElement,
  'battery-trend': HTMLElement,
  'temperature': HTMLElement, 'humidity': HTMLElement, 'pressure': HTMLElement, 'co2-tile': HTMLElement,
  'eco2': HTMLElement, 'co2-label': HTMLElement, 'co2-marker': HTMLElement, 'tvoc': HTMLElement,
  'color-swatch': HTMLElement, 'color-raw': HTMLElement,
  'orientation': HTMLElement, 'cube': HTMLElement, 'cube-led': HTMLElement,
  'horizon': SVGGElement, 'pitch-ladder': SVGGElement, 'roll-scale': SVGGElement, 'roll-pointer': SVGGElement,
  'roll': HTMLElement, 'pitch': HTMLElement, 'yaw': HTMLElement, 'quaternion': HTMLElement,
  'steps': HTMLElement, 'tap': HTMLElement, 'tap-arrow': HTMLElement, 'tap-text': HTMLElement,
  'level': HTMLElement, 'level-fill': HTMLElement, 'level-peak': HTMLElement,
  'mic-toggle': HTMLInputElement, 'mic-hint': HTMLElement,
  'song-button': HTMLButtonElement, 'song-status': HTMLElement, 'notes': HTMLOListElement,
  'song-progress': HTMLElement, 'volume': HTMLInputElement, 'volume-value': HTMLOutputElement,
  'button-state': HTMLElement, 'button-label': HTMLElement, 'led-swatch': HTMLElement, 'led-color': HTMLInputElement,
  'log': HTMLOListElement, 'log-count': HTMLElement, 'snapshot-time': HTMLElement,
} as const;

type Ids = typeof ELEMENTS;
type Camel<S extends string> = S extends `${infer H}-${infer T}` ? `${H}${Capitalize<Camel<T>>}` : S;
export type Dom = { [K in keyof Ids as Camel<K>]: InstanceType<Ids[K]> } & { body: HTMLElement };

const camel = (id: string): string => id.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());

export function bindDom(doc: Document): Dom {
  const dom: Record<string, Element> = { body: doc.body };
  for (const [id, type] of Object.entries(ELEMENTS)) {
    const el = doc.getElementById(id);
    if (!(el instanceof type)) throw new Error(`#${id}: expected ${type.name}`);
    dom[camel(id)] = el;
  }
  const typed = dom as Dom;
  buildAttitude(typed.pitchLadder, typed.rollScale);
  buildNotes(doc, typed.notes);
  return typed;
}

function buildNotes(doc: Document, list: HTMLOListElement): void {
  const [lo, hi] = [Math.min(...CHORUS_HZ), Math.max(...CHORUS_HZ)];
  CHORUS_HZ.forEach((hz, i) => {
    const li = doc.createElement('li');
    li.style.setProperty('--h', `${30 + ((hz - lo) / (hi - lo)) * 70}%`);
    li.title = `Note ${i + 1}: ${hz} Hz`;
    list.append(li);
  });
}

const setText = (el: Element, text: string): void => { if (el.textContent !== text) el.textContent = text; };
const setAttr = (el: Element, name: string, value: string): void => { if (el.getAttribute(name) !== value) el.setAttribute(name, value); };
const clampPct = (v: number): number => Math.max(0, Math.min(100, v));
const degrees = (text: string): string => `${text}°`.replace(`${DASH}°`, DASH);

export function renderConnection(dom: Dom, view: ConnectionView): void {
  dom.body.className = `is-${view.status}${view.stale ? ' is-stale' : ''}`;
  const badge = statusBadge(view);
  setAttr(dom.status, 'data-kind', badge.kind);
  setText(dom.statusLabel, badge.text);
  dom.simBanner.hidden = !badge.simBanner;
}

// Snapshots arrive from the network: sections may be missing despite the schema, hence the fallbacks.
export function renderSnapshot(dom: Dom, s: Snapshot, { peak, newTap }: { peak: Peak | null; newTap: boolean }): void {
  setText(dom.snapshotTime, isNum(s.ts) ? clock(s.ts) : DASH);
  renderDevice(dom, s.device ?? {});
  renderEnvironment(dom, s.environment ?? {});
  renderMotion(dom, s.motion ?? {}, newTap);
  renderSound(dom, s.sound ?? {}, peak);
  renderUi(dom, s.ui ?? {});
}

function renderDevice(dom: Dom, d: Partial<Device>): void {
  setText(dom.deviceName, d.name ?? DASH);
  setText(dom.deviceAddress, d.address ?? DASH);
  setText(dom.rssi, fmt(d.rssi, 0, 'dBm'));
  setAttr(dom.rssiBars, 'data-bars', String(rssiBars(d.rssi)));
  setText(dom.battery, fmt(d.battery_pct, 0, '%'));
  setAttr(dom.batteryIcon, 'data-level', batteryLevel(d.battery_pct));
  dom.batteryFill.style.width = `${isNum(d.battery_pct) ? clampPct(d.battery_pct) : 0}%`;
  // battery_trend may be missing on older bridges: treated as "unknown".
  const trend = batteryTrendView((d as { battery_trend?: unknown }).battery_trend);
  setAttr(dom.batteryPill, 'data-trend', trend.trend);
  setText(dom.batteryTrend, trend.text);
}

function renderEnvironment(dom: Dom, e: Partial<Environment>): void {
  setText(dom.temperature, fmt(e.temperature_c, 1));
  setText(dom.humidity, fmt(e.humidity_pct, 0));
  setText(dom.pressure, fmt(e.pressure_hpa, 1));
  setText(dom.eco2, fmt(e.eco2_ppm, 0));
  setText(dom.tvoc, fmt(e.tvoc_ppb, 0));
  const co2 = co2Level(e.eco2_ppm);
  setAttr(dom.co2Tile, 'data-level', co2.level);
  setText(dom.co2Label, co2.label || DASH);
  dom.co2Marker.style.left = `${isNum(e.eco2_ppm) ? clampPct(((e.eco2_ppm - 400) / 1600) * 100) : 0}%`;
  const c = e.color;
  const hex = rgbToHex(normalizeColor(c));
  dom.colorSwatch.style.background = hex ?? '';
  dom.colorSwatch.title = hex ?? '';
  setText(dom.colorRaw, `R${fmt(c?.r)} G${fmt(c?.g)} B${fmt(c?.b)} C${fmt(c?.clear)}`);
}

function renderMotion(dom: Dom, m: Partial<Motion>, newTap: boolean): void {
  setText(dom.orientation, orientationLabel(m.orientation));
  const transform = orientationTransform(m);
  if (transform) dom.cube.style.transform = transform;
  renderAttitude(dom.horizon, dom.rollPointer, m);
  const e = m.euler_deg;
  setText(dom.roll, degrees(fmtSigned(e?.roll, 1)));
  setText(dom.pitch, degrees(fmtSigned(e?.pitch, 1)));
  setText(dom.yaw, degrees(fmt(e?.yaw, 1)));
  const q = m.quaternion;
  setText(dom.quaternion, q ? `q  w ${fmt(q.w, 3)}  x ${fmt(q.x, 3)}  y ${fmt(q.y, 3)}  z ${fmt(q.z, 3)}` : `q ${DASH}`);
  setText(dom.steps, fmt(m.steps, 0));
  setText(dom.tapArrow, tapArrow(m.tap?.direction));
  setText(dom.tapText, m.tap ? `${m.tap.direction} ×${m.tap.count}` : '');
  if (newTap) {
    dom.tap.classList.remove('flash');
    void dom.tap.offsetWidth; // restart the CSS animation
    dom.tap.classList.add('flash');
  }
}

function renderSound(dom: Dom, snd: Partial<Sound>, peak: Peak | null): void {
  const mic = micView(snd);
  dom.micToggle.closest('.sound')?.classList.toggle('mic-off', !mic.enabled);
  if (!dom.micToggle.disabled) dom.micToggle.checked = mic.enabled;
  setText(dom.micHint, mic.hint);
  setText(dom.level, fmt(mic.level, 1, 'dBFS'));
  const pct = dbfsToPercent(mic.level);
  dom.levelFill.style.width = `${pct}%`;
  dom.levelFill.style.setProperty('--meter-width', `${pct > 0 ? (100 / pct) * 100 : 100}%`);
  dom.levelPeak.style.left = `calc(${dbfsToPercent(peak?.value)}% - 3px)`;
  dom.levelPeak.hidden = !peak || !mic.enabled;

  const playing = Boolean(snd.song?.playing);
  setAttr(dom.songButton, 'aria-pressed', String(playing));
  setText(dom.songButton, playing ? '■ Stopp' : '▶ Abspielen');
  setText(dom.songStatus, playing ? 'spielt' : 'bereit');
  const p = songProgress(snd.song);
  [...dom.notes.children].forEach((li, i) => {
    li.classList.toggle('current', i === p.index);
    li.classList.toggle('done', p.index >= 0 && i < p.index);
  });
  setText(dom.songProgress, p.index >= 0 ? `Note ${p.index + 1} / ${p.total} · ${p.note}` : `Note ${DASH} / ${p.total}`);
}

function renderUi(dom: Dom, ui: Partial<Ui>): void {
  const pressed = ui.button_pressed;
  setAttr(dom.buttonState, 'data-pressed', String(pressed === true));
  setText(dom.buttonLabel, pressed === true ? 'Taster gedrückt' : pressed === false ? 'Taster losgelassen' : DASH);
  const hex = rgbToHex(ui.led);
  const glow = hex && hex !== '#000000' ? hex : null;
  dom.ledSwatch.style.background = hex ?? '';
  dom.ledSwatch.style.boxShadow = glow ? `0 0 18px ${glow}` : '';
  dom.cubeLed.style.background = glow ?? '';
  dom.cubeLed.style.boxShadow = glow ? `0 0 10px ${glow}` : '';
}

export function renderLog(dom: Dom, log: readonly LogEntry[]): void {
  setText(dom.logCount, String(log.length));
  const doc = dom.log.ownerDocument;
  dom.log.replaceChildren(...log.map(({ msg, at }) => {
    const li = doc.createElement('li');
    const time = doc.createElement('time');
    time.textContent = clock(at);
    const span = doc.createElement('span');
    span.textContent = msg;
    li.append(time, span);
    return li;
  }));
}
