// "Thingy im Raum": live three.js scene of the Thingy:52 in a small room. Orientation from the fusion quaternion (exact),
// displacement from MotionEstimator (short-term estimate only). Loaded lazily by app.ts so a missing WebGL never breaks
// the rest of the dashboard. three.js is vendored (static/vendor/three, see dev/vendor.js) and mapped by the import map.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  conj, MotionEstimator, relativeTo, rotate, sampleFromFrame, sampleFromSnapshot, slerp,
  type MotionSample, type Quat, type Vec3,
} from './motion3d.ts';
import { isNum } from './format.ts';
import type { Snapshot } from './telemetry.ts';

export interface RoomView { onSnapshot(s: Snapshot): void }

// Scene units are cm; the device is 6 × 6 × 1.5 cm. Device frame (x right, y forward, z up) → three.js (x right, y up, z back).
const BASE = new THREE.Vector3(0, 14, 0);
const ROOM = 90;
const HEIGHT = 46;
const CAMERA = new THREE.Vector3(30, 30, 44);
const TARGET = new THREE.Vector3(0, 11, 0);
const COLORS = { x: '#f87171', y: '#4ade80', z: '#60a5fa', lime: '#a3e635', teal: '#2aa5a1', bg: '#111827', panel: '#1f2937', line: '#374151' };
const TRAIL_STEP_MS = 50;
const TRAIL = 28;
const GHOSTS = 6;
const ARROW_CM_PER_G = 22;

const toThreeQuat = (q: Quat): THREE.Quaternion => new THREE.Quaternion(q[1], q[3], -q[2], q[0]);
const toThreeVec = (v: Vec3, k = 1): THREE.Vector3 => new THREE.Vector3(v[0] * k, v[2] * k, -v[1] * k);

function canvasTexture(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d')!, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

// Top of the Thingy: dark rubber with a hexagon pattern, a light-grey Nordic wordmark, transparent where the LED glows.
function topTexture(): THREE.CanvasTexture {
  return canvasTexture(1024, (g, s) => {
    roundRect(g, 0, 0, s, s, s * 0.09);
    g.fillStyle = '#25282d';
    g.fill();
    g.save();
    g.clip();
    const r = s / 30;
    const h = Math.sqrt(3) * r;
    g.lineWidth = s / 260;
    g.strokeStyle = '#363b43';
    for (let row = -1; row * h * 0.5 < s + h; row++) {
      for (let col = -1; col * r * 3 < s + r * 3; col++) {
        const cx = col * r * 3 + (row % 2 ? r * 1.5 : 0);
        const cy = row * h * 0.5;
        g.beginPath();
        for (let k = 0; k < 6; k++) g.lineTo(cx + r * 0.88 * Math.cos((k * Math.PI) / 3), cy + r * 0.88 * Math.sin((k * Math.PI) / 3));
        g.closePath();
        g.stroke();
      }
    }
    g.restore();
    // light ring around the button
    g.strokeStyle = 'rgba(203, 213, 225, .35)';
    g.lineWidth = s / 120;
    g.beginPath();
    g.arc(s / 2, s / 2, s * 0.215, 0, Math.PI * 2);
    g.stroke();
    // Nordic wordmark (simplified)
    g.fillStyle = '#d1d5db';
    g.font = `600 ${s * 0.075}px system-ui, "Segoe UI", Arial, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('nordic', s / 2, s * 0.83);
    g.font = `500 ${s * 0.032}px system-ui, "Segoe UI", Arial, sans-serif`;
    g.fillStyle = '#9ca3af';
    g.fillText('THINGY:52', s / 2, s * 0.17);
  });
}

function glowTexture(): THREE.CanvasTexture {
  return canvasTexture(256, (g, s) => {
    const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
  });
}

function label(text: string, color: string): THREE.Sprite {
  const tex = canvasTexture(128, (g, s) => {
    g.fillStyle = 'rgba(17, 24, 39, .75)';
    g.beginPath();
    g.arc(s / 2, s / 2, s * 0.42, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = color;
    g.font = `800 ${s * 0.55}px system-ui, Arial, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, s / 2, s / 2 + s * 0.03);
  });
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sprite.scale.setScalar(1.7);
  sprite.renderOrder = 10;
  return sprite;
}

function arrow(color: string, length: number, radius: number): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, emissive: color, emissiveIntensity: 0.25 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 12), mat);
  const head = new THREE.Mesh(new THREE.ConeGeometry(radius * 2.6, 1, 16), mat);
  shaft.name = 'shaft';
  head.name = 'head';
  g.add(shaft, head);
  setArrowLength(g, length, radius);
  return g;
}

// Arrows point along +y of their group.
function setArrowLength(g: THREE.Group, length: number, radius: number): void {
  const headLen = Math.min(length * 0.4, radius * 7);
  const shaft = g.getObjectByName('shaft')!;
  const head = g.getObjectByName('head')!;
  shaft.scale.y = Math.max(0.001, length - headLen);
  shaft.position.y = (length - headLen) / 2;
  head.scale.y = headLen;
  head.position.y = length - headLen / 2;
}

interface Thingy { group: THREE.Group; led: THREE.MeshStandardMaterial; glow: THREE.SpriteMaterial; light: THREE.PointLight; button: THREE.Mesh }

function buildThingy(): Thingy {
  const group = new THREE.Group();
  const rubber = new THREE.MeshStandardMaterial({ color: '#2a2d33', roughness: 0.82, metalness: 0.05 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(6, 1.5, 6, 5, 0.55), rubber);
  body.castShadow = true;
  group.add(body);
  // thin light-grey seam between top and bottom shell
  const seam = new THREE.Mesh(new RoundedBoxGeometry(6.04, 0.08, 6.04, 3, 0.04), new THREE.MeshStandardMaterial({ color: '#6b7280', roughness: 0.6 }));
  seam.position.y = -0.2;
  group.add(seam);
  // semi-transparent top with hex pattern; the LED below shines through
  const top = new THREE.Mesh(
    new THREE.PlaneGeometry(5.3, 5.3),
    new THREE.MeshStandardMaterial({ map: topTexture(), roughness: 0.7, transparent: true, opacity: 0.94 }),
  );
  top.rotation.x = -Math.PI / 2;
  top.position.y = 0.752;
  top.receiveShadow = true;
  group.add(top);
  const led = new THREE.MeshStandardMaterial({ color: '#111', emissive: '#000', emissiveIntensity: 2.2, roughness: 0.3 });
  const ledDisc = new THREE.Mesh(new THREE.CircleGeometry(1.25, 40), led);
  ledDisc.rotation.x = -Math.PI / 2;
  ledDisc.position.y = 0.745;
  group.add(ledDisc);
  const glow = new THREE.SpriteMaterial({ map: glowTexture(), color: '#000', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 });
  const glowSprite = new THREE.Sprite(glow);
  glowSprite.scale.setScalar(5.5);
  glowSprite.position.y = 0.95;
  group.add(glowSprite);
  const light = new THREE.PointLight('#000', 0, 18, 2);
  light.position.y = 2;
  group.add(light);
  // button in the top centre
  const button = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.1, 0.22, 40),
    new THREE.MeshStandardMaterial({ color: '#3b3f46', roughness: 0.55, transparent: true, opacity: 0.88 }),
  );
  button.position.y = 0.84;
  button.castShadow = true;
  group.add(button);
  // LED hole top left (seen from above with the USB edge towards the viewer)
  const ledHole = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 24), led);
  ledHole.position.set(-2.1, 0.77, -2.1);
  group.add(ledHole);
  const ledRim = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.46, 24), new THREE.MeshStandardMaterial({ color: '#0b0d10', roughness: 0.5 }));
  ledRim.rotation.x = -Math.PI / 2;
  ledRim.position.set(-2.1, 0.78, -2.1);
  group.add(ledRim);
  // USB socket bottom centre on the front edge (device −y): metal shell with dark opening
  const usb = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 0.14), new THREE.MeshStandardMaterial({ color: '#d1d5db', roughness: 0.3, metalness: 0.8 }));
  usb.position.set(0, -0.05, 3.02);
  group.add(usb);
  const usbSlot = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.2, 0.02), new THREE.MeshStandardMaterial({ color: '#0b0d10' }));
  usbSlot.position.set(0, -0.05, 3.1);
  group.add(usbSlot);

  // device axes: x red, y green, z blue (same colours as the charts)
  const axes: [string, string, THREE.Vector3][] = [['X', COLORS.x, new THREE.Vector3(1, 0, 0)], ['Y', COLORS.y, new THREE.Vector3(0, 0, -1)], ['Z', COLORS.z, new THREE.Vector3(0, 1, 0)]];
  for (const [name, color, dir] of axes) {
    const a = arrow(color, 5.2, 0.09);
    a.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    group.add(a);
    const l = label(name, color);
    l.position.copy(dir.clone().multiplyScalar(6.2));
    group.add(l);
  }
  return { group, led, glow, light, button };
}

function buildRoom(scene: THREE.Scene): void {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM, ROOM), new THREE.MeshStandardMaterial({ color: COLORS.panel, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(ROOM, 18, COLORS.teal, COLORS.line);
  grid.position.y = 0.02;
  scene.add(grid);
  const wallMat = new THREE.MeshStandardMaterial({ color: '#172030', roughness: 1 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(ROOM, HEIGHT), wallMat);
  back.position.set(0, HEIGHT / 2, -ROOM / 2);
  back.receiveShadow = true;
  const left = new THREE.Mesh(new THREE.PlaneGeometry(ROOM, HEIGHT), wallMat);
  left.rotation.y = Math.PI / 2;
  left.position.set(-ROOM / 2, HEIGHT / 2, 0);
  left.receiveShadow = true;
  scene.add(back, left);
  for (const [wall, rot] of [[back, [Math.PI / 2, 0, 0]], [left, [0, 0, Math.PI / 2]]] as const) {
    const g = new THREE.GridHelper(ROOM, 18, COLORS.line, '#222c3b');
    g.rotation.set(rot[0], rot[1], rot[2]);
    g.position.copy(wall.position).add(wall === back ? new THREE.Vector3(0, 0, 0.03) : new THREE.Vector3(0.03, 0, 0));
    g.scale.set(1, 1, HEIGHT / ROOM);
    scene.add(g);
  }
  // skirting in lime and the rest position marker on the floor
  const skirt = new THREE.MeshStandardMaterial({ color: COLORS.lime, emissive: COLORS.lime, emissiveIntensity: 0.35 });
  const s1 = new THREE.Mesh(new THREE.BoxGeometry(ROOM, 0.5, 0.3), skirt);
  s1.position.set(0, 0.25, -ROOM / 2 + 0.15);
  const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, ROOM), skirt);
  s2.position.set(-ROOM / 2 + 0.15, 0.25, 0);
  scene.add(s1, s2);
  const ring = new THREE.Mesh(new THREE.RingGeometry(4.6, 5, 64), new THREE.MeshBasicMaterial({ color: COLORS.lime, transparent: true, opacity: 0.45 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  scene.add(ring);
}

interface Ui {
  root: HTMLElement; stage: HTMLElement; note: HTMLElement;
  zero: HTMLButtonElement; resetView: HTMLButtonElement; translate: HTMLInputElement; fast: HTMLInputElement;
  source: HTMLElement; offset: HTMLElement; lin: HTMLElement; reference: HTMLElement;
}

function bindUi(root: HTMLElement): Ui {
  const q = <T extends HTMLElement>(sel: string): T => {
    const e = root.querySelector<T>(sel);
    if (!e) throw new Error(`${sel} missing`);
    return e;
  };
  return {
    root, stage: q('[data-room-stage]'), note: q('[data-room-note]'),
    zero: q('[data-room-zero]'), resetView: q('[data-room-view]'), translate: q('[data-room-translate]'), fast: q('[data-room-fast]'),
    source: q('[data-room-source]'), offset: q('[data-room-offset]'), lin: q('[data-room-lin]'), reference: q('[data-room-ref]'),
  };
}

const cm = (v: number): string => (Math.abs(v) < 0.05 ? '0.0' : (v * 100).toFixed(1)).replace('-', '−');

export function mountRoom(root: HTMLElement, log: (msg: string) => void): RoomView {
  const ui = bindUi(root);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  ui.translate.checked = !reduced.matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power', preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.domElement.setAttribute('aria-label', '3D-Ansicht: Thingy im Raum');
  ui.stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.bg);
  scene.fog = new THREE.Fog(COLORS.bg, 110, 190);
  scene.add(new THREE.HemisphereLight('#e0f2fe', '#111827', 1.3));
  const sun = new THREE.DirectionalLight('#ffffff', 2.4);
  sun.position.set(18, 60, 22);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 10, far: 120 });
  sun.shadow.bias = -0.0004;
  sun.shadow.radius = 6;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(COLORS.teal, 0.7);
  fill.position.set(-30, 20, 30);
  scene.add(fill);
  buildRoom(scene);

  const thingy = buildThingy();
  thingy.group.position.copy(BASE);
  scene.add(thingy.group);

  const linArrow = arrow(COLORS.lime, 1, 0.16);
  linArrow.visible = false;
  scene.add(linArrow);

  const ghostMat = Array.from({ length: GHOSTS }, (_, i) => new THREE.MeshBasicMaterial({
    color: COLORS.teal, transparent: true, opacity: 0.32 * (1 - i / GHOSTS), depthWrite: false,
  }));
  const ghostGeo = new RoundedBoxGeometry(6, 1.5, 6, 2, 0.55);
  const ghosts = ghostMat.map((m) => { const g = new THREE.Mesh(ghostGeo, m); g.visible = false; scene.add(g); return g; });
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3));
  const trailLine = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: COLORS.teal, transparent: true, opacity: 0.8 }));
  trailLine.frustumCulled = false;
  scene.add(trailLine);
  const trail: { pos: THREE.Vector3; quat: THREE.Quaternion }[] = [];
  let lastTrail = 0;

  const camera = new THREE.PerspectiveCamera(38, 16 / 9, 1, 400);
  camera.position.copy(CAMERA);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(TARGET);
  controls.enableDamping = !reduced.matches;
  controls.minDistance = 18;
  controls.maxDistance = 120;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minAzimuthAngle = -0.35;
  controls.maxAzimuthAngle = Math.PI / 2 + 0.35;
  controls.update();
  controls.saveState();

  // --- data ---
  const estimator = new MotionEstimator();
  let ref: Quat = [1, 0, 0, 0];
  let latest: MotionSample | null = null;
  let qTarget: Quat = [1, 0, 0, 0];
  let qShown: Quat = [1, 0, 0, 0];
  const posTarget = new THREE.Vector3();
  const posShown = new THREE.Vector3();
  const linShown = new THREE.Vector3();
  let fast: WebSocket | null = null;
  const rate = { count: 0, since: performance.now(), hz: 0 };
  let lastReadout = 0;

  function onSample(s: MotionSample): void {
    latest = s;
    const st = estimator.update(s);
    const back = conj(ref);
    qTarget = relativeTo(ref, s.q);
    posTarget.copy(toThreeVec(rotate(back, st.pos), 100));
    linShown.copy(toThreeVec(rotate(back, st.lin)));
    rate.count++;
    const now = performance.now();
    if (now - rate.since >= 1000) {
      const hz = (rate.count * 1000) / (now - rate.since);
      // moving average (EMA, ~5 s) so jitter in the arrival times does not make the readout jump
      rate.hz = rate.hz ? rate.hz + 0.2 * (hz - rate.hz) : hz;
      rate.count = 0;
      rate.since = now;
    }
    if (root.dataset.state !== 'live') {
      root.dataset.state = 'live';
      ui.note.hidden = true;
    }
    if (now - lastReadout > 200) {
      lastReadout = now;
      const p = rotate(back, st.pos);
      ui.offset.textContent = ui.translate.checked ? `x ${cm(p[0])} · y ${cm(p[1])} · z ${cm(p[2])} cm` : 'aus';
      ui.lin.textContent = `${Math.hypot(...st.lin).toFixed(2)} g${st.still ? ' · ruhig' : ''}`;
      ui.source.textContent = fast ? `WebSocket /api/motion · ${rate.hz.toFixed(0)} Hz` : `Stream /api/stream · ${rate.hz ? rate.hz.toFixed(0) : '–'} Hz`;
    }
  }

  function setLed(s: Snapshot): void {
    const l = s.ui?.led;
    const [r, g, b] = [l?.r, l?.g, l?.b].map((v) => (isNum(v) ? Math.max(0, Math.min(255, v)) : 0)) as [number, number, number];
    const level = Math.max(r, g, b) / 255;
    const color = new THREE.Color(`rgb(${r}, ${g}, ${b})`);
    thingy.led.emissive.copy(color);
    thingy.led.color.set(level > 0 ? color : new THREE.Color('#111'));
    thingy.glow.color.copy(color);
    thingy.glow.opacity = 0.9 * level;
    thingy.light.color.copy(color);
    thingy.light.intensity = 260 * level;
    thingy.button.position.y = s.ui?.button_pressed ? 0.76 : 0.84;
  }

  function stopFast(reason?: string): void {
    const ws = fast;
    fast = null;
    ws?.close();
    ui.fast.checked = false;
    estimator.reset();
    if (reason) log(reason);
  }

  function startFast(): void {
    const url = new URL('/api/motion', window.location.href);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (err) {
      stopFast(`3D-Schnellmodus: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }
    fast = ws;
    estimator.reset();
    rate.count = 0;
    rate.since = performance.now();
    rate.hz = 0;
    ws.addEventListener('message', (e) => {
      const s = typeof e.data === 'string' ? sampleFromFrame(e.data) : null;
      if (s && fast === ws) onSample(s);
    });
    ws.addEventListener('open', () => log('3D-Ansicht: Schnellmodus 100 Hz an (Spielmodus: Kompass/Euler pausiert, Mikrofon gesperrt)'));
    ws.addEventListener('close', () => { if (fast === ws) stopFast('3D-Ansicht: Schnellmodus beendet, zurück zum Stream (10 Hz)'); });
  }

  ui.fast.addEventListener('change', () => {
    if (ui.fast.checked) startFast();
    else stopFast('3D-Ansicht: Schnellmodus aus, Kompass und Euler laufen wieder');
  });
  ui.zero.addEventListener('click', () => {
    if (!latest) return;
    ref = latest.q;
    qTarget = qShown = [1, 0, 0, 0];
    estimator.reset();
    posTarget.set(0, 0, 0);
    ui.reference.textContent = 'relativ zur Nullstellung';
    ui.zero.setAttribute('aria-pressed', 'true');
  });
  ui.zero.addEventListener('dblclick', () => {
    ref = [1, 0, 0, 0];
    ui.reference.textContent = 'absolut (Sensorfusion)';
    ui.zero.setAttribute('aria-pressed', 'false');
  });
  ui.resetView.addEventListener('click', () => controls.reset());
  ui.translate.addEventListener('change', () => { trail.length = 0; });

  // --- render loop (only while visible) ---
  let visible = true;
  let raf = 0;
  let last = performance.now();
  new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    schedule();
  }).observe(root);
  document.addEventListener('visibilitychange', schedule);

  function resize(): void {
    const w = ui.stage.clientWidth;
    const h = ui.stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(ui.stage);
  resize();

  function schedule(): void {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function frame(now: number): void {
    raf = 0;
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    const snap = reduced.matches;
    const k = snap ? 1 : 1 - Math.exp(-dt / (fast ? 0.025 : 0.085));
    qShown = slerp(qShown, qTarget, k);
    const showMove = ui.translate.checked;
    posShown.lerp(showMove ? posTarget : new THREE.Vector3(), k);
    thingy.group.quaternion.copy(toThreeQuat(qShown));
    thingy.group.position.copy(BASE).add(posShown);

    const len = linShown.length();
    linArrow.visible = showMove && len > 0.03;
    if (linArrow.visible) {
      setArrowLength(linArrow, Math.min(16, len * ARROW_CM_PER_G), 0.16);
      linArrow.position.copy(thingy.group.position);
      linArrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), linShown.clone().normalize());
    }

    const showTrail = showMove && !snap;
    if (showTrail && now - lastTrail >= TRAIL_STEP_MS) {
      lastTrail = now;
      trail.unshift({ pos: thingy.group.position.clone(), quat: thingy.group.quaternion.clone() });
      trail.length = Math.min(trail.length, TRAIL);
    }
    const attr = trailGeo.getAttribute('position') as THREE.BufferAttribute;
    trail.forEach((p, i) => attr.setXYZ(i, p.pos.x, p.pos.y, p.pos.z));
    attr.needsUpdate = true;
    trailGeo.setDrawRange(0, showTrail ? trail.length : 0);
    ghosts.forEach((g, i) => {
      const p = trail[(i + 1) * Math.floor(TRAIL / GHOSTS) - 1];
      g.visible = showTrail && !!p && p.pos.distanceTo(thingy.group.position) > 0.6;
      if (p && g.visible) { g.position.copy(p.pos); g.quaternion.copy(p.quat); }
    });

    if (controls.enableDamping !== !snap) controls.enableDamping = !snap;
    controls.update();
    renderer.render(scene, camera);
    schedule();
  }
  schedule();
  window.addEventListener('pagehide', () => fast?.close());

  return {
    onSnapshot(s: Snapshot): void {
      setLed(s);
      if (fast) return;
      const sample = sampleFromSnapshot(s);
      if (sample) onSample(sample);
    },
  };
}
