/** three.js arena: floodlit hard court in Disroop colours, players, racket, ball with trail, cameras. */
import * as THREE from 'three';
import { COURT } from './core/court.ts';
import type { Quat } from './core/quat.ts';
import type { Side } from './core/swing.ts';

export type CameraMode = 'third' | 'first' | 'tv';
export const CAMERA_LABEL: Record<CameraMode, string> = { third: '3rd-Person', first: '1st-Person', tv: 'TV' };
export const CAMERAS: CameraMode[] = ['third', 'first', 'tv'];

export interface View {
  ball: [number, number, number];
  ballVisible: boolean;
  player: { x: number; z: number };
  cpu: { x: number; z: number };
  /** Live racket rotation (three.js axes, relative to the neutral pose) or null for the animation. */
  racket: Quat | null;
}

const W = COURT.doublesWidth;
const L = COURT.length;
const TRAIL = 40;

interface Player {
  group: THREE.Group;
  arm: THREE.Group;
  swing: { t: number; side: Side } | null;
}

function makePlayer(color: number): Player {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.9, 6, 16), mat);
  body.position.y = 1.05;
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), new THREE.MeshStandardMaterial({ color: 0xe0b48a, roughness: 0.6 }));
  head.position.y = 1.85;
  head.castShadow = true;
  g.add(head);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.21, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat);
  cap.position.y = 1.88;
  g.add(cap);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.55, 4, 8), new THREE.MeshStandardMaterial({ color: 0xf9fafb }));
    leg.position.set(s * 0.13, 0.38, 0);
    leg.castShadow = true;
    g.add(leg);
  }
  const arm = new THREE.Group();
  arm.position.set(0.35, 1.35, 0);
  g.add(arm);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.3), new THREE.MeshStandardMaterial({ color: 0x263349 }));
  handle.position.z = -0.35;
  arm.add(handle);
  const thingy = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.05, 0.09),
    new THREE.MeshStandardMaterial({ color: 0x334155, emissive: 0x4d7c0f, emissiveIntensity: 0.6 }),
  );
  thingy.position.set(0, 0.04, -0.27);
  arm.add(thingy);
  const frame = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.018, 10, 40), new THREE.MeshStandardMaterial({ color: 0xa3e635, metalness: 0.4, roughness: 0.3 }));
  frame.scale.set(1, 1.3, 1);
  frame.position.z = -0.72;
  frame.rotation.x = Math.PI / 2;
  frame.castShadow = true;
  arm.add(frame);
  const strings = new THREE.Mesh(
    new THREE.CircleGeometry(0.165, 32),
    new THREE.MeshStandardMaterial({ color: 0xf9fafb, transparent: true, opacity: 0.25, side: THREE.DoubleSide }),
  );
  strings.scale.set(1, 1.3, 1);
  strings.position.z = -0.72;
  strings.rotation.x = Math.PI / 2;
  arm.add(strings);
  return { group: g, arm, swing: null };
}

export class Arena {
  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 200);
  private readonly me = makePlayer(0x84cc16);
  private readonly cpu = makePlayer(0x2aa5a1);
  private readonly ball: THREE.Mesh;
  private readonly blob: THREE.Mesh;
  private readonly trailPos = new Float32Array(TRAIL * 3);
  private readonly trailGeo = new THREE.BufferGeometry();
  private readonly camPos = new THREE.Vector3(0, 3.4, 18);
  private readonly camLook = new THREE.Vector3(0, 1, -4);
  private readonly tmpQ = new THREE.Quaternion();
  private time = 0;
  camera_mode: CameraMode = 'third';

  constructor(parent: HTMLElement) {
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.outputColorSpace = THREE.SRGBColorSpace;
    parent.prepend(r.domElement);
    this.renderer = r;

    const s = this.scene;
    s.background = new THREE.Color(0x0b1220);
    s.fog = new THREE.Fog(0x0b1220, 40, 90);
    this.buildLights();
    this.buildCourt();

    this.me.group.position.set(0, 0, 11.4);
    this.cpu.group.position.set(0, 0, -11.4);
    this.cpu.group.rotation.y = Math.PI;
    s.add(this.me.group, this.cpu.group);

    this.ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 24, 16),
      new THREE.MeshStandardMaterial({ color: 0xd9f99d, emissive: 0xa3e635, emissiveIntensity: 0.9 }),
    );
    this.ball.castShadow = true;
    s.add(this.ball);
    this.trailGeo.setAttribute('position', new THREE.BufferAttribute(this.trailPos, 3));
    s.add(new THREE.Line(this.trailGeo, new THREE.LineBasicMaterial({ color: 0xa3e635, transparent: true, opacity: 0.6 })));
    this.blob = new THREE.Mesh(new THREE.CircleGeometry(0.09, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }));
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.position.y = 0.015;
    s.add(this.blob);

    const resize = () => {
      const w = parent.clientWidth || window.innerWidth;
      const h = parent.clientHeight || window.innerHeight;
      r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      r.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.fov = w / h < 1 ? 70 : 50;
      this.camera.updateProjectionMatrix();
    };
    new ResizeObserver(resize).observe(parent);
    resize();
  }

  private buildLights(): void {
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0x9ec9ff, 0x1a2a10, 0.55));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(8, 22, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 60 });
    s.add(sun);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.6, roughness: 0.4 });
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf9fafb, emissiveIntensity: 2 });
    for (const [x, z] of [[-12, -16], [12, -16], [-12, 16], [12, 16]] as const) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 12), poleMat);
      pole.position.set(x, 6, z);
      pole.castShadow = true;
      s.add(pole);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.4), lampMat);
      lamp.position.set(x, 12, z);
      lamp.lookAt(0, 0, 0);
      s.add(lamp);
      const pl = new THREE.PointLight(0xf5f5ff, 40, 40, 1.6);
      pl.position.set(x * 0.9, 11, z * 0.9);
      s.add(pl);
    }
  }

  private buildCourt(): void {
    const s = this.scene;
    const flat = (geo: THREE.PlaneGeometry, mat: THREE.Material, y: number, x = 0, z = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, y, z);
      m.receiveShadow = true;
      s.add(m);
      return m;
    };
    flat(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.95 }), 0);
    flat(new THREE.PlaneGeometry(W + 6, L + 10), new THREE.MeshStandardMaterial({ color: 0x245e71, roughness: 0.8 }), 0.005);
    flat(new THREE.PlaneGeometry(W, L), new THREE.MeshStandardMaterial({ color: 0x1d4f60, roughness: 0.75 }), 0.008);
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xa3e635, emissive: 0x4d7c0f, emissiveIntensity: 0.6 });
    const line = (x: number, z: number, w: number, l: number) => flat(new THREE.PlaneGeometry(w, l), lineMat, 0.012, x, z);
    const lw = 0.06;
    const sw = COURT.singlesHalfWidth * 2;
    line(0, -L / 2, W, lw);
    line(0, L / 2, W, lw);
    line(-W / 2, 0, lw, L);
    line(W / 2, 0, lw, L);
    line(-sw / 2, 0, lw, L);
    line(sw / 2, 0, lw, L);
    line(0, -COURT.serviceLine, sw, lw);
    line(0, COURT.serviceLine, sw, lw);
    line(0, 0, lw, COURT.serviceLine * 2);
    line(0, -L / 2 + 0.1, lw, 0.2);
    line(0, L / 2 - 0.1, lw, 0.2);

    const net = new THREE.Mesh(
      new THREE.PlaneGeometry(W + 1, COURT.netHeight, 40, 8),
      new THREE.MeshStandardMaterial({ color: 0xe5e7eb, wireframe: true, transparent: true, opacity: 0.55 }),
    );
    net.position.set(0, COURT.netHeight / 2, 0);
    s.add(net);
    const tape = new THREE.Mesh(new THREE.BoxGeometry(W + 1, 0.07, 0.03), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    tape.position.set(0, COURT.netHeight, 0);
    s.add(tape);
    for (const side of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.07), new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.7 }));
      p.position.set(side * (W / 2 + 0.5), 0.53, 0);
      p.castShadow = true;
      s.add(p);
      const stand = new THREE.Mesh(new THREE.BoxGeometry(34, 3, 4), new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 }));
      stand.position.set(0, 1.5, side * 22);
      s.add(stand);
      const banner = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 1),
        new THREE.MeshStandardMaterial({ color: 0x3f6212, emissive: 0x4d7c0f, emissiveIntensity: 0.8 }),
      );
      banner.position.set(0, 1.0, side * 19.95);
      banner.rotation.y = side < 0 ? 0 : Math.PI;
      s.add(banner);
    }
  }

  /** Starts the stroke animation (keyboard play, cpu, or when no live racket pose is available). */
  swing(who: 'player' | 'cpu', side: Side): void {
    (who === 'player' ? this.me : this.cpu).swing = { t: 0, side };
  }

  private animateArm(p: Player, dt: number, mirror: number): void {
    const sw = p.swing;
    if (!sw) {
      p.arm.rotation.set(0, 0, 0);
      return;
    }
    sw.t += dt;
    const k = Math.min(1, sw.t / 0.35);
    const dir = sw.side === 'forehand' ? 1 : -1;
    p.arm.rotation.set(-0.25 + 0.5 * k, dir * (1.6 - 3.2 * k) * mirror, 0);
    if (sw.t > 0.5) p.swing = null;
  }

  render(v: View, dt: number): void {
    this.time += dt;
    this.me.group.position.set(v.player.x, 0, v.player.z);
    this.cpu.group.position.set(v.cpu.x, 0, v.cpu.z);
    if (v.racket && !this.me.swing) {
      this.tmpQ.set(v.racket[1], v.racket[2], v.racket[3], v.racket[0]);
      this.me.arm.quaternion.slerp(this.tmpQ, Math.min(1, dt * 30));
    } else {
      this.animateArm(this.me, dt, 1);
    }
    this.animateArm(this.cpu, dt, 1);

    const [x, y, z] = v.ball;
    this.ball.visible = v.ballVisible;
    this.blob.visible = v.ballVisible;
    this.ball.position.set(x, y, z);
    this.blob.position.set(x, 0.015, z);
    const tp = this.trailPos;
    const jump = Math.hypot(tp[0]! - x, tp[1]! - y, tp[2]! - z) > 3; // new point / first frame: no streak
    if (jump || !v.ballVisible) {
      for (let i = 0; i < TRAIL; i++) tp.set([x, y, z], i * 3);
    } else {
      tp.copyWithin(3, 0, (TRAIL - 1) * 3);
      tp.set([x, y, z], 0);
    }
    this.trailGeo.attributes.position!.needsUpdate = true;

    this.placeCamera(v, dt);
    this.renderer.render(this.scene, this.camera);
  }

  private placeCamera(v: View, dt: number): void {
    const p = v.player;
    const pos = new THREE.Vector3();
    const look = new THREE.Vector3();
    if (this.camera_mode === 'third') {
      pos.set(p.x * 0.6, 3.8, p.z + 5.6);
      look.set(p.x * 0.3, 1.0, -4);
    } else if (this.camera_mode === 'first') {
      pos.set(p.x, 1.75, p.z + 0.25);
      look.set(v.ball[0] * 0.5, 1.1, -8);
    } else {
      pos.set(17, 10, 0);
      look.set(0, 0, 0);
    }
    const k = Math.min(1, dt * 4);
    this.camPos.lerp(pos, k);
    this.camLook.lerp(look, k);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  /** Jumps the camera to its target (no easing), e.g. after a camera switch in the demo. */
  snapCamera(v: View): void {
    this.placeCamera(v, 1);
  }
}
