/** three.js arena: floodlit stadium (stands, crowd, sky), PBR court, articulated players, ball with glow trail, cameras. */
import * as THREE from 'three';
import { COURT } from './core/court.ts';
import type { Quat } from './core/quat.ts';
import type { Side } from './core/swing.ts';
import { Court, FLOOR_L, FLOOR_W } from './gfx/court.ts';
import { Humanoid, type Kit } from './gfx/humanoid.ts';
import { Stadium } from './gfx/stadium.ts';
import { ballTexture, radialTexture } from './gfx/textures.ts';

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

const TRAIL = 40;

const ME: Kit = { shirt: 0x84cc16, shorts: 0x1f2937, skin: 0xe0b48a, hair: 0x3b2a1e, shoes: 0xf9fafb, accent: 0x14532d, cap: true };
const CPU: Kit = { shirt: 0x2aa5a1, shorts: 0xf9fafb, skin: 0xb98260, hair: 0x15110d, shoes: 0x111827, accent: 0xf9fafb };

export class Arena {
  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 400);
  private readonly me = new Humanoid(ME);
  private readonly cpu = new Humanoid(CPU);
  private readonly stadium: Stadium;
  private readonly ball: THREE.Mesh;
  private readonly glow: THREE.Sprite;
  private readonly blob: THREE.Mesh;
  private readonly trailPos = new Float32Array(TRAIL * 3);
  private readonly trailGeo = new THREE.BufferGeometry();
  private readonly camPos = new THREE.Vector3(0, 3.4, 18);
  private readonly camLook = new THREE.Vector3(0, 1, -4);
  private readonly tmpQ = new THREE.Quaternion();
  private readonly tmpV = new THREE.Vector3();
  private time = 0;
  camera_mode: CameraMode = 'third';

  constructor(parent: HTMLElement) {
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.outputColorSpace = THREE.SRGBColorSpace;
    parent.prepend(r.domElement);
    this.renderer = r;

    const s = this.scene;
    s.background = new THREE.Color(0x070d18);
    s.fog = new THREE.Fog(0x0b1424, 55, 150);
    this.buildLights();
    this.stadium = new Stadium(FLOOR_W, FLOOR_L);
    s.add(this.stadium.group);
    s.add(new Court('hart').group);

    this.me.root.position.set(0, 0, 11.4);
    this.cpu.root.position.set(0, 0, -11.4);
    this.cpu.root.rotation.y = Math.PI;
    s.add(this.me.root, this.cpu.root);

    const bt = ballTexture();
    this.ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 32, 20),
      new THREE.MeshStandardMaterial({ map: bt, color: 0xe8ff4a, roughness: 0.85, emissive: 0x9acd1a, emissiveIntensity: 0.35 }),
    );
    this.ball.castShadow = true;
    s.add(this.ball);
    this.glow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: radialTexture([[0, 0.9], [0.4, 0.25], [1, 0]]), color: 0xc6f24a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }),
    );
    this.glow.scale.setScalar(0.45);
    s.add(this.glow);

    const fade = new Float32Array(TRAIL * 3);
    for (let i = 0; i < TRAIL; i++) {
      const k = (1 - i / TRAIL) ** 2;
      fade.set([0.64 * k, 0.9 * k, 0.2 * k], i * 3);
    }
    this.trailGeo.setAttribute('position', new THREE.BufferAttribute(this.trailPos, 3));
    this.trailGeo.setAttribute('color', new THREE.BufferAttribute(fade, 3));
    const trail = new THREE.Points(
      this.trailGeo,
      new THREE.PointsMaterial({
        size: 0.16,
        map: radialTexture(),
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        sizeAttenuation: true,
      }),
    );
    trail.frustumCulled = false;
    s.add(trail);
    this.blob = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.5),
      new THREE.MeshBasicMaterial({ map: radialTexture([[0, 0.6], [1, 0]]), color: 0x000000, transparent: true, depthWrite: false }),
    );
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.position.y = 0.02;
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
    s.add(new THREE.HemisphereLight(0x9ec9ff, 0x1a2a3a, 0.45));
    const sun = new THREE.DirectionalLight(0xfff4e6, 1.3);
    sun.position.set(9, 24, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 26, bottom: -26, near: 1, far: 70 });
    s.add(sun);
    for (const [x, z] of [[-13, -19], [13, -19], [-13, 19], [13, 19]] as const) {
      const sp = new THREE.SpotLight(0xf5f7ff, 260, 70, 0.7, 0.7, 1.6);
      sp.position.set(x, 14, z);
      sp.target.position.set(0, 0, 0);
      s.add(sp, sp.target);
    }
  }

  /** Starts the stroke animation (keyboard play, cpu, or when no live racket pose is available). */
  swing(who: 'player' | 'cpu', side: Side): void {
    (who === 'player' ? this.me : this.cpu).strike(side);
  }

  render(v: View, dt: number): void {
    this.time += dt;
    this.me.root.position.set(v.player.x, 0, v.player.z);
    this.cpu.root.position.set(v.cpu.x, 0, v.cpu.z);
    this.tmpV.set(...v.ball);
    this.me.lookAt(this.tmpV);
    this.cpu.lookAt(this.tmpV);
    if (v.racket) {
      this.tmpQ.set(v.racket[1], v.racket[2], v.racket[3], v.racket[0]);
      if (!this.me.live) this.me.live = this.tmpQ.clone();
      else this.me.live.slerp(this.tmpQ, Math.min(1, dt * 30));
    } else this.me.live = null;
    this.me.update(dt);
    this.cpu.update(dt);
    this.stadium.update(this.time);

    const [x, y, z] = v.ball;
    this.ball.visible = v.ballVisible;
    this.glow.visible = v.ballVisible;
    this.blob.visible = v.ballVisible;
    this.ball.position.set(x, y, z);
    this.ball.rotation.x += dt * 14;
    this.glow.position.set(x, y, z);
    this.blob.position.set(x, 0.02, z);
    this.blob.scale.setScalar(1 + y * 0.35);
    (this.blob.material as THREE.MeshBasicMaterial).opacity = Math.max(0.15, 0.9 - y * 0.18);
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
