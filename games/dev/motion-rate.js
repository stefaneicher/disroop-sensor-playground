// Counts /api/motion frames: node games/dev/motion-rate.js ws://127.0.0.1:8052/api/motion [seconds] [minHz]
// Exits 1 if the rate is below minHz or a frame is malformed.
const [url = 'ws://127.0.0.1:8052/api/motion', secs = '3', min = '50'] = process.argv.slice(2);
const ws = new WebSocket(url);
let n = 0;
let bad = 0;
let started = 0;
let last = null;
ws.onmessage = (m) => {
  if (!started) started = performance.now(); // count from the first frame (the bridge raises the rate on subscribe)
  try {
    const f = JSON.parse(m.data);
    if (typeof f.t !== 'number' || f.q?.length !== 4 || f.gyro?.length !== 3 || f.accel?.length !== 3 || typeof f.button !== 'boolean') bad++;
    last = f;
  } catch {
    bad++;
  }
  n++;
};
ws.onerror = () => {
  console.error(`motion: cannot connect to ${url}`);
  process.exit(1);
};
setTimeout(() => {
  ws.close();
  const s = (performance.now() - started) / 1000;
  const hz = started ? n / s : 0;
  console.log(`motion: ${n} frames in ${s.toFixed(1)} s = ${hz.toFixed(0)} Hz, ${bad} malformed, last ${JSON.stringify(last)}`);
  process.exit(hz >= Number(min) && bad === 0 ? 0 : 1);
}, Number(secs) * 1000 + 1000);
