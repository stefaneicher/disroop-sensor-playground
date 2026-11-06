// Entry point: wires SSE, reducer, charts and controls together.
import { initialState, reduce, connectionView } from './state.js';
import { connectStream } from './connection.js';
import { updatePeak, micView } from './level.js';
import { hexToRgb } from './color.js';
import { throttle } from './throttle.js';
import { postSong, postLed, postMic } from './api.js';
import { LiveChart } from './live-chart.js';
import { bindDom, renderConnection, renderSnapshot, renderLog } from './view.js';

const TICK_MS = 500;
const dom = bindDom(document);
const charts = {
  accel_g: new LiveChart(document.getElementById('chart-accel'), { minSpan: 0.5, digits: 2 }),
  gyro_dps: new LiveChart(document.getElementById('chart-gyro'), { minSpan: 20, digits: 1 }),
  compass_ut: new LiveChart(document.getElementById('chart-compass'), { minSpan: 20, digits: 1 }),
};
const levelChart = new LiveChart(document.getElementById('chart-level'), {
  digits: 1, fixedRange: { min: -80, max: 0 }, axes: [{ key: 'v', label: 'Pegel', color: '#38bdf8' }],
});

let state = initialState();
let peak = null;
let pendingTap = false;
let renderedLog = null;
let frameRequested = false;

function dispatch(action) {
  state = reduce(state, { now: Date.now(), ...action });
  if (state.newTap && action.type === 'telemetry') pendingTap = true;
  if (!frameRequested) {
    frameRequested = true;
    requestAnimationFrame(render);
  }
}

function render() {
  frameRequested = false;
  const now = Date.now();
  renderConnection(dom, connectionView(state, now));
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

function onTelemetry(snapshot) {
  for (const [key, chart] of Object.entries(charts)) chart.push(snapshot.motion?.[key]);
  const mic = micView(snapshot.sound);
  levelChart.push({ v: mic.level });
  peak = mic.enabled ? updatePeak(peak, mic.level, Date.now()) : null;
  dispatch({ type: 'telemetry', snapshot });
}

const localLog = (msg) => dispatch({ type: 'log', msg });

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
    localLog(`Lied: ${err.message}`);
  } finally {
    dom.songButton.disabled = false;
  }
});

dom.micToggle.addEventListener('change', async () => {
  dom.micToggle.disabled = true;
  try {
    await postMic(dom.micToggle.checked);
  } catch (err) {
    localLog(`Mikrofon: ${err.message}`);
  } finally {
    dom.micToggle.disabled = false;
  }
});

dom.volume.addEventListener('input', () => { dom.volumeValue.value = dom.volume.value; });

const sendLed = throttle((hex) => {
  postLed(hexToRgb(hex)).catch((err) => localLog(`LED: ${err.message}`));
}, 200);
dom.ledColor.addEventListener('input', () => sendLed(dom.ledColor.value));
document.querySelectorAll('[data-led]').forEach((chip) => chip.addEventListener('click', () => {
  if (chip.dataset.led !== '#000000') dom.ledColor.value = chip.dataset.led;
  sendLed(chip.dataset.led);
}));
