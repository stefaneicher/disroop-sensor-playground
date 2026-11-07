/**
 * Procedural humanoid with a joint hierarchy ("skeleton") and layered procedural animation:
 * ready stance / run cycle / sitting / crouching as base, stroke poses (forehand, backhand, serve) blended on top.
 * The figure stands at the origin and faces -Z.
 */
import * as THREE from 'three';
import { makeRacket } from './racket.ts';

export const JOINTS = [
  'spine', 'neck', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'wristL', 'wristR',
  'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR',
] as const;
export type Joint = (typeof JOINTS)[number];
type E = [number, number, number];
export type Pose = Partial<Record<Joint, E>> & { y?: number };

export interface Kit {
  shirt: number;
  shorts: number;
  skin: number;
  hair: number;
  shoes: number;
  accent: number;
  socks?: number;
  cap?: boolean;
}

export type Stroke = 'forehand' | 'backhand' | 'serve';
export type Base = 'ready' | 'sit' | 'crouch' | 'stand';

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const smooth = (k: number) => k * k * (3 - 2 * k);

export function blend(out: Required<Pose>, b: Pose, k: number): void {
  if (k <= 0) return;
  for (const j of JOINTS) {
    const v = b[j];
    if (!v) continue;
    const o = out[j];
    o[0] = lerp(o[0], v[0], k);
    o[1] = lerp(o[1], v[1], k);
    o[2] = lerp(o[2], v[2], k);
  }
  if (b.y !== undefined) out.y = lerp(out.y, b.y, k);
}

function zero(): Required<Pose> {
  const p = { y: 0 } as Required<Pose>;
  for (const j of JOINTS) p[j] = [0, 0, 0];
  return p;
}

// ---- poses (right-handed player; +x = right, -z = forward) ------------------------------------------------

const READY: Pose = {
  y: -0.07,
  spine: [-0.28, 0, 0],
  neck: [0.2, 0, 0],
  hipL: [0.38, 0, -0.14],
  hipR: [0.38, 0, 0.14],
  kneeL: [-0.72, 0, 0],
  kneeR: [-0.72, 0, 0],
  ankleL: [0.3, 0, 0],
  ankleR: [0.3, 0, 0],
  shoulderR: [0.55, 0, 0.18],
  elbowR: [1.15, 0, 0],
  wristR: [0.15, 0, 0],
  shoulderL: [0.65, 0, -0.12],
  elbowL: [1.35, 0, 0],
  wristL: [0.2, 0, 0],
};

const STAND: Pose = {
  y: 0,
  spine: [0, 0, 0],
  shoulderR: [0.05, 0, 0.12],
  shoulderL: [0.05, 0, -0.12],
  elbowR: [0.25, 0, 0],
  elbowL: [0.25, 0, 0],
  hipL: [0, 0, -0.04],
  hipR: [0, 0, 0.04],
};

const SIT: Pose = {
  y: -0.42,
  spine: [0.05, 0, 0],
  hipL: [1.5, 0, -0.08],
  hipR: [1.5, 0, 0.08],
  kneeL: [-1.45, 0, 0],
  kneeR: [-1.45, 0, 0],
  shoulderR: [0.45, 0, 0.1],
  shoulderL: [0.45, 0, -0.1],
  elbowR: [0.9, 0, 0],
  elbowL: [0.9, 0, 0],
};

const CROUCH: Pose = {
  y: -0.42,
  spine: [-0.55, 0, 0],
  neck: [0.45, 0, 0],
  hipL: [1.6, 0, -0.25],
  hipR: [1.6, 0, 0.25],
  kneeL: [-2.1, 0, 0],
  kneeR: [-2.1, 0, 0],
  ankleL: [0.5, 0, 0],
  ankleR: [0.5, 0, 0],
  shoulderR: [0.5, 0, 0.1],
  shoulderL: [0.5, 0, -0.1],
  elbowR: [0.7, 0, 0],
  elbowL: [0.7, 0, 0],
};

/** Key poses per stroke: [backswing, contact, follow-through]. Upper body only (legs keep the base layer). */
const STROKES: Record<Stroke, [Pose, Pose, Pose]> = {
  forehand: [
    { spine: [-0.2, -1.15, 0.05], shoulderR: [0.15, 0, 1.2], elbowR: [0.55, 0, 0], wristR: [-0.35, 0, 0], shoulderL: [1.25, 0, -0.35], elbowL: [0.25, 0, 0] },
    { spine: [-0.15, 0.1, 0], shoulderR: [0.6, 0, 1.25], elbowR: [0.3, 0, 0], wristR: [0, 0, 0], shoulderL: [0.7, 0, -0.5], elbowL: [0.5, 0, 0] },
    { spine: [-0.1, 0.95, -0.05], shoulderR: [2.2, 0, 0.35], elbowR: [1.6, 0, 0], wristR: [0.2, 0, 0], shoulderL: [0.3, 0, -0.6], elbowL: [0.9, 0, 0] },
  ],
  backhand: [
    { spine: [-0.2, 1.2, 0], shoulderR: [1.0, 0, -0.6], elbowR: [0.5, 0, 0], wristR: [0.1, 0, 0], shoulderL: [1.0, 0, 0.3], elbowL: [1.0, 0, 0] },
    { spine: [-0.15, 0.3, 0], shoulderR: [1.3, 0, 0.2], elbowR: [0.1, 0, 0], wristR: [0, 0, 0], shoulderL: [0.6, 0, -0.3], elbowL: [0.6, 0, 0] },
    { spine: [-0.1, -0.45, 0], shoulderR: [2.4, 0, 1.3], elbowR: [0.3, 0, 0], wristR: [0, 0, 0], shoulderL: [-0.3, 0, -0.8], elbowL: [0.3, 0, 0] },
  ],
  serve: [
    {
      y: -0.12, spine: [0.25, -0.6, 0], neck: [-0.35, 0.3, 0],
      shoulderL: [2.9, 0, -0.1], elbowL: [0.05, 0, 0], shoulderR: [0.3, 0, 1.6], elbowR: [1.95, 0, 0], wristR: [-0.5, 0, 0],
      hipL: [0.15, 0, -0.15], hipR: [-0.1, 0, 0.15], kneeL: [-0.95, 0, 0], kneeR: [-0.95, 0, 0], ankleL: [0.45, 0, 0], ankleR: [0.45, 0, 0],
    },
    {
      y: 0.04, spine: [-0.1, 0.2, 0], neck: [-0.45, 0, 0],
      shoulderR: [2.95, 0, 0.25], elbowR: [0.05, 0, 0], wristR: [0, 0, 0], shoulderL: [0.8, 0, -0.3], elbowL: [1.2, 0, 0],
      hipL: [0, 0, -0.05], hipR: [0, 0, 0.05], kneeL: [-0.05, 0, 0], kneeR: [-0.05, 0, 0], ankleL: [-0.45, 0, 0], ankleR: [-0.45, 0, 0],
    },
    {
      y: -0.06, spine: [-0.5, 0.7, 0], neck: [0.2, 0, 0],
      shoulderR: [0.8, 0, -0.5], elbowR: [0.6, 0, 0], wristR: [0.2, 0, 0], shoulderL: [0.4, 0, -0.4], elbowL: [1.0, 0, 0],
      hipL: [-0.3, 0, -0.1], hipR: [0.6, 0, 0.1], kneeL: [-0.3, 0, 0], kneeR: [-0.7, 0, 0], ankleL: [0.2, 0, 0], ankleR: [0.2, 0, 0],
    },
  ],
};

// ---- geometry ---------------------------------------------------------------------------------------------

const capsule = (r: number, len: number) => {
  const g = new THREE.CapsuleGeometry(r, len, 6, 14);
  g.translate(0, -len / 2, 0); // hangs down from the joint
  return g;
};

function lathe(profile: [number, number][], segs = 20): THREE.LatheGeometry {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segs);
}

export class Humanoid {
  readonly root = new THREE.Group();
  readonly hips = new THREE.Group();
  readonly j = {} as Record<Joint, THREE.Group>;
  readonly racket: THREE.Group | null;
  readonly hand: THREE.Group;
  base: Base = 'ready';
  /** Running speed 0..1 and direction (-1 left, +1 right in the figure's frame). */
  private run = 0;
  private runDir = 0;
  private phase = 0;
  private stroke: { kind: Stroke; t: number; hold: boolean } | null = null;
  private prep: { kind: Stroke; w: number } = { kind: 'forehand', w: 0 };
  private readonly pose = zero();
  private lookYaw = 0;
  private lookPitch = 0;
  private lastPos = new THREE.Vector3();
  private time = Math.random() * 10;
  /** Live racket arm: rotation of the arm+racket (three.js axes, in the figure frame), overrides the right arm. */
  live: THREE.Quaternion | null = null;

  constructor(kit: Kit, withRacket = true) {
    const mat = (color: number, rough = 0.75, extra: THREE.MeshStandardMaterialParameters = {}) =>
      new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });
    const skin = new THREE.MeshPhysicalMaterial({ color: kit.skin, roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color(0xffd0b0) });
    const shirt = new THREE.MeshPhysicalMaterial({ color: kit.shirt, roughness: 0.8, sheen: 1, sheenRoughness: 0.6, sheenColor: new THREE.Color(kit.shirt).lerp(new THREE.Color(0xffffff), 0.4) });
    const shorts = mat(kit.shorts, 0.8);
    const hair = mat(kit.hair, 0.6);
    const shoes = mat(kit.shoes, 0.5);
    const sole = mat(0xf3f4f6, 0.7);
    const sock = mat(kit.socks ?? 0xf9fafb, 0.9);
    const accent = mat(kit.accent, 0.5);

    const add = (parent: THREE.Object3D, geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const joint = (name: Joint, parent: THREE.Object3D, x: number, y: number, z = 0) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      parent.add(g);
      this.j[name] = g;
      return g;
    };

    this.root.add(this.hips);
    this.hips.position.y = 0.95;
    // pelvis / shorts
    const pelvis = add(this.hips, lathe([[0.001, -0.12], [0.13, -0.11], [0.16, -0.04], [0.155, 0.06], [0.14, 0.12], [0.001, 0.12]]), shorts);
    pelvis.scale.z = 0.72;

    const spine = joint('spine', this.hips, 0, 0.08);
    const torso = add(
      spine,
      lathe([[0.001, -0.02], [0.14, -0.02], [0.15, 0.08], [0.165, 0.22], [0.185, 0.34], [0.19, 0.42], [0.15, 0.49], [0.06, 0.52], [0.001, 0.52]], 24),
      shirt,
    );
    torso.scale.z = 0.62;
    // shirt number band / accent stripe
    const stripe = add(spine, new THREE.CylinderGeometry(0.1915, 0.1915, 0.035, 24, 1, true), accent, 0, 0.36);
    stripe.scale.z = 0.625;

    const neck = joint('neck', spine, 0, 0.5);
    add(neck, new THREE.CylinderGeometry(0.048, 0.055, 0.1, 12), skin, 0, 0.04);
    const head = add(neck, new THREE.SphereGeometry(0.1, 24, 18), skin, 0, 0.17, -0.005);
    head.scale.set(0.88, 1.12, 1);
    // jaw / chin
    add(neck, new THREE.SphereGeometry(0.068, 16, 12), skin, 0, 0.115, -0.03).scale.set(1, 0.9, 1);
    const nose = add(neck, new THREE.ConeGeometry(0.015, 0.04, 8), skin, 0, 0.165, -0.103);
    nose.rotation.x = -Math.PI / 2 + 0.3;
    for (const s of [-1, 1]) add(neck, new THREE.SphereGeometry(0.02, 8, 8), skin, s * 0.088, 0.165, 0.005).scale.set(0.5, 1, 0.8);
    const hairCap = add(neck, new THREE.SphereGeometry(0.104, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, 0, 0.185, 0.008);
    hairCap.scale.set(0.9, 1.08, 1.04);
    hairCap.rotation.x = -0.25;
    if (kit.cap) {
      const capM = add(neck, new THREE.SphereGeometry(0.108, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), accent, 0, 0.2, 0);
      capM.scale.set(0.92, 0.9, 1.02);
      const bill = add(neck, new THREE.CylinderGeometry(0.09, 0.09, 0.008, 20, 1, false, -Math.PI / 2, Math.PI), accent, 0, 0.2, -0.06);
      bill.scale.set(0.9, 1, 0.9);
      bill.rotation.x = 0.12;
    } else {
      const band = add(neck, new THREE.TorusGeometry(0.094, 0.012, 8, 28), accent, 0, 0.215, 0);
      band.rotation.x = Math.PI / 2 - 0.15;
      band.scale.set(0.92, 1.06, 1);
    }

    for (const s of [-1, 1] as const) {
      const L = s < 0;
      const sh = joint(L ? 'shoulderL' : 'shoulderR', spine, s * 0.2, 0.43);
      add(sh, new THREE.SphereGeometry(0.062, 14, 10), shirt, 0, -0.01);
      add(sh, capsule(0.058, 0.1), shirt, 0, 0.01).scale.z = 0.95; // sleeve
      add(sh, capsule(0.043, 0.22), skin, 0, -0.02);
      const el = joint(L ? 'elbowL' : 'elbowR', sh, 0, -0.28);
      add(el, capsule(0.037, 0.21), skin, 0, -0.01);
      const wr = joint(L ? 'wristL' : 'wristR', el, 0, -0.26);
      add(wr, capsule(0.04, 0.02), accent, 0, 0.035); // wristband
      const hand = add(wr, new THREE.SphereGeometry(0.045, 14, 10), skin, 0, -0.05);
      hand.scale.set(0.75, 1.15, 0.6);
      if (!L) this.hand = wr;

      const hip = joint(L ? 'hipL' : 'hipR', this.hips, s * 0.09, -0.06);
      add(hip, capsule(0.085, 0.14), shorts, 0, 0.02);
      add(hip, capsule(0.07, 0.3), skin, 0, -0.04);
      const kn = joint(L ? 'kneeL' : 'kneeR', hip, 0, -0.42);
      add(kn, capsule(0.052, 0.3), skin, 0, -0.01);
      add(kn, new THREE.CylinderGeometry(0.047, 0.05, 0.12, 12), sock, 0, -0.33);
      const an = joint(L ? 'ankleL' : 'ankleR', kn, 0, -0.41);
      const shoe = add(an, new THREE.CapsuleGeometry(0.045, 0.16, 6, 12), shoes, 0, -0.025, -0.045);
      shoe.rotation.x = Math.PI / 2;
      shoe.scale.set(1.05, 1, 0.85);
      const so = add(an, new THREE.BoxGeometry(0.095, 0.022, 0.27), sole, 0, -0.055, -0.045);
      so.castShadow = false;
    }
    this.hand ??= new THREE.Group();
    if (withRacket) {
      this.racket = makeRacket();
      this.racket.position.set(0, -0.06, 0);
      this.hand.add(this.racket);
    } else this.racket = null;
  }

  /** Starts a stroke animation. `hold` (serve toss) keeps the backswing until `strike()`. */
  swing(kind: Stroke, hold = false): void {
    this.stroke = { kind, t: hold ? -1 : 0, hold };
  }

  /** Contact: continues a held stroke (serve) or starts a new one from the contact pose. */
  strike(kind: Stroke): void {
    if (this.stroke?.hold && this.stroke.kind === kind) {
      this.stroke.hold = false;
      this.stroke.t = 0;
    } else this.stroke = { kind, t: 0, hold: false };
  }

  /** Anticipation: blend towards the backswing (0..1). */
  prepare(kind: Stroke, w: number): void {
    this.prep.kind = kind;
    this.prep.w = w;
  }

  /** Where the figure looks (world position), e.g. the ball. */
  lookAt(target: THREE.Vector3): void {
    const local = this.root.worldToLocal(target.clone());
    const yaw = Math.atan2(-local.x, -local.z);
    const pitch = Math.atan2(local.y - 1.65, Math.hypot(local.x, local.z));
    this.lookYaw = THREE.MathUtils.clamp(yaw, -1.1, 1.1);
    this.lookPitch = THREE.MathUtils.clamp(pitch, -0.6, 0.6);
  }

  update(dt: number): void {
    this.time += dt;
    // locomotion from the root movement (figure frame)
    const p = this.root.position;
    const vel = p.clone().sub(this.lastPos).divideScalar(Math.max(dt, 1e-3));
    this.lastPos.copy(p);
    if (vel.length() > 20) vel.set(0, 0, 0); // teleport
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.root.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.root.quaternion);
    const speed = Math.hypot(vel.x, vel.z);
    const targetRun = this.base === 'ready' ? THREE.MathUtils.clamp(speed / 5, 0, 1) : 0;
    this.run = lerp(this.run, targetRun, Math.min(1, dt * 8));
    const lat = vel.dot(right);
    this.runDir = lerp(this.runDir, speed > 0.3 ? lat / speed : 0, Math.min(1, dt * 6));
    this.phase += dt * (4 + 7 * this.run) * (speed > 0.2 ? 1 : 0);
    void fwd;

    const P = this.pose;
    for (const j of JOINTS) P[j].fill(0);
    P.y = 0;
    blend(P, this.base === 'sit' ? SIT : this.base === 'crouch' ? CROUCH : this.base === 'stand' ? STAND : READY, 1);
    if (this.base === 'ready') {
      // idle: small bounce on the toes
      const b = Math.sin(this.time * 5.5) * 0.012 * (1 - this.run);
      P.y += b;
      const r = this.run;
      if (r > 0.02) {
        const s = Math.sin(this.phase);
        const c = Math.cos(this.phase);
        // side-step run: hips turn towards the running direction (handled via the whole body below)
        P.hipL[0] += 0.75 * s * r;
        P.hipR[0] -= 0.75 * s * r;
        P.kneeL[0] -= 0.9 * Math.max(0, -c) * r;
        P.kneeR[0] -= 0.9 * Math.max(0, c) * r;
        P.shoulderL[0] -= 0.5 * s * r;
        P.elbowL[0] += 0.2 * r;
        P.spine[0] -= 0.12 * r;
        P.y += (Math.abs(Math.sin(this.phase)) * 0.05 - 0.02) * r;
      }
      P.spine[1] -= this.runDir * 0.35 * r;
    }
    // stroke layer
    if (this.prep.w > 0 && (!this.stroke || this.stroke.hold)) blend(P, STROKES[this.prep.kind][0], smooth(this.prep.w));
    const st = this.stroke;
    if (st) {
      const [back, contact, follow] = STROKES[st.kind];
      const hold = st.kind === 'serve' ? 0.12 : 0.07;
      if (st.hold) {
        st.t -= dt; // time held (negative)
        blend(P, back, smooth(Math.min(1, -st.t / 0.45)));
        if (st.t < -2.5) this.stroke = null;
      } else {
        st.t += dt;
        const t = st.t;
        const tmp = zero();
        for (const jn of JOINTS) tmp[jn] = [...P[jn]] as E;
        tmp.y = P.y;
        blend(tmp, back, 1);
        if (t < hold) blend(tmp, contact, smooth(t / hold));
        else {
          blend(tmp, contact, 1);
          blend(tmp, follow, smooth(Math.min(1, (t - hold) / 0.3)));
        }
        const out = t > 0.55 ? 1 - smooth(Math.min(1, (t - 0.55) / 0.35)) : 1;
        blend(P, tmp, out);
        if (t > 0.9) this.stroke = null;
      }
    }
    // head tracks the target
    P.neck[1] += this.lookYaw - P.spine[1] * 0.7;
    P.neck[0] += -this.lookPitch * 0.6;

    this.hips.position.y = 0.95 + P.y;
    this.root.rotation.y = this.root.rotation.y; // root yaw set by the owner
    for (const jn of JOINTS) {
      const v = P[jn];
      this.j[jn].rotation.set(v[0], v[1], v[2]);
    }
    if (this.live) this.applyLive();
  }

  /** Right arm straight along the live racket direction; the racket keeps its pose relative to the arm. */
  private applyLive(): void {
    const sh = this.j.shoulderR;
    this.j.elbowR.rotation.set(0, 0, 0);
    this.j.wristR.rotation.set(0, 0, 0);
    // desired: neutral = arm pointing forward (-z) with the string face horizontal
    const want = new THREE.Quaternion().multiplyQuaternions(this.live!, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
    const parent = new THREE.Quaternion();
    sh.parent!.getWorldQuaternion(parent);
    const rootQ = new THREE.Quaternion();
    this.root.getWorldQuaternion(rootQ);
    // want is in the figure frame: world = rootQ * want; local = parent^-1 * world
    sh.quaternion.copy(parent.invert().multiply(rootQ.multiply(want)));
  }
}
