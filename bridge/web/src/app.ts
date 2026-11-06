// Entry point: wires SSE, reducer, charts and controls together.
import { initialState, reduce, connectionView, type Action } from './state.ts';
import { connectStream } from './connection.ts';
import { updatePeak, micView, type Peak } from './level.ts';
import { hexToRgb } from './color.ts';
import { throttle } from './throttle.ts';
import { postSong, postLed, postMic } from './api.ts';
import { LiveChart } from './live-chart.ts';
import { bindDom, renderConnection, renderSnapshot, renderLog } from './view.ts';
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
const charts: Record<MotionSeries, LiveChart> = {
  accel_g: new LiveChart(chartRoot('chart-accel'), { minSpan: 0.5, digits: 2 }),
  gyro_dps: new LiveChart(chartRoot('chart-gyro'), { minSpan: 20, digits: 1 }),
  compass_ut: new LiveChart(chartRoot('chart-compass'), { minSpan: 20, digits: 1 }),
};
const levelChart = new LiveChart(chartRoot('chart-level'), {
  digits: 1, fixedRange: { min: -80, max: 0 }, axes: [{ key: 'v', label: 'Pegel', color: '#a3e635' }],
});

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
  Object.values(charts).forEach((c) => c.draw());
  levelChart.draw();
}

function onTelemetry(snapshot: Snapshot): void {
  for (const [key, chart] of Object.entries(charts) as [MotionSeries, LiveChart][]) chart.push(snapshot.motion?.[key]);
  const mic = micView(snapshot.sound);
  levelChart.push({ v: mic.level });
  peak = mic.enabled ? updatePeak(peak, mic.level, Date.now()) : null;
  dispatch({ type: 'telemetry', snapshot });
}

const localLog = (msg: string): void => dispatch({ type: 'log', msg });

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
    dom.micToggle.disabled = false;
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
