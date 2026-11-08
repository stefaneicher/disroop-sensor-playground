/** Ski: Lauberhorn and Streif downhill, steered by tilting the Thingy:52 (roll = steer, nose down = tuck, shock = jump). */
import * as THREE from 'three';
import { MotionController } from '../input/controller.ts';
import type { MotionFrame } from '../input/motion.ts';
import { pitchDeg } from '../input/quat.ts';
import { showFps } from '../common/fps.ts';
import { radialTexture } from '../common/textures.ts';
import { MotionLink } from '../input/link.ts';
import { COURSES } from './courses.ts';
import { autopilot, newSkier, startSkier, stepSkier, type SkiInput, type SkierState, type World as PhysWorld } from './physics.ts';
import { AlarmGate, checkSkiLimits, SKI_PITCH_DOWN_LIMIT_DEG, SKI_PITCH_UP_LIMIT_DEG, SKI_ROLL_LIMIT_DEG, type SkiLimitState } from './limits.ts';
import { SkierModel } from './skier.ts';
import { SkiSfx } from './sfx.ts';
import { Track, type CourseDef } from './track.ts';
import { World } from './world.ts';

type Mode = 'menu' | 'cal' | 'ready' | 'run' | 'done' | 'demo' | 'test';
type CamMode = 'chase' | 'cockpit' | 'tv';
const CAMS: CamMode[] = ['chase', 'cockpit', 'tv'];
const CAM_LABEL: Record<CamMode, string> = { chase: 'Verfolger', cockpit: 'Cockpit', tv: 'TV' };
const DT = 1 / 60;

const params = new URLSearchParams(location.search);
const demo = params.has('demo');
const $ = (id: string): HTMLElement => document.getElementById(id)!;
const stage = $('stage');

// preserveDrawingBuffer only for the smoke test, which reads the canvas back; it costs a full-screen copy per frame
const renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio < 1.5 && !params.has('low'), powerPreference: 'high-performance', preserveDrawingBuffer: params.has('preserve') });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
stage.prepend(renderer.domElement);
const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.3, 9000);

/** Render scale: starts at min(dpr, 1.5) and adapts to the measured frame time (fixed with ?q=0.5..2). */
const fixedScale = Number(params.get('q')) || 0;
const maxScale = fixedScale || Math.min(window.devicePixelRatio || 1, 1.5);
let scale = maxScale;

function resize(): void {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  renderer.setPixelRatio(scale);
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
resize();

let slowFor = 0;
let fastFor = 0;
let frameAvg = 1 / 60;
/** Lowers the resolution after 0.7 s below ~50 FPS, raises it again after 4 s with headroom. */
function adaptQuality(real: number): void {
  if (fixedScale || document.hidden) return;
  frameAvg += (real - frameAvg) * 0.1;
  slowFor = frameAvg > 1 / 50 ? slowFor + real : 0;
  fastFor = frameAvg < 1 / 75 || (frameAvg < 1 / 58 && scale < maxScale) ? fastFor + real : 0;
  if (slowFor > 0.7 && scale > 0.4) {
    scale = Math.max(0.4, +(scale - 0.15).toFixed(2));
    slowFor = 0;
    resize();
  } else if (fastFor > 4 && scale < maxScale) {
    scale = Math.min(maxScale, +(scale + 0.1).toFixed(2));
    fastFor = 0;
    resize();
  }
}

const sfx = new SkiSfx();
const ctrl = new MotionController();
const keys = new Set<string>();
let lastFrameAt = 0;
let jumpPulse = false;
let lastShock = 0;
let mode: Mode = demo ? 'demo' : 'menu';
let camMode: CamMode = (CAMS as string[]).includes(params.get('cam') ?? '') ? (params.get('cam') as CamMode) : 'chase';
let courseIdx = Math.max(0, COURSES.findIndex((c) => c.id === params.get('course')));

let def: CourseDef = COURSES[courseIdx]!;
let track = new Track(def);
let phys: PhysWorld = { track, gates: track.gates() };
let world = new World(track);
const model = new SkierModel();
world.scene.add(model.root);
let sk: SkierState = startSkier(track);
let ghost: number[] = [];
let toastUntil = 0;
let countdown = 0;
let lastCount = 4;
let steerKey = 0;
let tuckSmooth = 0;
let camYaw = 0;
const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();
let tvAnchor = -1;
let simTime = 0;
let lastInput: SkiInput = { steer: 0, tuck: 0, jump: false };
let record = 0;
const alarmGate = new AlarmGate();
let limitState: SkiLimitState | null = null;

const spray = buildSpray();
world.scene.add(spray.points);

function buildSpray(): { points: THREE.Points; pos: Float32Array; vel: Float32Array; life: Float32Array; head: number } {
  const n = 220;
  const pos = new Float32Array(n * 3).fill(-9999);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ map: radialTexture([[0, 1], [0.5, 0.6], [1, 0]]), color: 0xffffff, size: 0.55, transparent: true, opacity: 0.8, depthWrite: false });
  const points = new THREE.Points(g, m);
  points.frustumCulled = false;
  return { points, pos, vel: new Float32Array(n * 3), life: new Float32Array(n), head: 0 };
}

// ---- course handling -------------------------------------------------------------

function buildGhost(): void {
  const k = startSkier(track);
  const table: number[] = [0];
  for (let i = 0; i < 60 * 600 && !k.finished; i++) {
    stepSkier(phys, k, autopilot(phys, k, 1), DT);
    while (table.length * 50 <= k.s) table.push(k.t);
  }
  const scale = def.goldTime / Math.max(1, k.t);
  ghost = table.map((t) => t * scale);
}

function ghostAt(s: number): number {
  const f = Math.max(0, s) / 50;
  const i = Math.min(ghost.length - 2, Math.floor(f));
  if (i < 0) return 0;
  return ghost[i]! + (ghost[i + 1]! - ghost[i]!) * (f - i);
}

function loadCourse(i: number): void {
  courseIdx = (i + COURSES.length) % COURSES.length;
  def = COURSES[courseIdx]!;
  world.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
  });
  track = new Track(def);
  phys = { track, gates: track.gates() };
  world = new World(track);
  world.scene.add(model.root, spray.points);
  buildGhost();
  profile();
  resetRun();
  record = Number(localStorage.getItem(`ski-${def.id}`) ?? 0);
  $('m-course-v').textContent = def.title;
  $('m-facts').innerHTML = def.facts.map((f) => `<li>${f}</li>`).join('');
  $('course-label').textContent = def.title;
}

function resetRun(): void {
  sk = startSkier(track);
  world.resetCrowds();
  tvAnchor = -1;
  camYaw = 0;
  const at = Number(params.get('at') ?? 0);
  if (at > 0) {
    sk.s = at;
    sk.y = track.sampleAt(at).y;
    sk.v = 33;
    sk.t = ghostAt(at);
    while (sk.nextGate < phys.gates.length && phys.gates[sk.nextGate]!.s < at) sk.nextGate++;
  }
  placeSkier();
}

// ---- input ---------------------------------------------------------------------

function live(): boolean {
  return link.status === 'open' && performance.now() - lastFrameAt < 1000;
}

function onFrame(f: MotionFrame): void {
  lastFrameAt = performance.now();
  if (!ctrl.latest) {
    ctrl.feed(f);
    ctrl.calibrate();
    return;
  }
  const out = ctrl.feed(f);
  const g = Math.hypot(f.accel[0], f.accel[1], f.accel[2]);
  if (g > 2.1 && f.t - lastShock > 700) {
    lastShock = f.t;
    jumpPulse = true;
  }
  if (out.button === 'long') calibrate();
  if (out.button === 'short') {
    if (mode === 'menu') startRun();
    else if (mode === 'cal') calibrate(true);
    else if (mode === 'done') startRun();
    else if (mode === 'run') jumpPulse = true;
  }
}

const link = new MotionLink(onFrame);
showFps(() => `${Math.round(scale * 100)} %`);
link.start();

function calibrate(leave = false): void {
  ctrl.calibrate();
  if (leave) setMode('menu');
  say('Kalibriert');
}

let rollSmooth = 0;
/**
 * Roll in degrees to steering -1..1: low-pass (~70 ms) against sensor noise, soft dead zone of 3° and an expo curve,
 * so small tilts give fine corrections and full lock needs about 32°.
 */
function tiltSteer(rollDeg: number, dt: number): number {
  rollSmooth += (rollDeg - rollSmooth) * (1 - Math.exp(-dt / 0.07));
  const a = Math.max(0, Math.abs(rollSmooth) - 3) / 29;
  const x = Math.min(1, a);
  return Math.sign(rollSmooth) * (0.45 * x + 0.55 * x * x);
}

function readInput(dt: number): SkiInput {
  const left = keys.has('ArrowLeft') || keys.has('a');
  const right = keys.has('ArrowRight') || keys.has('d');
  const target = (right ? 1 : 0) - (left ? 1 : 0);
  steerKey += (target - steerKey) * Math.min(1, dt * 6);
  let steer = steerKey;
  let tuck = keys.has('ArrowDown') || keys.has('s') ? 1 : 0;
  if (live() && ctrl.latest) {
    // raw roll, not ctrl.steer(): that one drops to 0 while the tennis swing detector fires (every bump or jump)
    const tilt = tiltSteer(ctrl.roll(), dt);
    if (Math.abs(tilt) > Math.abs(steer)) steer = tilt;
    const rel = ctrl.calibration.relative(ctrl.latest.q);
    tuck = Math.max(tuck, Math.max(0, Math.min(1, (-pitchDeg(rel) - 6) / 22)));
    if (ctrl.latest.button) tuck = 1;
    limitState = checkSkiLimits(rel);
    if (alarmGate.fire(limitState.level, performance.now())) sfx.alarm();
  } else limitState = null;
  tuckSmooth += (tuck - tuckSmooth) * Math.min(1, dt * 8);
  const jump = jumpPulse || keys.has(' ');
  jumpPulse = false;
  return { steer, tuck: tuckSmooth, jump };
}

window.addEventListener('keydown', (e) => {
  sfx.unlock();
  if (e.repeat && e.key !== ' ') return;
  keys.add(e.key);
  if (e.key === 'c' || e.key === 'C') {
    camMode = CAMS[(CAMS.indexOf(camMode) + 1) % CAMS.length]!;
    tvAnchor = -1;
  } else if (e.key === 'k' || e.key === 'K') {
    if (ctrl.latest) calibrate();
  } else if (e.key === 'Escape') setMode(mode === 'menu' ? 'run' : 'menu');
  else if (e.key === 'Enter') {
    if (mode === 'menu' || mode === 'done') startRun();
    else if (mode === 'cal') calibrate(true);
  } else if (e.key === 'm' || e.key === 'M') sfx.muted = !sfx.muted;
  else if (e.key === 'ArrowUp' && mode === 'menu') loadCourse(courseIdx + 1);
  if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault();
});
window.addEventListener('keyup', (e) => keys.delete(e.key));
window.addEventListener('pointerdown', () => sfx.unlock());

// ---- menu / HUD --------------------------------------------------------------------

function setMode(m: Mode): void {
  mode = m;
  $('menu').hidden = m !== 'menu';
  $('cal').hidden = m !== 'cal';
  $('done').hidden = m !== 'done';
  $('test').hidden = m !== 'test';
  if (m !== 'run' && m !== 'test') limitState = null;
  if (m === 'menu') {
    resetRun();
    toastUntil = 0;
  }
}

function startRun(): void {
  sfx.unlock();
  setMode('ready');
  resetRun();
  countdown = 3.2;
  lastCount = 4;
  tuckSmooth = 0;
  say('Bereit');
}

let msgUntil = 0;
function say(text: string, ms = 1800): void {
  $('msg').textContent = text;
  msgUntil = performance.now() + ms;
}

const fmt = (t: number): string => {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
};

function profile(): void {
  const c = $('profile') as HTMLCanvasElement;
  const g = c.getContext('2d')!;
  const w = c.width;
  const h = c.height;
  g.clearRect(0, 0, w, h);
  const ys = track.samples.map((p) => p.y);
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  g.fillStyle = 'rgba(163,230,53,.25)';
  g.strokeStyle = '#a3e635';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(0, h);
  track.samples.forEach((p, i) => {
    if (i % 3) return;
    g.lineTo((p.s / track.length) * w, h - 4 - ((p.y - lo) / (hi - lo)) * (h - 10));
  });
  g.lineTo(w, h);
  g.closePath();
  g.fill();
  g.stroke();
  const img = g.getImageData(0, 0, w, h);
  ($('profile') as HTMLCanvasElement).dataset.ready = '1';
  profileBase = img;
}
let profileBase: ImageData | null = null;

function drawProfileDot(): void {
  const c = $('profile') as HTMLCanvasElement;
  const g = c.getContext('2d')!;
  if (!profileBase) return;
  g.putImageData(profileBase, 0, 0);
  const ys = track.samples.map((p) => p.y);
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const y = track.sampleAt(sk.s).y;
  g.fillStyle = '#facc15';
  g.beginPath();
  g.arc((sk.s / track.length) * c.width, c.height - 4 - ((y - lo) / (hi - lo)) * (c.height - 10), 4, 0, 7);
  g.fill();
}

const el = {
  time: $('h-time'),
  speed: $('h-speed'),
  delta: $('h-delta'),
  gates: $('h-gates'),
  pen: $('h-pen'),
  sec: $('h-sec'),
  info: $('h-info'),
  badge: $('badge'),
  cam: $('cam-label'),
  count: $('count'),
  tuck: $('h-tuck'),
};
let lastProfile = 0;

function updateLimitUi(): void {
  const ls = limitState;
  const alarm = !!ls && ls.level === 'alarm';
  $('limit').hidden = !alarm;
  document.body.classList.toggle('limit-warn', !!ls && ls.level === 'warn');
  document.body.classList.toggle('limit-alarm', alarm);
  if (alarm) $('limit-axis').textContent = ls.axis === 'roll' ? ' – zu weit gekippt' : ' – Nase zu weit';
  if (mode !== 'test') return;
  const r = ctrl.latest ? checkSkiLimits(ctrl.calibration.relative(ctrl.latest.q)) : null;
  const roll = r?.roll ?? 0;
  const pitch = r?.pitch ?? 0;
  gauge('g-roll', roll / SKI_ROLL_LIMIT_DEG, Math.abs(roll) > SKI_ROLL_LIMIT_DEG);
  gauge('g-pitch', pitch >= 0 ? pitch / SKI_PITCH_UP_LIMIT_DEG : pitch / SKI_PITCH_DOWN_LIMIT_DEG, pitch > SKI_PITCH_UP_LIMIT_DEG || -pitch > SKI_PITCH_DOWN_LIMIT_DEG);
  $('g-roll-v').textContent = `${Math.round(roll)}°`;
  $('g-pitch-v').textContent = `${Math.round(pitch)}°`;
  if (!live()) $('g-roll-v').textContent += ' (kein Gerät)';
}

/** share -1..1 of the limit; the bar grows from the centre. */
function gauge(id: string, share: number, over: boolean): void {
  const e = $(id);
  const w = Math.min(1, Math.abs(share)) * 50;
  e.style.width = `${w}%`;
  e.style.left = share >= 0 ? '50%' : `${50 - w}%`;
  e.className = over ? 'over' : Math.abs(share) >= 0.85 ? 'near' : '';
}

function updateHud(): void {
  const total = sk.t + sk.penalty;
  el.time.textContent = fmt(total);
  el.speed.textContent = `${Math.round(sk.v * 3.6)}`;
  const d = total - ghostAt(sk.s);
  el.delta.textContent = sk.s < 20 ? '–' : `${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(2)} s`;
  el.delta.className = d > 0 ? 'bad' : 'good';
  el.gates.textContent = `${sk.gatesHit}/${sk.gatesHit + sk.gatesMissed}`;
  el.pen.textContent = sk.penalty > 0 ? `+${sk.penalty.toFixed(1)} s` : '–';
  el.sec.textContent = def.sections[track.sectionAt(sk.s)]!.name;
  el.tuck.style.width = `${Math.round(tuckSmooth * 100)}%`;
  const badge = !live() ? 'TASTATUR' : link.source === 'sim' ? 'SIM' : 'LIVE';
  el.badge.textContent = badge;
  el.badge.className = `badge ${badge === 'TASTATUR' ? 'off' : badge === 'SIM' ? 'sim' : 'live'}`;
  el.cam.textContent = CAM_LABEL[camMode];
  updateLimitUi();
  const now = performance.now();
  $('h-info-box').style.opacity = now < toastUntil ? '1' : '0';
  if (now > msgUntil) $('msg').textContent = '';
  if (now - lastProfile > 120) {
    lastProfile = now;
    drawProfileDot();
  }
}

function showSection(i: number): void {
  const sec = def.sections[i]!;
  el.info.textContent = sec.info ?? '';
  $('h-info-title').textContent = sec.name;
  toastUntil = performance.now() + 6500;
}

function finishRun(): void {
  const total = sk.t + sk.penalty;
  const rel = total / def.goldTime;
  const medal = rel <= 1.1 ? '🥇 Gold' : rel <= 1.2 ? '🥈 Silber' : rel <= 1.35 ? '🥉 Bronze' : 'Im Ziel';
  const best = record === 0 || total < record;
  if (best) {
    record = total;
    localStorage.setItem(`ski-${def.id}`, String(total));
  }
  $('d-time').textContent = fmt(total);
  $('d-detail').textContent = `Fahrzeit ${fmt(sk.t)} · Strafe ${sk.penalty.toFixed(1)} s · Spitze ${Math.round(sk.maxV * 3.6)} km/h · Stürze/Netze ${sk.crashes}`;
  $('d-medal').textContent = `${medal} · Rekord ${fmt(def.goldTime)}${best ? ' · persönliche Bestzeit!' : ''}`;
  link.beep('point');
  sfx.cheer(1.2);
  world.cheerAll();
  setMode('done');
}

// ---- simulation step ------------------------------------------------------------------

function handleEvents(events: ReturnType<typeof stepSkier>): void {
  for (const e of events) {
    if (e.type === 'gate') {
      sfx.gate(e.ok);
      if (!e.ok) say('Tor verpasst +0.5 s', 1200);
    } else if (e.type === 'land') sfx.land(e.impact);
    else if (e.type === 'crash') {
      sfx.crash();
      link.beep('miss');
      say('Sturz!', 1500);
    } else if (e.type === 'net') {
      sfx.land(14);
      link.beep('miss');
      say('Fangnetz!', 1200);
    } else if (e.type === 'section') showSection(e.index);
    else if (e.type === 'finish') {
      if (mode === 'run') finishRun();
      else sfx.cheer(0.8);
    }
  }
}

function step(dt: number): void {
  let input: SkiInput;
  if (mode === 'demo' || mode === 'menu') input = autopilot(phys, sk, 1);
  else input = readInput(dt);
  lastInput = input;
  if (mode === 'ready') {
    countdown -= dt;
    const n = Math.ceil(countdown);
    if (n !== lastCount && n >= 1 && n <= 3) {
      lastCount = n;
      el.count.textContent = String(n);
      sfx.beep(false);
    }
    if (countdown <= 0) {
      el.count.textContent = 'LOS!';
      sfx.beep(true);
      setTimeout(() => (el.count.textContent = ''), 800);
      setMode('run');
      showSection(0);
    }
    return;
  }
  if (mode === 'test') {
    sk.lean = input.steer;
    sk.v = 0;
    return;
  }
  if (mode === 'cal') return;
  if (sk.finished) {
    rollout(dt);
    if ((mode === 'demo' || mode === 'menu') && sk.v < 1) {
      sk = startSkier(track);
      world.resetCrowds();
    }
    return;
  }
  handleEvents(stepSkier(phys, sk, input, dt));
}

/** After the finish line: brake to a stop in the outrun. */
function rollout(dt: number): void {
  sk.v = Math.max(0, sk.v - 9 * dt);
  sk.s = Math.min(track.length - 3, sk.s + sk.v * dt);
  sk.y = track.sampleAt(sk.s).y;
  sk.d *= 1 - Math.min(1, dt * 2);
  sk.psi *= 1 - Math.min(1, dt * 3);
  sk.air = false;
}

// ---- rendering ----------------------------------------------------------------------

const tmp = new THREE.Vector3();
const fwd = new THREE.Vector3();
let pitchSmooth = 0;
let frameDt = 1 / 60;

function skierPos(): THREE.Vector3 {
  const p = track.point(sk.s, sk.d);
  return tmp.set(p.x, sk.y, p.z);
}

function placeSkier(): void {
  const p = track.sampleAt(sk.s);
  const pos = skierPos();
  const h = p.heading + sk.psi;
  model.root.position.copy(pos);
  model.root.rotation.order = 'YXZ';
  const slope = sk.air ? Math.atan2(sk.vy, Math.max(1, sk.v)) : -Math.atan(p.grad);
  pitchSmooth += (slope - pitchSmooth) * (1 - Math.exp(-frameDt * 16));
  model.root.rotation.y = -h;
  model.root.rotation.x = pitchSmooth;
  model.pose(Math.max(tuckSmooth, mode === 'menu' || mode === 'demo' ? lastInput.tuck : 0), sk.lean, sk.air, simTime);
}

function emitSpray(dt: number): void {
  const s = spray;
  const carve = Math.abs(sk.lean) * Math.min(1, sk.v / 25) + Math.abs(sk.psi);
  const rate = sk.air ? 0 : Math.min(160, carve * sk.v * 5 + sk.v * 0.8);
  const n = Math.floor(rate * dt + Math.random());
  const pos = skierPos();
  const h = track.sampleAt(sk.s).heading + sk.psi;
  const side = -Math.sign(sk.lean || 1);
  for (let i = 0; i < n; i++) {
    const k = s.head;
    s.head = (s.head + 1) % s.life.length;
    s.pos[k * 3] = pos.x + Math.cos(h) * side * 0.4;
    s.pos[k * 3 + 1] = pos.y + 0.1;
    s.pos[k * 3 + 2] = pos.z + Math.sin(h) * side * 0.4;
    const out = (1 + Math.random() * 3) * side;
    s.vel[k * 3] = Math.cos(h) * out - Math.sin(h) * sk.v * 0.25 + (Math.random() - 0.5);
    s.vel[k * 3 + 1] = 1 + Math.random() * 2.5;
    s.vel[k * 3 + 2] = Math.sin(h) * out + Math.cos(h) * sk.v * 0.25 + (Math.random() - 0.5);
    s.life[k] = 0.7 + Math.random() * 0.5;
  }
  for (let k = 0; k < s.life.length; k++) {
    if (s.life[k]! <= 0) {
      s.pos[k * 3 + 1] = -9999;
      continue;
    }
    s.life[k] = s.life[k]! - dt;
    s.vel[k * 3 + 1] = s.vel[k * 3 + 1]! - 6 * dt;
    s.pos[k * 3] = s.pos[k * 3]! + s.vel[k * 3]! * dt;
    s.pos[k * 3 + 1] = s.pos[k * 3 + 1]! + s.vel[k * 3 + 1]! * dt;
    s.pos[k * 3 + 2] = s.pos[k * 3 + 2]! + s.vel[k * 3 + 2]! * dt;
  }
  (s.points.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
}

function updateCamera(dt: number): void {
  const p = track.sampleAt(sk.s);
  const pos = skierPos().clone();
  const h = p.heading + sk.psi * 0.6;
  let dyaw = h - camYaw;
  dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
  camYaw += dyaw * Math.min(1, dt * 4);
  fwd.set(Math.sin(camYaw), 0, -Math.cos(camYaw));
  const speedK = Math.min(1, sk.v / 40);
  let fov = 58 + 10 * speedK;
  if (camMode === 'chase') {
    const dist = 5.2 + 1.8 * speedK;
    const target = pos.clone().addScaledVector(fwd, -dist);
    const ground = track.sampleAt(Math.max(0, sk.s - dist)).y;
    target.y = Math.max(pos.y + 2.5 - 0.4 * tuckSmooth, ground + 2.2);
    camPos.lerp(target, Math.min(1, dt * 7));
    camLook.copy(pos).addScaledVector(fwd, 10);
    camLook.y = pos.y + 1.0 - track.sampleAt(sk.s).grad * 6;
  } else if (camMode === 'cockpit') {
    const eye = pos.clone().addScaledVector(fwd, 0.15);
    eye.y += 1.55 - 0.75 * tuckSmooth;
    camPos.copy(eye);
    camLook.copy(eye).addScaledVector(fwd, 20);
    camLook.y = eye.y - track.sampleAt(sk.s + 25).grad * 16 + (sk.air ? sk.vy * 0.5 : 0);
    camLook.x += Math.sin(simTime * 23) * 0.015 * speedK;
    fov += 8;
  } else {
    if (tvAnchor < 0 || sk.s > tvAnchor + 40 || sk.s < tvAnchor - 120) tvAnchor = sk.s + 55;
    const a = track.sampleAt(tvAnchor);
    const side = (Math.floor(tvAnchor / 140) % 2 === 0 ? 1 : -1) * (a.width / 2 + 9);
    const g = world.groundAt(tvAnchor, side);
    camPos.set(g.x, g.y + 2.2, g.z);
    camLook.copy(pos);
    fov = 36;
  }
  if (!Number.isFinite(camPos.x)) camPos.copy(pos);
  camera.position.copy(camPos);
  camera.lookAt(camLook);
  if (Math.abs(camera.fov - fov) > 0.01) {
    camera.fov += (fov - camera.fov) * Math.min(1, dt * 3);
    camera.updateProjectionMatrix();
  }
  model.root.visible = camMode !== 'cockpit';
}

let last = performance.now();
function frame(now: number): void {
  const real = Math.min(0.1, (now - last) / 1000);
  last = now;
  frameDt = real;
  adaptQuality(real);
  // substeps of at most 1/60 s that add up to the frame time exactly: no judder at 75/90/120/144 Hz or dropped frames
  const n = Math.max(1, Math.ceil(real / DT - 1e-6));
  for (let i = 0; i < n; i++) {
    simTime += real / n;
    step(real / n);
  }
  placeSkier();
  emitSpray(real);
  if (camPos.lengthSq() === 0) camPos.copy(skierPos());
  updateCamera(real);
  const fx = world.update(real, skierPos(), camera, sk.s);
  if (fx.cheer > 0) sfx.cheer(0.9);
  sfx.update(sk.v, Math.abs(sk.lean) + Math.abs(sk.psi), fx.crowdNear, sk.air);
  updateHud();
  renderer.render(world.scene, camera);
  requestAnimationFrame(frame);
}

// ---- wiring ------------------------------------------------------------------------

$('m-start').onclick = () => startRun();
$('m-course').onclick = () => loadCourse(courseIdx + 1);
$('m-cam').onclick = () => {
  camMode = CAMS[(CAMS.indexOf(camMode) + 1) % CAMS.length]!;
  $('m-cam-v').textContent = CAM_LABEL[camMode];
  tvAnchor = -1;
};
$('m-cal').onclick = () => setMode('cal');
$('m-test').onclick = () => {
  resetRun();
  setMode('test');
};
$('t-cal').onclick = () => calibrate();
$('t-back').onclick = () => setMode('menu');
$('cal-ok').onclick = () => calibrate(true);
$('cal-back').onclick = () => setMode('menu');
$('d-again').onclick = () => startRun();
$('d-menu').onclick = () => setMode('menu');
$('m-cam-v').textContent = CAM_LABEL[camMode];
if (demo) document.body.classList.add('demo');
if (params.has('nohint')) $('hint').remove();

loadCourse(courseIdx);
setMode(mode);
if (demo) showSection(track.sectionAt(sk.s));
requestAnimationFrame(frame);

declare global {
  interface Window {
    ski?: unknown;
  }
}
window.ski = {
  game: () => ({ t: simTime, s: sk.s, v: sk.v, mode, gates: sk.gatesHit, missed: sk.gatesMissed, crashes: sk.crashes, finished: sk.finished }),
  teleport: (s: number, v = 33) => {
    sk.s = s;
    sk.v = v;
    sk.d = 0;
    sk.psi = 0;
    sk.y = track.sampleAt(s).y;
    while (sk.nextGate < phys.gates.length && phys.gates[sk.nextGate]!.s < s) sk.nextGate++;
  },
  course: (i: number) => loadCourse(i),
  cam: (m: CamMode) => (camMode = m),
  cheer: () => world.cheerAll(),
  stats: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, scale }),
  link,
};
void newSkier;
