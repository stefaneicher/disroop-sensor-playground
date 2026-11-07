/** Night stadium around the court: starry sky, backdrop walls with LED boards, tiered stands with a moving crowd, light masts, umpire chair. */
import * as THREE from 'three';
import { Humanoid } from './humanoid.ts';
import { canvas, drawBanner, loadImage, radialTexture, rand, tex } from './textures.ts';

const ROW_H = 0.55;
const ROW_D = 0.9;
const BASE_H = 2.6;
const CROWD_COLORS = [0xe5e7eb, 0x9ca3af, 0x2aa5a1, 0xa3e635, 0xf59e0b, 0xef4444, 0x3b82f6, 0x111827, 0xf9fafb, 0x7c3aed];
const SKIN = [0xf1c9a5, 0xe0b48a, 0xc68863, 0x8d5a3b, 0x5b3a26];

interface Stand {
  /** Point on the wall line where the first row starts. */
  origin: THREE.Vector3;
  /** Unit vectors in the xz plane: away from the court and along the wall. */
  out: THREE.Vector3;
  along: THREE.Vector3;
  length: number;
  rows: number;
}

function skyTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(512, 512);
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#02050c');
  gr.addColorStop(0.55, '#0a1426');
  gr.addColorStop(0.85, '#1c3250');
  gr.addColorStop(1, '#3a5578');
  g.fillStyle = gr;
  g.fillRect(0, 0, 512, 512);
  const r = rand(77);
  for (let i = 0; i < 260; i++) {
    const y = r() ** 1.8 * 330;
    g.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.6})`;
    g.fillRect(r() * 512, y, 1 + (r() < 0.1 ? 1 : 0), 1);
  }
  return tex(c);
}

function lampTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(128, 64);
  g.fillStyle = '#d8dde6';
  g.fillRect(0, 0, 128, 64);
  g.fillStyle = '#ffffff';
  for (let y = 0; y < 4; y++) for (let x = 0; x < 8; x++) {
    g.beginPath();
    g.arc(8 + x * 16, 8 + y * 16, 6, 0, Math.PI * 2);
    g.fill();
  }
  return tex(c);
}

export class Stadium {
  readonly group = new THREE.Group();
  private readonly crowd: { body: THREE.InstancedMesh; head: THREE.InstancedMesh; base: THREE.Matrix4[]; phase: Float32Array } | null;
  private readonly umpire: Humanoid;
  private readonly m = new THREE.Matrix4();
  private readonly p = new THREE.Vector3();
  private readonly q = new THREE.Quaternion();
  private readonly one = new THREE.Vector3(1, 1, 1);
  private last = 0;
  private crowdClock = 1;

  private readonly fw: number;
  private readonly fl: number;

  constructor(fw: number, fl: number) {
    this.fw = fw;
    this.fl = fl;
    const g = this.group;
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(300, 32, 16),
      new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false, depthWrite: false }),
    );
    sky.renderOrder = -10;
    g.add(sky);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x0d141f, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    g.add(ground);

    this.buildWalls();
    const hx = fw / 2;
    const hz = fl / 2;
    const stands: Stand[] = [
      { origin: new THREE.Vector3(-26, 0, -(hz + 0.6)), out: new THREE.Vector3(0, 0, -1), along: new THREE.Vector3(1, 0, 0), length: 52, rows: 11 },
      { origin: new THREE.Vector3(-26, 0, hz + 0.6), out: new THREE.Vector3(0, 0, 1), along: new THREE.Vector3(1, 0, 0), length: 52, rows: 11 },
      { origin: new THREE.Vector3(-(hx + 0.6), 0, -hz + 0.2), out: new THREE.Vector3(-1, 0, 0), along: new THREE.Vector3(0, 0, 1), length: fl - 0.4, rows: 7 },
      { origin: new THREE.Vector3(hx + 0.6, 0, -hz + 0.2), out: new THREE.Vector3(1, 0, 0), along: new THREE.Vector3(0, 0, 1), length: fl - 0.4, rows: 7 },
    ];
    this.crowd = this.buildStands(stands);
    this.buildMasts();

    this.umpire = new Humanoid({ shirt: 0xf3f4f6, shorts: 0x1f2937, skin: 0xe0b48a, hair: 0x6b7280, shoes: 0x111827, accent: 0x1f2937 }, false);
    this.umpire.base = 'sit';
    this.umpire.root.position.set(-(hx - 1.6), 1.72, 0);
    this.umpire.root.rotation.y = -Math.PI / 2;
    g.add(this.umpire.root);
    this.buildChair(-(hx - 1.6), 0);
  }

  private buildWalls(): void {
    const { fw, fl } = this;
    const hx = fw / 2;
    const hz = fl / 2;
    const g = this.group;
    const [bc] = [canvas(1024, 128)];
    drawBanner(bc[0], null, 0);
    const board = tex(bc[0], true, true);
    void loadImage('disroop.png').then((img) => {
      if (!img) return;
      drawBanner(bc[0], img, 0);
      board.needsUpdate = true;
    });
    const wall = new THREE.MeshStandardMaterial({ color: 0x0f3d2e, roughness: 0.85 });
    const boardMat = new THREE.MeshStandardMaterial({ map: board, emissiveMap: board, emissive: 0xffffff, emissiveIntensity: 0.7, roughness: 0.4 });
    const make = (len: number, x: number, z: number, ry: number) => {
      const w = new THREE.Mesh(new THREE.BoxGeometry(len, BASE_H, 0.3), wall);
      w.position.set(x, BASE_H / 2, z);
      w.rotation.y = ry;
      w.receiveShadow = true;
      g.add(w);
      const b = boardMat.clone();
      b.map = board.clone();
      b.map.needsUpdate = true;
      b.map.repeat.set(len / 8, 1);
      b.emissiveMap = b.map;
      const face = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.9), b);
      const inward = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry));
      face.position.set(x + inward.x * 0.16, 0.55, z + inward.z * 0.16);
      face.rotation.y = ry;
      g.add(face);
    };
    make(fw + 0.6, 0, -hz - 0.15, 0);
    make(fw + 0.6, 0, hz + 0.15, Math.PI);
    make(fl + 0.6, -hx - 0.15, 0, Math.PI / 2);
    make(fl + 0.6, hx + 0.15, 0, -Math.PI / 2);
  }

  private buildStands(stands: Stand[]) {
    const g = this.group;
    const r = rand(1234);
    const concrete = new THREE.MeshStandardMaterial({ color: 0x1b2433, roughness: 0.9 });
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x23406a, roughness: 0.7 });
    const bodyGeo = new THREE.CapsuleGeometry(0.17, 0.3, 3, 8);
    const headGeo = new THREE.SphereGeometry(0.11, 10, 8);
    let total = 0;
    for (const s of stands) total += Math.floor(s.length / 0.72) * s.rows;
    const body = new THREE.InstancedMesh(bodyGeo, new THREE.MeshStandardMaterial({ roughness: 0.8 }), total);
    const head = new THREE.InstancedMesh(headGeo, new THREE.MeshStandardMaterial({ roughness: 0.7 }), total);
    const base: THREE.Matrix4[] = [];
    const phase = new Float32Array(total);
    const col = new THREE.Color();
    let n = 0;
    for (const s of stands) {
      const yaw = Math.atan2(-s.out.x, -s.out.z); // faces the court
      for (let row = 0; row < s.rows; row++) {
        const dist = row * ROW_D + ROW_D / 2;
        const y = BASE_H + row * ROW_H;
        const cx = s.origin.x + s.out.x * dist + s.along.x * s.length / 2;
        const cz = s.origin.z + s.out.z * dist + s.along.z * s.length / 2;
        const step = new THREE.Mesh(new THREE.BoxGeometry(s.length * Math.abs(s.along.x) + ROW_D * Math.abs(s.along.z), y, s.length * Math.abs(s.along.z) + ROW_D * Math.abs(s.along.x)), concrete);
        step.position.set(cx, y / 2, cz);
        step.receiveShadow = true;
        g.add(step);
        const seats = new THREE.Mesh(new THREE.BoxGeometry(s.length * Math.abs(s.along.x) + 0.3 * Math.abs(s.along.z), 0.08, s.length * Math.abs(s.along.z) + 0.3 * Math.abs(s.along.x)), seatMat);
        seats.position.set(cx - s.out.x * 0.1, y + 0.04, cz - s.out.z * 0.1);
        g.add(seats);
        const count = Math.floor(s.length / 0.72);
        for (let i = 0; i < count; i++) {
          const filled = r() < 0.9 - row * 0.015;
          const t = (i + 0.5) * (s.length / count);
          const x = s.origin.x + s.out.x * (dist - 0.05) + s.along.x * t;
          const z = s.origin.z + s.out.z * (dist - 0.05) + s.along.z * t;
          const scale = filled ? 0.9 + r() * 0.25 : 0.0001;
          this.m.compose(this.p.set(x, y + 0.42 * scale, z), this.q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), this.one.clone().setScalar(scale));
          body.setMatrixAt(n, this.m);
          base.push(this.m.clone());
          body.setColorAt(n, col.setHex(CROWD_COLORS[Math.floor(r() * CROWD_COLORS.length)]!).multiplyScalar(0.55 + r() * 0.45));
          head.setColorAt(n, col.setHex(SKIN[Math.floor(r() * SKIN.length)]!));
          phase[n] = r() * 20;
          n++;
        }
      }
    }
    body.castShadow = false;
    head.castShadow = false;
    g.add(body, head);
    return { body, head, base, phase };
  }

  private buildMasts(): void {
    const g = this.group;
    const pole = new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.6, roughness: 0.45 });
    const lamp = new THREE.MeshStandardMaterial({ map: lampTexture(), emissiveMap: lampTexture(), emissive: 0xffffff, emissiveIntensity: 2.2, color: 0xffffff });
    const glow = radialTexture([[0, 1], [0.25, 0.4], [1, 0]]);
    for (const [x, z] of [[-17, -40], [17, -40], [-17, 40], [17, 40]] as const) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.45, 26, 10), pole);
      m.position.set(x, 13, z);
      g.add(m);
      const head = new THREE.Group();
      head.position.set(x, 26.5, z);
      head.lookAt(0, 0, 0);
      for (let i = 0; i < 3; i++) {
        const l = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.7, 0.4), lamp);
        l.position.y = (i - 1) * 1.8;
        head.add(l);
      }
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xdbe7ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
      halo.scale.setScalar(16);
      halo.position.z = 1.5;
      head.add(halo);
      g.add(head);
    }
  }

  private buildChair(x: number, z: number): void {
    const g = this.group;
    const m = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.5, roughness: 0.5 });
    for (const [dx, dz] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]] as const) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.7, 8), m);
      leg.position.set(x + dx, 0.85, z + dz);
      leg.castShadow = true;
      g.add(leg);
    }
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.8), new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.7 }));
    seat.position.set(x, 1.7, z);
    seat.castShadow = true;
    g.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.8), seat.material);
    back.position.set(x - 0.42, 2.0, z);
    g.add(back);
  }

  /** Crowd sway and the umpire; `time` in seconds. */
  update(time: number): void {
    const dt = Math.min(0.1, time - this.last);
    this.last = time;
    this.umpire.update(dt);
    this.crowdClock += dt;
    if (!this.crowd || this.crowdClock < 1 / 15) return;
    this.crowdClock = 0;
    const { body, head, base, phase } = this.crowd;
    const lift = new THREE.Matrix4();
    for (let i = 0; i < base.length; i++) {
      const bob = Math.max(0, Math.sin(time * 1.6 + phase[i]!)) * 0.05;
      lift.makeTranslation(0, bob, 0);
      this.m.multiplyMatrices(lift, base[i]!);
      body.setMatrixAt(i, this.m);
      // head sits on the body, in the body's frame
      this.p.setFromMatrixPosition(this.m);
      const s = Math.hypot(this.m.elements[0]!, this.m.elements[1]!, this.m.elements[2]!);
      this.m.setPosition(this.p.x, this.p.y + 0.4 * s, this.p.z);
      head.setMatrixAt(i, this.m);
    }
    body.instanceMatrix.needsUpdate = true;
    head.instanceMatrix.needsUpdate = true;
  }
}
