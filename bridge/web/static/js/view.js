// Thin DOM layer: writes reducer state into the page. All decisions live in the pure modules.
import { DASH, fmt, fmtSigned, orientationLabel, tapArrow, cardinal, clock, isNum } from './format.js';
import { co2Level, batteryLevel, rssiBars } from './classify.js';
import { normalizeColor, rgbToHex } from './color.js';
import { orientationTransform } from './orientation.js';
import { dbfsToPercent } from './level.js';
import { CHORUS_HZ, songProgress } from './chorus.js';

const IDS = [
  'status-label', 'source', 'device-name', 'device-address', 'rssi', 'rssi-bars', 'battery', 'battery-icon', 'battery-fill',
  'temperature', 'humidity', 'pressure', 'co2-tile', 'eco2', 'co2-label', 'co2-marker', 'tvoc', 'color-swatch', 'color-raw',
  'orientation', 'cube', 'cube-led', 'needle', 'compass-ticks', 'heading', 'heading-cardinal', 'roll', 'pitch', 'yaw',
  'steps', 'tap', 'tap-arrow', 'tap-text', 'level', 'level-fill', 'level-peak',
  'song-button', 'song-status', 'notes', 'song-progress', 'volume', 'volume-value',
  'button-state', 'button-label', 'led-swatch', 'led-color', 'log', 'log-count', 'quaternion', 'snapshot-time',
];

const camel = (id) => id.replace(/-(\w)/g, (_, c) => c.toUpperCase());

export function bindDom(doc) {
  const dom = Object.fromEntries(IDS.map((id) => [camel(id), doc.getElementById(id)]));
  dom.body = doc.body;
  buildCompassTicks(doc, dom.compassTicks);
  buildNotes(doc, dom.notes);
  return dom;
}

function buildCompassTicks(doc, group) {
  for (let deg = 0; deg < 360; deg += 15) {
    const line = doc.createElementNS('http://www.w3.org/2000/svg', 'line');
    const major = deg % 90 === 0;
    line.setAttribute('y1', '-56');
    line.setAttribute('y2', major ? '-48' : '-52');
    line.setAttribute('transform', `rotate(${deg})`);
    if (major) line.setAttribute('class', 'major');
    group.append(line);
  }
}

function buildNotes(doc, list) {
  const [lo, hi] = [Math.min(...CHORUS_HZ), Math.max(...CHORUS_HZ)];
  CHORUS_HZ.forEach((hz, i) => {
    const li = doc.createElement('li');
    li.style.setProperty('--h', `${30 + ((hz - lo) / (hi - lo)) * 70}%`);
    li.title = `Note ${i + 1}: ${hz} Hz`;
    list.append(li);
  });
}

const setText = (el, text) => { if (el.textContent !== text) el.textContent = text; };
const setAttr = (el, name, value) => { if (el.getAttribute(name) !== value) el.setAttribute(name, value); };
const clampPct = (v) => Math.max(0, Math.min(100, v));

export function renderConnection(dom, view) {
  dom.body.className = `is-${view.status}${view.stale ? ' is-stale' : ''}`;
  setText(dom.statusLabel, view.label);
  dom.source.hidden = !view.source;
  if (view.source) {
    setAttr(dom.source, 'data-source', view.source);
    setText(dom.source, view.source === 'sim' ? 'SIMULATOR' : 'BLE');
  }
}

export function renderSnapshot(dom, s, { peak, newTap }) {
  setText(dom.snapshotTime, isNum(s.ts) ? clock(s.ts) : DASH);
  renderDevice(dom, s.device ?? {});
  renderEnvironment(dom, s.environment ?? {});
  renderMotion(dom, s.motion ?? {}, newTap);
  renderSound(dom, s.sound ?? {}, peak);
  renderUi(dom, s.ui ?? {});
}

function renderDevice(dom, d) {
  setText(dom.deviceName, d.name ?? DASH);
  setText(dom.deviceAddress, d.address ?? DASH);
  setText(dom.rssi, fmt(d.rssi, 0, 'dBm'));
  setAttr(dom.rssiBars, 'data-bars', String(rssiBars(d.rssi)));
  setText(dom.battery, fmt(d.battery_pct, 0, '%'));
  setAttr(dom.batteryIcon, 'data-level', batteryLevel(d.battery_pct));
  dom.batteryFill.style.width = `${isNum(d.battery_pct) ? clampPct(d.battery_pct) : 0}%`;
}

function renderEnvironment(dom, e) {
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

function renderMotion(dom, m, newTap) {
  setText(dom.orientation, orientationLabel(m.orientation));
  const transform = orientationTransform(m);
  if (transform) dom.cube.style.transform = transform;
  setAttr(dom.needle, 'transform', `rotate(${isNum(m.heading_deg) ? m.heading_deg : 0})`);
  setText(dom.heading, fmt(m.heading_deg, 0, '°').replace(' °', '°'));
  setText(dom.headingCardinal, isNum(m.heading_deg) ? cardinal(m.heading_deg) : '');
  const e = m.euler_deg ?? {};
  setText(dom.roll, `${fmtSigned(e.roll, 1)}°`.replace(`${DASH}°`, DASH));
  setText(dom.pitch, `${fmtSigned(e.pitch, 1)}°`.replace(`${DASH}°`, DASH));
  setText(dom.yaw, `${fmt(e.yaw, 1)}°`.replace(`${DASH}°`, DASH));
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

function renderSound(dom, snd, peak) {
  setText(dom.level, fmt(snd.level_dbfs, 1, 'dBFS'));
  const pct = dbfsToPercent(snd.level_dbfs);
  dom.levelFill.style.width = `${pct}%`;
  dom.levelFill.style.setProperty('--meter-width', `${pct > 0 ? (100 / pct) * 100 : 100}%`);
  dom.levelPeak.style.left = `calc(${dbfsToPercent(peak?.value)}% - 3px)`;
  dom.levelPeak.hidden = !peak;

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

function renderUi(dom, ui) {
  const pressed = ui.button_pressed;
  setAttr(dom.buttonState, 'data-pressed', String(pressed === true));
  setText(dom.buttonLabel, pressed === true ? 'Taster gedrückt' : pressed === false ? 'Taster losgelassen' : DASH);
  const hex = rgbToHex(ui.led);
  dom.ledSwatch.style.background = hex ?? '';
  dom.ledSwatch.style.boxShadow = hex && hex !== '#000000' ? `0 0 18px ${hex}` : '';
  dom.cubeLed.style.background = hex && hex !== '#000000' ? hex : '';
  dom.cubeLed.style.boxShadow = hex && hex !== '#000000' ? `0 0 10px ${hex}` : '';
}

export function renderLog(dom, log) {
  setText(dom.logCount, String(log.length));
  dom.log.replaceChildren(...log.map(({ msg, at }) => {
    const li = dom.log.ownerDocument.createElement('li');
    const time = dom.log.ownerDocument.createElement('time');
    time.textContent = clock(at);
    const span = dom.log.ownerDocument.createElement('span');
    span.textContent = msg;
    li.append(time, span);
    return li;
  }));
}
