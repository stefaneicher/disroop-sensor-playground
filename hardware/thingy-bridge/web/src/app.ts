// Entry point: wires SSE, reducer, charts and controls together.
import { initialState, reduce, connectionView, type Action } from './state.ts';
import { connectStream } from './connection.ts';
import { updatePeak, micView, type Peak } from './level.ts';
import { hexToRgb } from './color.ts';
import { throttle } from './throttle.ts';
import { postSong, postLed, postMic } from './api.ts';
import { TimeChart } from './time-chart.ts';
import { ChartGroup } from './chart-group.ts';
import { bindChartToolbar } from './chart-toolbar.ts';
import { CompassInstrument } from './compass-view.ts';
import { bindInfo } from './info-view.ts';
import { bindDom, renderConnection, renderSnapshot, renderLog } from './view.ts';
import { altitudeM, calibrateKnown, calibrateZero, parseCalibration, smoothPressure, STANDARD, type Calibration } from './altitude.ts';
import { DASH, fmtSigned, isNum } from './format.ts';
import type { Snapshot } from './telemetry.ts';

const TICK_MS = 500;
type MotionSeries = 'accel_g' | 'gyro_dps' | 'compass_ut';
type ActionInput = Action extends infer A ? (A extends Action ? Omit<A, 'now'> : never) : never;

const chartRoot = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el;
};
const errorText = (err: unknown): string => (err instanceof Error ? err.message : String(err));

const dom = bindDom(document);
const group = new ChartGroup(30_000);
const charts: Record<MotionSeries, TimeChart> = {
  accel_g: new TimeChart(chartRoot('chart-accel'), group, { unit: 'g', minSpan: 0.5, digits: 2, fixedRange: { min: -2, max: 2 } }),
  gyro_dps: new TimeChart(chartRoot('chart-gyro'), group, { unit: '°/s', minSpan: 20, digits: 1, fixedRange: { min: -250, max: 250 } }),
  compass_ut: new TimeChart(chartRoot('chart-compass'), group, { unit: 'µT', minSpan: 20, digits: 1, fixedRange: { min: -100, max: 100 } }),
};
const levelChart = new TimeChart(chartRoot('chart-level'), group, {
  unit: 'dBFS', digits: 1, autoScale: false, minSpan: 10, fixedRange: { min: -80, max: 0 },
  series: [{ key: 'v', label: 'Pegel', color: '#a3e635' }],
});
bindChartToolbar(chartRoot('charts'), group);
bindInfo(document);
const compass = new CompassInstrument(chartRoot('compass'));

let state = initialState();
let peak: Peak | null = null;
let pendingTap = false;
let renderedLog: typeof state.log | null = null;
let frameRequested = false;

function dispatch(action: ActionInput): void {
  state = reduce(state, { now: Date.now(), ...action } as Action);
  if (state.newTap && action.type === 'telemetry') pendingTap = true;
  if (!frameRequested) {
    frameRequested = true;
    requestAnimationFrame(render);
  }
}

function render(): void {
  frameRequested = false;
  renderConnection(dom, connectionView(state, Date.now()));
  if (state.snapshot) {
    renderSnapshot(dom, state.snapshot, { peak, newTap: pendingTap });
    pendingTap = false;
  }
  if (state.log !== renderedLog) {
    renderLog(dom, state.log);
    renderedLog = state.log;
  }
}

function onTelemetry(snapshot: Snapshot): void {
  const now = Date.now();
  for (const [key, chart] of Object.entries(charts) as [MotionSeries, TimeChart][]) chart.push(now, snapshot.motion?.[key]);
  const mic = micView(snapshot.sound);
  levelChart.push(now, { v: mic.level });
  compass.update(snapshot.motion, now);
  peak = mic.enabled ? updatePeak(peak, mic.level, now) : null;
  updateAltitude(snapshot);
  rawPackets += 1;
  showRaw(snapshot);
  dispatch({ type: 'telemetry', snapshot });
}

const localLog = (msg: string): void => dispatch({ type: 'log', msg });

let rawPackets = 0;
const showRaw = throttle((snapshot: Snapshot) => {
  if (dom.rawPause.checked) return;
  dom.rawStream.textContent = JSON.stringify(snapshot, null, 2);
  dom.rawCount.textContent = `${rawPackets} Pakete`;
}, 500);

const CAL_KEY = 'thingy.altimeter';
let calibration: Calibration = parseCalibration(localStorage.getItem(CAL_KEY));
let smoothedHpa: number | null = null;

function renderAltitude(): void {
  dom.altCal.textContent = calibration.label;
  const ok = smoothedHpa !== null;
  dom.altitude.textContent = smoothedHpa === null ? DASH : fmtSigned(altitudeM(smoothedHpa, calibration.refHpa), 1);
  for (const b of [dom.altCalibrate, dom.altZero]) b.disabled = !ok;
  dom.altReset.disabled = calibration.mode === 'standard';
}

function setCalibration(next: Calibration | null, what: string): void {
  if (!next) { localLog(`Höhenmesser: ${what} nicht möglich (kein Druckwert oder ungültige Höhe)`); return; }
  calibration = next;
  if (next === STANDARD) localStorage.removeItem(CAL_KEY); else localStorage.setItem(CAL_KEY, JSON.stringify(next));
  renderAltitude();
}

function updateAltitude(snapshot: Snapshot): void {
  const p = snapshot.environment?.pressure_hpa;
  if (isNum(p)) smoothedHpa = smoothPressure(smoothedHpa, p);
  renderAltitude();
}

dom.altCalibrate.addEventListener('click', () => {
  const known = dom.altKnown.value.trim() === '' ? NaN : Number(dom.altKnown.value);
  setCalibration(calibrateKnown(smoothedHpa, known), 'Kalibrieren');
});
dom.altZero.addEventListener('click', () => setCalibration(calibrateZero(smoothedHpa), 'Nullpunkt'));
dom.altReset.addEventListener('click', () => setCalibration(STANDARD, 'Zurücksetzen'));
renderAltitude();

connectStream('/api/stream', {
  onOpen: () => dispatch({ type: 'open' }),
  onError: () => dispatch({ type: 'error' }),
  onTelemetry,
  onLog: (msg) => dispatch({ type: 'log', msg }),
});
setInterval(() => dispatch({ type: 'tick' }), TICK_MS);

dom.songButton.addEventListener('click', async () => {
  const action = state.snapshot?.sound?.song?.playing ? 'stop' : 'play';
  dom.songButton.disabled = true;
  try {
    await postSong(action, Number(dom.volume.value));
  } catch (err) {
    localLog(`Lied: ${errorText(err)}`);
  } finally {
    dom.songButton.disabled = false;
  }
});

dom.micToggle.addEventListener('change', async () => {
  dom.micToggle.disabled = true;
  try {
    await postMic(dom.micToggle.checked);
  } catch (err) {
    localLog(`Mikrofon: ${errorText(err)}`);
  } finally {
    dom.micToggle.disabled = dom.micToggle.dataset.blocked === 'true';
  }
});

dom.volume.addEventListener('input', () => { dom.volumeValue.value = dom.volume.value; });

const sendLed = throttle((hex: string) => {
  const rgb = hexToRgb(hex);
  if (rgb) postLed(rgb).catch((err: unknown) => localLog(`LED: ${errorText(err)}`));
}, 200);
dom.ledColor.addEventListener('input', () => sendLed(dom.ledColor.value));
document.querySelectorAll<HTMLElement>('[data-led]').forEach((chip) => chip.addEventListener('click', () => {
  const hex = chip.dataset['led'] ?? '#000000';
  if (hex !== '#000000') dom.ledColor.value = hex;
  sendLed(hex);
}));
