// Deterministic Thingy:52 simulator producing snapshots shaped like shared/telemetry.example.json.
const RAD = Math.PI / 180;
const TAP_DIRS = ['X+', 'X-', 'Y+', 'Y-', 'Z+', 'Z-'];
const TAP_EVERY_MS = 6000;
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
const wave = (t, periodMs, phase = 0) => Math.sin((2 * Math.PI * t) / periodMs + phase);

function eulerToQuaternion(roll, pitch, yaw) {
  const [cr, sr] = [Math.cos((roll * RAD) / 2), Math.sin((roll * RAD) / 2)];
  const [cp, sp] = [Math.cos((pitch * RAD) / 2), Math.sin((pitch * RAD) / 2)];
  const [cy, sy] = [Math.cos((yaw * RAD) / 2), Math.sin((yaw * RAD) / 2)];
  return {
    w: round(cr * cp * cy + sr * sp * sy, 4), x: round(sr * cp * cy - cr * sp * sy, 4),
    y: round(cr * sp * cy + sr * cp * sy, 4), z: round(cr * cp * sy - sr * sp * cy, 4),
  };
}

function orientationOf(roll, pitch) {
  if (Math.abs(roll) > Math.abs(pitch)) return roll > 0 ? 'landscape' : 'reverse_landscape';
  return pitch >= 0 ? 'portrait' : 'reverse_portrait';
}

function songState(song, chorus, now) {
  if (!song) return { playing: false, note_index: -1 };
  const cycle = chorus.notes.reduce((sum, n) => sum + n.on_ms + n.off_ms, 0) + chorus.pause_ms;
  let t = (now - song.startedAt) % cycle;
  for (let i = 0; i < chorus.notes.length; i++) {
    const n = chorus.notes[i];
    if (t < n.on_ms + n.off_ms) return { playing: true, note_index: i };
    t -= n.on_ms + n.off_ms;
  }
  return { playing: true, note_index: -1 };
}

// Same demo cycle as the Go simulator: charges 60 → 70 % (1 %/min), then runs on battery back to 60 %.
function battery(elapsedMs) {
  const minute = Math.floor(elapsedMs / 60000) % 20;
  return { battery_pct: minute <= 10 ? 60 + minute : 80 - minute, battery_trend: minute < 10 ? 'charging' : 'discharging' };
}

export function createSim({ chorus, startTs = Date.now() }) {
  let led = { r: 0, g: 0, b: 0 };
  let song = null;
  let micEnabled = false;

  function motion(t) {
    const e = t - startTs;
    const roll = 25 * wave(e, 9000);
    const pitch = 18 * wave(e, 13000, 1);
    const yaw = (((e / 60) % 360) + 360) % 360;
    const g = { x: -Math.sin(pitch * RAD), y: Math.sin(roll * RAD) * Math.cos(pitch * RAD), z: Math.cos(roll * RAD) * Math.cos(pitch * RAD) };
    const tapIndex = Math.floor(e / TAP_EVERY_MS);
    return {
      accel_g: { x: round(g.x + 0.02 * wave(e, 210)), y: round(g.y + 0.02 * wave(e, 170)), z: round(g.z + 0.02 * wave(e, 190)) },
      gyro_dps: {
        x: round(25 * ((2 * Math.PI) / 9) * Math.cos((2 * Math.PI * e) / 9000), 1),
        y: round(18 * ((2 * Math.PI) / 13) * Math.cos((2 * Math.PI * e) / 13000 + 1), 1),
        z: round(1000 / 60, 1),
      },
      compass_ut: { x: round(-30 * Math.sin(yaw * RAD), 1), y: round(30 * Math.cos(yaw * RAD), 1), z: round(40 + 2 * wave(e, 5000), 1) },
      euler_deg: { roll: round(roll, 1), pitch: round(pitch, 1), yaw: round(yaw, 1) },
      quaternion: eulerToQuaternion(roll, pitch, yaw),
      // Yaw is counter-clockwise (right-handed, z up); a compass heading grows clockwise.
      heading_deg: round(360 - yaw, 1) % 360,
      orientation: orientationOf(roll, pitch),
      steps: Math.floor(e / 1500),
      tap: { direction: TAP_DIRS[tapIndex % TAP_DIRS.length], count: 1 + (tapIndex % 2), ts: startTs + tapIndex * TAP_EVERY_MS },
    };
  }

  function environment(t) {
    const e = t - startTs;
    return {
      temperature_c: round(23.4 + 0.8 * wave(e, 60000)),
      humidity_pct: Math.round(41 + 4 * wave(e, 45000)),
      pressure_hpa: round(963.2 + 0.4 * wave(e, 80000)),
      eco2_ppm: Math.round(1050 + 600 * wave(e, 90000, -1)),
      tvoc_ppb: Math.round(80 + 70 * wave(e, 90000, -1)),
      color: {
        r: Math.round(180 + 120 * wave(e, 20000)),
        g: Math.round(160 + 120 * wave(e, 20000, 2.1)),
        b: Math.round(120 + 100 * wave(e, 20000, 4.2)),
        clear: 400,
      },
    };
  }

  return {
    snapshot(t) {
      const e = t - startTs;
      const songNow = songState(song, chorus, t);
      const level = (songNow.playing ? -18 : -42) + 8 * wave(e, 700) + 4 * wave(e, 230);
      return {
        ts: Math.round(t),
        connected: true,
        device: {
          name: 'Thingy', address: 'E3:58:08:1B:53:5F',
          rssi: Math.round(-50 + 6 * wave(e, 7000)),
          ...battery(e),
          source: 'sim',
        },
        motion: motion(t),
        environment: environment(t),
        sound: {
          level_dbfs: micEnabled ? round(Math.max(-100, Math.min(0, level)), 1) : null,
          mic_enabled: micEnabled,
          mic_blocked: false,
          song: songNow,
        },
        ui: { button_pressed: e % 10000 >= 9000, led: { ...led } },
      };
    },
    song(action, _volume, now) {
      if (action === 'play') song = { startedAt: now };
      else if (action === 'stop') song = null;
      else throw new Error(`unknown song action: ${action}`);
    },
    mic(enabled) { micEnabled = Boolean(enabled); },
    led(rgb) { led = { r: rgb.r, g: rgb.g, b: rgb.b }; },
  };
}
