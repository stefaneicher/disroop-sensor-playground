/** 3D world of a downhill course: terrain ribbon along the centre line, trees, nets, gates, buildings, crowds, lifts, panorama, snowfall. */
import * as THREE from 'three';
import { canvas, radialTexture, rand, tex } from '../gfx/textures.ts';
import type { Prop, Track } from './track.ts';

export const FOG = 0xcfe0ee;
const NET_MARGIN = 1.5;
const OFFS = [1.5, 4, 9, 18, 32, 55, 90, 160, 300]; // distance outside the piste edge of the outer terrain columns

const SNOW = new THREE.Color(0xf4f8ff);
/** Fog end in metres; nothing beyond is drawn. */
const FOG_END = 2400;
/** Course length per instanced chunk (trees, posts, poles). */
const CHUNK = 160;
const OFFPISTE = new THREE.Color(0xe3ecf6);
const ROCK = new THREE.Color(0x7c7f86);

// ---- tiny helpers ------------------------------------------------------------

function hash2(a: number, b: number): number {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

function vnoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number): number {
  return vnoise(x, y) * 0.55 + vnoise(x * 2.1, y * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3) * 0.15;
}

/** Concatenates geometries into one with vertex colours. */
function mergeColoured(parts: [THREE.BufferGeometry, number][]): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  for (const [g0, hex] of parts) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    const c = new THREE.Color(hex);
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
      col.push(c.r, c.g, c.b);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return out;
}

const mat = (hex: number, rough = 0.85, extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0, ...extra });

function box(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y, z);
  b.castShadow = b.receiveShadow = true;
  return b;
}

function textCanvas(text: string, w: number, h: number, bg: string, fg: string, size: number): THREE.CanvasTexture {
  const [c, g] = canvas(w, h);
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  g.font = `800 ${size}px system-ui, Arial, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + size * 0.04);
  return tex(c);
}

interface Crowd {
  s: number;
  body: THREE.InstancedMesh;
  head: THREE.InstancedMesh;
  base: { x: number; y: number; z: number; ph: number; f: number; yaw: number }[];
  cheer: number;
  flagged: boolean;
}

interface LiftGroup {
  chairs: THREE.InstancedMesh;
  a: THREE.Vector3;
  b: THREE.Vector3;
  n: number;
}

interface TrainGroup {
  mesh: THREE.Group;
  from: THREE.Vector3;
  to: THREE.Vector3;
  phase: number;
  speed: number;
}

export class World {
  readonly scene = new THREE.Scene();
  readonly sun = new THREE.DirectionalLight(0xfff1d6, 2.6);
  readonly track: Track;
  private readonly crowds: Crowd[] = [];
  private readonly lifts: LiftGroup[] = [];
  private readonly trains: TrainGroup[] = [];
  private readonly panorama: THREE.Mesh;
  private readonly snow: THREE.Points;
  private readonly snowVel: Float32Array;
  readonly gateObjs: { pole: THREE.Mesh[]; flag: THREE.Mesh[] }[] = [];
  private clock = 0;
  private readonly dummy = new THREE.Object3D();
  private readonly culled: { obj: THREE.Object3D; c: THREE.Vector3; r: number }[] = [];

  constructor(track: Track) {
    this.track = track;
    const sc = this.scene;
    sc.background = new THREE.Color(FOG);
    sc.fog = new THREE.Fog(FOG, 120, FOG_END);
    sc.add(new THREE.HemisphereLight(0xbcd6ff, 0xf2f6fb, 1.5));
    this.sun.position.set(-60, 90, 40);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.05;
    Object.assign(this.sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 260 });
    sc.add(this.sun, this.sun.target);

    this.panorama = this.buildPanorama();
    sc.add(this.panorama);
    this.buildTerrain();
    this.buildTrees();
    this.buildNets();
    this.buildPoles();
    this.buildGates();
    track.def.sections.forEach((sec, k) => sec.props?.forEach((p, i) => this.buildProp(p, k, i)));
    this.buildStartFinish();
    [this.snow, this.snowVel] = this.buildSnowfall();
    sc.add(this.snow);
  }

  // ---- ground ----------------------------------------------------------------

  /** Lateral offsets of the terrain columns (left to right). */
  private columns(hw: number): number[] {
    const right = OFFS.map((o) => hw + o);
    return [...right.map((d) => -d).reverse(), -hw, -hw / 2, 0, hw / 2, hw, ...right];
  }

  /** Terrain height above the centre-line height at lateral offset d (0 on the piste). */
  private lift(s: number, d: number, hw: number): number {
    const o = Math.min(70, Math.max(0, Math.abs(d) - hw));
    if (o <= 0) return 0;
    const side = d < 0 ? -1 : 1;
    const sec = this.track.sectionAt(s);
    const tilt = 0.16 + 0.22 * hash2(sec, 7 + side);
    const wall = o * tilt + Math.min(o, 6) * 0.15;
    return Math.min(wall, 16) + (fbm(s * 0.03, d * 0.08) - 0.4) * Math.min(o, 40) * 0.55;
  }

  /** Clamp a lateral offset on the inside of a bend so the ribbon does not fold. */
  private clampInside(d: number, curv: number): number {
    if (Math.abs(curv) < 1e-4) return d;
    const lim = Math.max(0.7 / Math.abs(curv), 12);
    return Math.sign(d) === Math.sign(curv) && Math.abs(d) > lim ? Math.sign(d) * lim : d;
  }

  /** Surface point at (s, d) used for placing objects. */
  groundAt(s: number, d: number): THREE.Vector3 {
    const p = this.track.sampleAt(s);
    const hw = p.width / 2;
    const dd = this.clampInside(d, p.curv);
    return new THREE.Vector3(p.x + Math.cos(p.heading) * dd, p.y + this.lift(s, d, hw), p.z + Math.sin(p.heading) * dd);
  }

  private buildTerrain(): void {
    const tr = this.track;
    const n = tr.samples.length;
    const cols = 2 * OFFS.length + 5;
    const pos = new Float32Array(n * cols * 3);
    const col = new Float32Array(n * cols * 3);
    const uv = new Float32Array(n * cols * 2);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const p = tr.samples[i]!;
      const hw = p.width / 2;
      this.columns(hw).forEach((d, j) => {
        const dd = this.clampInside(d, p.curv);
        const k = i * cols + j;
        pos[k * 3] = p.x + Math.cos(p.heading) * dd;
        pos[k * 3 + 1] = p.y + this.lift(p.s, d, hw) - 0.02;
        pos[k * 3 + 2] = p.z + Math.sin(p.heading) * dd;
        const o = Math.max(0, Math.abs(d) - hw);
        if (o === 0) {
          c.copy(SNOW).multiplyScalar(0.96 + 0.04 * hash2(i, j));
          if (Math.abs(d) >= hw * 0.98) c.lerp(OFFPISTE, 0.5);
        } else {
          const rock = fbm(p.s * 0.045 + 9, d * 0.09) > 0.7 && o > 6 ? Math.min(1, (fbm(p.s * 0.045 + 9, d * 0.09) - 0.7) * 6) : 0;
          c.copy(OFFPISTE).multiplyScalar(0.92 + 0.12 * fbm(p.s * 0.1, d * 0.2)).lerp(ROCK, rock * 0.8);
        }
        col[k * 3] = c.r;
        col[k * 3 + 1] = c.g;
        col[k * 3 + 2] = c.b;
        uv[k * 2] = d / 9;
        uv[k * 2 + 1] = p.s / 9;
      });
    }
    const idx: number[] = [];
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < cols - 1; j++) {
        const a = i * cols + j;
        const b = a + 1;
        const cc = a + cols;
        const dd = cc + 1;
        idx.push(a, b, cc, b, dd, cc);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const [tc, tg] = canvas(256, 256);
    tg.fillStyle = '#fff';
    tg.fillRect(0, 0, 256, 256);
    const r = rand(5);
    for (let i = 0; i < 2600; i++) {
      const v = 215 + Math.floor(r() * 40);
      tg.fillStyle = `rgba(${v - 12},${v - 4},${v},${0.25 + r() * 0.35})`;
      tg.fillRect(r() * 256, r() * 256, 1 + r() * 2.2, 1 + r() * 2.2);
    }
    const map = tex(tc, true, true);
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, map, roughness: 0.92, metalness: 0 });
    const mesh = new THREE.Mesh(g, m);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  // ---- trees -----------------------------------------------------------------

  private buildTrees(): void {
    const tr = this.track;
    const trunk = new THREE.CylinderGeometry(0.22, 0.32, 3, 6).translate(0, 1.5, 0);
    const parts: [THREE.BufferGeometry, number][] = [[trunk, 0x4b3a2a]];
    const tiers: [number, number, number, number][] = [
      [3.2, 2.2, 3.6, 0x1f4d34],
      [5.3, 1.8, 3.2, 0x245a3b],
      [7.2, 1.35, 2.8, 0x2b6844],
      [8.8, 0.9, 2.4, 0x357a4f],
    ];
    for (const [y, r, h, hex] of tiers) parts.push([new THREE.ConeGeometry(r, h, 7).translate(0, y + h * 0.35, 0), hex]);
    parts.push([new THREE.ConeGeometry(0.55, 1.4, 6).translate(0, 10.5, 0), 0xe9f1f8]);
    const geo = mergeColoured(parts);
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
    const spots: { s: number; m: THREE.Matrix4 }[] = [];
    const r = rand(77);
    const q = new THREE.Quaternion();
    tr.def.sections.forEach((sec, k) => {
      const density = sec.trees ?? 0;
      if (density <= 0) return;
      const a = tr.starts[k]!;
      const count = Math.floor(sec.length * density * 0.9);
      for (let i = 0; i < count && spots.length < 14000; i++) {
        const s = a + r() * sec.length;
        const p = tr.sampleAt(s);
        const hw = p.width / 2;
        const side = r() < 0.5 ? -1 : 1;
        const o = 3.5 + Math.pow(r(), 1.5) * 60;
        const d = side * (hw + o);
        if (this.clampInside(d, p.curv) !== d) continue;
        const gp = this.groundAt(s, d);
        const sc = 0.7 + r() * 0.9;
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.28);
        spots.push({ s, m: new THREE.Matrix4().compose(gp.setY(gp.y - 0.3), q, new THREE.Vector3(sc, sc * (0.9 + r() * 0.5), sc)) });
      }
    });
    this.addChunked(geo, m, spots, true);
  }

  /**
   * Splits instances into short stretches of the course so that three.js can frustum-cull them (main and shadow pass)
   * and update() can drop chunks hidden in the fog. One InstancedMesh for the whole course was drawn in full every frame.
   */
  private addChunked(geo: THREE.BufferGeometry, material: THREE.Material, items: { s: number; m: THREE.Matrix4 }[], shadow: boolean): void {
    const buckets = new Map<number, THREE.Matrix4[]>();
    for (const it of items) {
      const k = Math.floor(it.s / CHUNK);
      let b = buckets.get(k);
      if (!b) buckets.set(k, (b = []));
      b.push(it.m);
    }
    for (const list of buckets.values()) {
      const mesh = new THREE.InstancedMesh(geo, material, list.length);
      list.forEach((mx, i) => mesh.setMatrixAt(i, mx));
      mesh.castShadow = shadow;
      this.cullable(mesh);
    }
  }

  /** Adds a static object with a world-space bounding sphere to frustum and fog-distance culling. */
  private cullable(obj: THREE.Mesh | THREE.InstancedMesh, pad = 0): void {
    if (obj instanceof THREE.InstancedMesh) obj.computeBoundingSphere();
    else obj.geometry.computeBoundingSphere();
    const bs = (obj instanceof THREE.InstancedMesh ? obj.boundingSphere : obj.geometry.boundingSphere)!;
    bs.radius += pad;
    obj.frustumCulled = true;
    this.culled.push({ obj, c: bs.center.clone(), r: bs.radius });
    this.scene.add(obj);
  }

  // ---- safety nets, edge poles ------------------------------------------------

  private buildNets(): void {
    const tr = this.track;
    const [oc, og] = canvas(64, 64);
    og.strokeStyle = '#fff';
    og.lineWidth = 3;
    for (let i = 0; i <= 64; i += 16) {
      og.beginPath();
      og.moveTo(i, 0);
      og.lineTo(i, 64);
      og.moveTo(0, i);
      og.lineTo(64, i);
      og.stroke();
    }
    const meshTex = tex(oc, true, true);
    const orange = new THREE.MeshStandardMaterial({ color: 0xff7a1a, map: meshTex, transparent: true, alphaTest: 0.2, side: THREE.DoubleSide, roughness: 0.8 });
    const blue = new THREE.MeshStandardMaterial({ color: 0x2f6fd0, map: meshTex, transparent: true, alphaTest: 0.2, side: THREE.DoubleSide, roughness: 0.8 });
    const post = mat(0x2d3a4a);
    const postGeo = new THREE.CylinderGeometry(0.07, 0.07, 1, 6).translate(0, 0.5, 0);
    for (const [kind, material, height] of [['fence', orange, 1.5], ['high', blue, 4.0]] as const) {
      const pos: number[] = [];
      const uvs: number[] = [];
      const idx: number[] = [];
      const posts: { s: number; m: THREE.Matrix4 }[] = [];
      tr.def.sections.forEach((sec, k) => {
        if (sec.nets !== kind) return;
        const s0 = tr.starts[k]!;
        const s1 = s0 + sec.length;
        for (const side of [-1, 1]) {
          const base = pos.length / 3;
          let rows = 0;
          for (let s = s0; s <= s1 + 0.01; s += 2) {
            const p = tr.sampleAt(Math.min(s, tr.length));
            const d = side * (p.width / 2 + NET_MARGIN);
            const x = p.x + Math.cos(p.heading) * d;
            const z = p.z + Math.sin(p.heading) * d;
            pos.push(x, p.y - 0.05, z, x, p.y + height, z);
            uvs.push(s / 1.4, 0, s / 1.4, height / 1.4);
            rows++;
            if (Math.round((s - s0) / 2) % 4 === 0) {
              const m4 = new THREE.Matrix4().compose(new THREE.Vector3(x, p.y - 0.05, z), new THREE.Quaternion(), new THREE.Vector3(1, height + 0.2, 1));
              posts.push({ s, m: m4 });
            }
          }
          for (let i = 0; i < rows - 1; i++) {
            const a = base + i * 2;
            idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
          }
        }
      });
      if (pos.length === 0) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      this.scene.add(new THREE.Mesh(g, material));
      this.addChunked(postGeo, post, posts, true);
    }
  }

  /** Bamboo edge markers where there are no nets, plus course-direction arrows. */
  private buildPoles(): void {
    const tr = this.track;
    const poles: { s: number; m: THREE.Matrix4 }[] = [];
    tr.def.sections.forEach((sec, k) => {
      if (sec.nets === 'fence' || sec.nets === 'high') return;
      for (let s = tr.starts[k]!; s < tr.starts[k]! + sec.length; s += 12) {
        const p = tr.sampleAt(s);
        for (const side of [-1, 1]) {
          const g = this.groundAt(s, side * (p.width / 2 + 0.6));
          poles.push({ s, m: new THREE.Matrix4().compose(g, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)) });
        }
      }
    });
    if (!poles.length) return;
    const geo = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 5).translate(0, 1.1, 0);
    this.addChunked(geo, mat(0x1b5fd0), poles, false);
  }

  // ---- gates -----------------------------------------------------------------

  private buildGates(): void {
    const poleGeo = new THREE.CylinderGeometry(0.035, 0.035, 2.3, 6).translate(0, 1.15, 0);
    const flagGeo = new THREE.PlaneGeometry(0.75, 0.55);
    const colours = { red: mat(0xe11d2e, 0.6, { side: THREE.DoubleSide }), blue: mat(0x1d4ed8, 0.6, { side: THREE.DoubleSide }) };
    const stick = { red: mat(0xff3b47, 0.5), blue: mat(0x3b82f6, 0.5) };
    for (const g of this.track.gates()) {
      const p = this.track.sampleAt(g.s);
      const pr: THREE.Mesh[] = [];
      const fl: THREE.Mesh[] = [];
      for (const side of [-1, 1]) {
        const d = g.offset + side * (g.width / 2);
        const gp = this.groundAt(g.s, d);
        const holder = new THREE.Group();
        holder.position.copy(gp);
        holder.rotation.y = -p.heading;
        const pole = new THREE.Mesh(poleGeo, stick[g.colour]);
        pole.castShadow = true;
        const flag = new THREE.Mesh(flagGeo, colours[g.colour]);
        flag.position.set(-side * 0.4, 1.9, 0);
        holder.add(pole, flag);
        this.scene.add(holder);
        pr.push(pole);
        fl.push(flag);
      }
      this.gateObjs.push({ pole: pr, flag: fl });
    }
  }

  // ---- props -----------------------------------------------------------------

  private place(secIdx: number, prop: Prop, off = 0): { g: THREE.Group; s: number; p: ReturnType<Track['sampleAt']> } {
    const tr = this.track;
    const sec = tr.def.sections[secIdx]!;
    const s = Math.min(tr.length - 2, tr.starts[secIdx]! + (prop.at ?? 0.5) * sec.length);
    const p = tr.sampleAt(s);
    const side = prop.side ?? 1;
    const d = side * (p.width / 2 + off);
    const gp = side === 0 ? new THREE.Vector3(p.x, p.y, p.z) : this.groundAt(s, d);
    const g = new THREE.Group();
    g.position.copy(gp);
    g.rotation.y = -p.heading;
    this.scene.add(g);
    return { g, s, p };
  }

  private buildProp(prop: Prop, secIdx: number, n: number): void {
    switch (prop.kind) {
      case 'stand':
        return this.buildStand(prop, secIdx, n);
      case 'house':
        return this.buildChalet(prop, secIdx, n);
      case 'wixi':
        return this.buildLift(prop, secIdx);
      case 'bridge':
        return this.buildBridge(prop, secIdx);
      case 'tunnel':
        return this.buildTunnel(prop, secIdx);
      case 'train':
        return this.buildTrain(prop, secIdx);
      case 'cliff':
        return this.buildCliff(prop, secIdx, n);
      default:
    }
  }

  private buildChalet(prop: Prop, secIdx: number, n: number): void {
    const { g, s } = this.place(secIdx, prop, 24 + n * 6);
    const r = rand(Math.floor(s * 13) + n);
    const w = 8 + r() * 5;
    const dp = 7 + r() * 3;
    const wood = mat(0x6b4426, 0.9);
    const body = box(w, 4.2, dp, wood, 0, 2.1, 0);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(w, dp) * 0.5, 2.6, 4), mat(0x4a3322, 0.9));
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(w / Math.hypot(w, dp) * 1.45, 1, dp / Math.hypot(w, dp) * 1.45);
    roof.position.y = 5.4;
    roof.castShadow = true;
    const snow = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(w, dp) * 0.5, 0.5, 4), mat(0xf5f9ff, 0.95));
    snow.rotation.y = Math.PI / 4;
    snow.scale.copy(roof.scale).multiplyScalar(1.02);
    snow.position.y = 6.5;
    const win = mat(0xffd98a, 0.4, { emissive: 0x553300, emissiveIntensity: 0.4 });
    for (const x of [-w * 0.25, w * 0.25]) g.add(box(1.1, 1.2, 0.1, win, x, 2.6, dp / 2 + 0.02));
    g.add(body, roof, snow);
    g.rotation.y += (r() - 0.5) * 0.8 + Math.PI;
  }

  private buildCliff(prop: Prop, secIdx: number, n: number): void {
    const { g, s } = this.place(secIdx, prop, 6 + n);
    const r = rand(Math.floor(s) + 3);
    const m = mat(0x80838a, 0.95, { flatShading: true });
    for (let i = 0; i < 9; i++) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(2 + r() * 3.5, 0), m);
      rock.position.set((r() - 0.5) * 22 * (prop.side ?? 1) + 4, r() * 4, (r() - 0.5) * 30);
      rock.scale.set(1, 0.8 + r() * 1.2, 1);
      rock.rotation.set(r() * 3, r() * 3, r() * 3);
      rock.castShadow = true;
      g.add(rock);
    }
  }

  /** Spectators behind the nets: instanced bodies and heads, animated; cheer when the skier passes. */
  private buildStand(prop: Prop, secIdx: number, n: number): void {
    const tr = this.track;
    const sec = tr.def.sections[secIdx]!;
    const s0 = tr.starts[secIdx]! + (prop.at ?? 0.5) * sec.length;
    const count = Math.min(520, Math.max(40, Math.round((prop.size ?? 40) * 3)));
    const r = rand(Math.floor(s0 * 7) + n * 31);
    const side = prop.side === 0 ? 1 : (prop.side ?? 1);
    const body = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.27, 0.8, 3, 6), new THREE.MeshStandardMaterial({ roughness: 0.8 }), count);
    const head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 8, 6), mat(0xe8b79a, 0.7), count);
    body.castShadow = true;
    const palette = [0xd62828, 0xf77f00, 0x1d4ed8, 0x15803d, 0xfacc15, 0xf1f5f9, 0x111827, 0x7c3aed, 0xe11d48];
    const base: Crowd['base'] = [];
    const span = Math.min(110, 20 + count * 0.5);
    for (let i = 0; i < count; i++) {
      const row = Math.floor(r() * 6);
      const s = s0 - span / 2 + r() * span;
      const p = tr.sampleAt(Math.max(0, Math.min(tr.length - 2, s)));
      const gp = this.groundAt(s, side * (p.width / 2 + NET_MARGIN + 2.2 + row * 0.9 + r() * 0.5));
      base.push({ x: gp.x, y: gp.y, z: gp.z, ph: r() * 6.28, f: 2.5 + r() * 3, yaw: -p.heading + (side < 0 ? -Math.PI / 2 : Math.PI / 2) + (r() - 0.5) * 0.6 });
      body.setColorAt(i, new THREE.Color(palette[Math.floor(r() * palette.length)]!));
    }
    const crowd: Crowd = { s: s0, body, head, base, cheer: 0, flagged: false };
    this.crowds.push(crowd);
    this.poseCrowd(crowd, 0);
    this.cullable(body, 1);
    this.cullable(head, 1);
    // flags and an advertising board along the net
    const flagPole = new THREE.CylinderGeometry(0.04, 0.04, 5, 5).translate(0, 2.5, 0);
    const swiss = this.track.def.id === 'lauberhorn';
    const flagTex = textCanvas(swiss ? '✚' : 'A', 96, 64, swiss ? '#d52b1e' : '#d62828', '#fff', swiss ? 52 : 44);
    for (let i = 0; i < 4; i++) {
      const s = s0 - span / 2 + (i + 0.5) * (span / 4);
      const p = tr.sampleAt(Math.max(0, Math.min(tr.length - 2, s)));
      const gp = this.groundAt(s, side * (p.width / 2 + NET_MARGIN + 2.4));
      const pole = new THREE.Mesh(flagPole, mat(0xdddddd));
      pole.position.copy(gp);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.2), new THREE.MeshBasicMaterial({ map: flagTex, side: THREE.DoubleSide }));
      flag.position.set(gp.x, gp.y + 4.3, gp.z);
      flag.rotation.y = -p.heading;
      this.scene.add(pole, flag);
    }
  }

  private poseCrowd(c: Crowd, t: number): void {
    const d = this.dummy;
    c.base.forEach((b, i) => {
      const hop = Math.abs(Math.sin(t * b.f + b.ph)) * (0.06 + c.cheer * 0.45);
      d.position.set(b.x, b.y + 0.95 + hop, b.z);
      d.rotation.set(0, b.yaw, 0);
      d.scale.set(1, 1, 1);
      d.updateMatrix();
      c.body.setMatrixAt(i, d.matrix);
      d.position.y = b.y + 1.78 + hop;
      d.updateMatrix();
      c.head.setMatrixAt(i, d.matrix);
    });
    c.body.instanceMatrix.needsUpdate = true;
    c.head.instanceMatrix.needsUpdate = true;
  }

  /** Chair lift (the Wixi at the Lauberhorn start): pylons, cable and moving chairs beside the piste. */
  private buildLift(prop: Prop, secIdx: number): void {
    const tr = this.track;
    const sec = tr.def.sections[secIdx]!;
    const s0 = tr.starts[secIdx]! + (prop.at ?? 0.5) * sec.length;
    const side = prop.side === 0 ? -1 : (prop.side ?? -1);
    const pylonGeo = new THREE.CylinderGeometry(0.22, 0.34, 1, 8).translate(0, 0.5, 0);
    const steel = mat(0x8b95a1, 0.5);
    const top: THREE.Vector3[] = [];
    const len = 180;
    const count = 5;
    for (let i = 0; i < count; i++) {
      const s = Math.max(0, Math.min(tr.length - 2, s0 - len / 2 + (i * len) / (count - 1)));
      const gp = this.groundAt(s, side * (tr.sampleAt(s).width / 2 + 24));
      const h = 11;
      const pylon = new THREE.Mesh(pylonGeo, steel);
      pylon.scale.y = h;
      pylon.position.copy(gp);
      pylon.castShadow = true;
      const arm = box(5.2, 0.35, 0.5, steel, gp.x, gp.y + h, gp.z);
      const p = tr.sampleAt(s);
      arm.rotation.y = -p.heading + Math.PI / 2;
      arm.rotation.y = -p.heading;
      this.scene.add(pylon, arm);
      top.push(new THREE.Vector3(gp.x, gp.y + h - 0.3, gp.z));
    }
    const cable = new THREE.BufferGeometry().setFromPoints(top);
    const line = new THREE.Line(cable, new THREE.LineBasicMaterial({ color: 0x111111 }));
    this.scene.add(line);
    // chairs travel along the polyline from low to high end (uphill) in a loop
    const first = top[0]!;
    const last = top[top.length - 1]!;
    const chairs = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 0.9, 0.7), mat(0xe63946, 0.6), 14);
    chairs.frustumCulled = false;
    this.scene.add(chairs);
    this.lifts.push({ chairs, a: last, b: first, n: 14 });
  }

  private buildBridge(prop: Prop, secIdx: number): void {
    const { g, p } = this.place(secIdx, { ...prop, side: 0 });
    const hw = p.width / 2 + 3;
    const conc = mat(0x9aa0a8, 0.85);
    const deck = box(hw * 2 + 6, 0.8, 6, conc, 0, 7, 0);
    const l = box(2, 8, 6, conc, -hw - 2, 3.5, 0);
    const r = box(2, 8, 6, conc, hw + 2, 3.5, 0);
    const rail = mat(0x3b4350);
    g.add(deck, l, r, box(hw * 2 + 6, 1, 0.15, rail, 0, 7.9, 2.9), box(hw * 2 + 6, 1, 0.15, rail, 0, 7.9, -2.9));
    // padded edges at the piste side
    g.add(box(0.5, 4, 6.2, mat(0xff8a1a), -hw + 0.5, 2, 0), box(0.5, 4, 6.2, mat(0xff8a1a), hw - 0.5, 2, 0));
  }

  private buildTunnel(prop: Prop, secIdx: number): void {
    const { g, p } = this.place(secIdx, { ...prop, side: 0 });
    const hw = p.width / 2 + 0.5;
    const conc = mat(0xb0b4ba, 0.9);
    const len = 14;
    g.add(box(1.4, 6, len, conc, -hw - 0.7, 3, 0), box(1.4, 6, len, conc, hw + 0.7, 3, 0), box(hw * 2 + 4, 1.2, len, conc, 0, 6.6, 0));
    g.add(box(0.5, 3.5, len + 0.2, mat(0xff8a1a), -hw + 0.3, 1.75, 0), box(0.5, 3.5, len + 0.2, mat(0xff8a1a), hw - 0.3, 1.75, 0));
    // embankment on both sides so that the line fits into the hill
    for (const sd of [-1, 1]) g.add(box(30, 9, len + 8, mat(0xdfe8f2, 0.95), sd * (hw + 16.4), 3.5, 0));
    // rails on top
    g.add(box(0.12, 0.14, len + 30, mat(0x555a62), 0, 7.35, -0.7), box(0.12, 0.14, len + 30, mat(0x555a62), 0, 7.35, 0.7));
  }

  private trainCars(): THREE.Group {
    const gr = new THREE.Group();
    const red = mat(0xc8102e, 0.5);
    const cream = mat(0xf0e6d0, 0.6);
    for (let i = 0; i < 2; i++) {
      const car = new THREE.Group();
      car.add(box(2.7, 1.6, 12, red, 0, 1.3, 0), box(2.72, 0.8, 11.6, cream, 0, 2.5, 0), box(2.8, 0.15, 12.2, mat(0x333840), 0, 3.0, 0));
      car.position.z = i * 12.6;
      gr.add(car);
    }
    return gr;
  }

  /** Wengernalpbahn (red cog train) that crosses above the tunnel or runs along the piste. */
  private buildTrain(prop: Prop, secIdx: number): void {
    const { g, p } = this.place(secIdx, prop, prop.side === 0 ? 0 : 34);
    const m = this.trainCars();
    const across = prop.side === 0;
    const half = 60;
    const from = new THREE.Vector3(across ? 0 : 0, across ? 7.55 : 0, -half);
    const to = new THREE.Vector3(0, across ? 7.55 : 0, half);
    const holder = new THREE.Group();
    holder.add(m);
    if (across) holder.rotation.y = Math.PI / 2;
    g.add(holder);
    if (!across) g.add(box(0.15, 0.2, 140, mat(0x555a62), -0.7, 0.1, 0), box(0.15, 0.2, 140, mat(0x555a62), 0.7, 0.1, 0));
    this.trains.push({ mesh: holder, from, to, phase: (secIdx * 0.37) % 1, speed: 0.012 });
    void p;
  }

  private buildStartFinish(): void {
    const tr = this.track;
    const def = tr.def;
    // start house
    const startSec = 0;
    const sp = tr.sampleAt(4);
    const startG = new THREE.Group();
    startG.position.set(sp.x, sp.y, sp.z);
    startG.rotation.y = -sp.heading;
    const wood = mat(0x7a4a2a, 0.9);
    const hw = sp.width / 2;
    startG.add(box(0.5, 3.6, 0.5, wood, -3.2, 1.8, 0), box(0.5, 3.6, 0.5, wood, 3.2, 1.8, 0), box(6.9, 0.5, 0.6, wood, 0, 3.7, 0));
    const startBanner = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.1), new THREE.MeshBasicMaterial({ map: textCanvas('START', 512, 88, '#c8102e', '#fff', 62), side: THREE.DoubleSide }));
    startBanner.position.set(0, 3.7, 0.35);
    startG.add(startBanner);
    startG.add(box(0.2, 0.9, 5.2, mat(0x222831), 0, 0.45, 0.0).translateZ(0));
    const hut = new THREE.Group();
    hut.add(box(8, 4, 6, wood, 0, 2, 0), box(8.6, 0.4, 6.6, mat(0xf2f6fb, 0.95), 0, 4.2, 0));
    hut.position.set(-(hw + 6), 0, 2);
    startG.add(hut);
    this.scene.add(startG);
    void startSec;

    // finish arch, stands and timing board
    const fp = tr.sampleAt(tr.finish);
    const fg = new THREE.Group();
    fg.position.set(fp.x, fp.y, fp.z);
    fg.rotation.y = -fp.heading;
    const fhw = fp.width / 2 + 1;
    const steel = mat(0xe9edf2, 0.5);
    fg.add(box(0.8, 7.5, 0.8, steel, -fhw, 3.75, 0), box(0.8, 7.5, 0.8, steel, fhw, 3.75, 0), box(fhw * 2 + 1.6, 1.6, 0.7, mat(0x111827), 0, 7.6, 0));
    const ziel = new THREE.Mesh(new THREE.PlaneGeometry(fhw * 2 + 1.4, 1.5), new THREE.MeshBasicMaterial({ map: textCanvas(`ZIEL · ${def.title.toUpperCase()}`, 1024, 90, '#111827', '#a3e635', 58), side: THREE.DoubleSide }));
    ziel.position.set(0, 7.6, 0.36);
    fg.add(ziel);
    const check = new THREE.Mesh(new THREE.PlaneGeometry(fhw * 2, 0.9), new THREE.MeshBasicMaterial({ map: this.checkerTexture(), transparent: true }));
    check.rotation.x = -Math.PI / 2;
    check.position.y = 0.06;
    fg.add(check);
    this.scene.add(fg);

    // finish stadium: crowds on both sides
    for (const side of [-1, 1] as const) {
      const prop: Prop = { kind: 'stand', at: 0, side, size: def.id === 'streif' ? 180 : 140 };
      const sec = tr.def.sections.length - 1;
      const sBase = tr.finish - 30;
      const s0 = tr.starts[sec]!;
      this.buildStand({ ...prop, at: Math.max(0, (sBase - s0) / tr.def.sections[sec]!.length) }, sec, 99 + side);
    }
    const ps = tr.finish - 30;
    this.crowds[this.crowds.length - 1]!.s = ps;
    this.crowds[this.crowds.length - 2]!.s = ps;
    // advertising boards along the finish area
    for (const side of [-1, 1]) {
      const bd = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.1, 60), mat(0x1a73e8));
      const g = this.groundAt(tr.finish - 20, side * (fp.width / 2 + 1.2));
      bd.position.set(g.x, g.y + 0.55, g.z);
      bd.rotation.y = -fp.heading;
      this.scene.add(bd);
    }
  }

  private checkerTexture(): THREE.CanvasTexture {
    const [c, g] = canvas(256, 64);
    for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) {
      g.fillStyle = (x + y) % 2 ? '#111' : '#fff';
      g.fillRect(x * 16, y * 16, 16, 16);
    }
    return tex(c);
  }

  // ---- sky -------------------------------------------------------------------

  private buildPanorama(): THREE.Mesh {
    const W = 4096;
    const H = 1024;
    const [c, g] = canvas(W, H);
    const horizon = H * 0.62;
    const sky = g.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#3b78c4');
    sky.addColorStop(0.55, '#8fbbe6');
    sky.addColorStop(1, '#dbe9f4');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#dfe9f3';
    g.fillRect(0, horizon, W, H - horizon);
    const r = rand(this.track.def.id === 'streif' ? 11 : 4);
    // a few clouds
    for (let i = 0; i < 26; i++) {
      const x = r() * W;
      const y = H * 0.1 + r() * H * 0.3;
      for (let k = 0; k < 7; k++) {
        const rg = g.createRadialGradient(x + k * 40, y, 0, x + k * 40, y, 60 + r() * 60);
        rg.addColorStop(0, 'rgba(255,255,255,.55)');
        rg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = rg;
        g.fillRect(x + k * 40 - 130, y - 130, 260, 260);
      }
    }
    const ridge = (base: number, amp: number, seed: number, colour: string, snowLine: number): void => {
      const rr = rand(seed);
      const pts: number[] = [];
      for (let x = 0; x <= W; x += 8) pts.push(base - amp * (vnoise(x / 190 + seed, seed) * 0.75 + vnoise(x / 60 + seed, 3) * 0.25) - amp * 0.3 * Math.abs(Math.sin(x / 520 + seed)));
      g.beginPath();
      g.moveTo(0, H);
      pts.forEach((y, i) => g.lineTo(i * 8, y));
      g.lineTo(W, H);
      g.closePath();
      g.fillStyle = colour;
      g.fill();
      g.save();
      g.clip();
      g.fillStyle = 'rgba(255,255,255,.92)';
      pts.forEach((y, i) => {
        if (y < snowLine) g.fillRect(i * 8, y, 8, Math.min(60, (snowLine - y) * 1.4 + rr() * 6));
      });
      g.restore();
    };
    const peak = (cx: number, w: number, top: number, left: string, right: string, snow: number): void => {
      g.beginPath();
      g.moveTo(cx - w, horizon + 10);
      g.lineTo(cx - w * 0.55, top + (horizon - top) * 0.45);
      g.lineTo(cx - w * 0.12, top + 8);
      g.lineTo(cx, top);
      g.lineTo(cx + w * 0.18, top + 18);
      g.lineTo(cx + w * 0.6, top + (horizon - top) * 0.5);
      g.lineTo(cx + w, horizon + 10);
      g.closePath();
      const gr = g.createLinearGradient(cx - w, 0, cx + w, 0);
      gr.addColorStop(0, left);
      gr.addColorStop(0.5, right);
      gr.addColorStop(1, left);
      g.fillStyle = gr;
      g.fill();
      g.save();
      g.clip();
      g.fillStyle = 'rgba(250,252,255,.95)';
      g.fillRect(cx - w, top - 2, w * 2, snow);
      g.fillStyle = 'rgba(255,255,255,.8)';
      for (let i = 0; i < 14; i++) g.fillRect(cx - w * 0.6 + r() * w * 1.2, top + snow * 0.6 + r() * 120, 6 + r() * 12, 40 + r() * 90);
      g.restore();
    };
    if (this.track.def.skyline === 'bernese') {
      ridge(horizon + 40, 150, 3, '#8aa3bf', 9999);
      ridge(horizon + 18, 120, 8, '#6f8aa8', horizon - 70);
      const x0 = W * 0.22;
      peak(x0 - 600, 360, horizon - 330, '#8a8f9a', '#5d6470', 140); // Silberhorn / Tschuggen
      peak(x0, 330, horizon - 390, '#45495a', '#2b2f3c', 60); // Eiger (dark north face)
      peak(x0 + 520, 300, horizon - 410, '#9cb0c8', '#d8e4f0', 230); // Mönch
      peak(x0 + 1050, 420, horizon - 440, '#a8bad0', '#e6eff8', 260); // Jungfrau
      ridge(horizon + 55, 110, 21, '#8fa3a8', horizon + 10);
    } else {
      ridge(horizon + 40, 160, 5, '#9aa9bb', 9999);
      // Wilder Kaiser: jagged pale limestone wall
      const x0 = W * 0.3;
      g.beginPath();
      g.moveTo(x0 - 1200, horizon + 15);
      let y = horizon - 150;
      for (let x = x0 - 1200; x <= x0 + 1200; x += 24) {
        y = horizon - 140 - 220 * Math.max(0, 1 - Math.abs(x - x0) / 1200) - r() * 90 - Math.abs(Math.sin(x / 70)) * 50;
        g.lineTo(x, y);
      }
      g.lineTo(x0 + 1200, horizon + 15);
      g.closePath();
      const lg = g.createLinearGradient(0, horizon - 450, 0, horizon);
      lg.addColorStop(0, '#f2f5f8');
      lg.addColorStop(0.5, '#b3bac4');
      lg.addColorStop(1, '#7e8794');
      g.fillStyle = lg;
      g.fill();
      ridge(horizon + 38, 90, 17, '#8a9ea4', horizon + 6);
    }
    const haze = g.createLinearGradient(0, horizon - 90, 0, horizon + 40);
    haze.addColorStop(0, 'rgba(223,233,243,0)');
    haze.addColorStop(0.7, 'rgba(223,233,243,.75)');
    haze.addColorStop(1, 'rgba(223,233,243,1)');
    g.fillStyle = haze;
    g.fillRect(0, horizon - 90, W, 130);
    const geo = new THREE.CylinderGeometry(5200, 5200, 2600, 48, 1, true);
    const m = new THREE.MeshBasicMaterial({ map: tex(c), side: THREE.BackSide, fog: false, depthWrite: false });
    const mesh = new THREE.Mesh(geo, m);
    mesh.renderOrder = -10;
    mesh.frustumCulled = false;
    // horizon (62 %) sits at the camera height
    mesh.userData.offset = 2600 * (0.5 - 0.62);
    return mesh;
  }

  private buildSnowfall(): [THREE.Points, Float32Array] {
    const n = 2200;
    const pos = new Float32Array(n * 3);
    const vel = new Float32Array(n * 3);
    const r = rand(3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (r() - 0.5) * 120;
      pos[i * 3 + 1] = r() * 50;
      pos[i * 3 + 2] = (r() - 0.5) * 120;
      vel[i * 3] = (r() - 0.5) * 1.2;
      vel[i * 3 + 1] = -(1.2 + r() * 1.8);
      vel[i * 3 + 2] = (r() - 0.5) * 1.2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ map: radialTexture([[0, 1], [1, 0]]), size: 0.28, transparent: true, opacity: 0.8, depthWrite: false, color: 0xffffff });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    return [pts, vel];
  }

  // ---- per frame ---------------------------------------------------------------

  /** Moves sky, sun shadow, snowfall, lifts, trains and crowds. `focus` is the skier (world), `sSkier` its distance along the course. */
  update(dt: number, focus: THREE.Vector3, camera: THREE.Camera, sSkier: number): { cheer: number; crowdNear: number } {
    this.clock += dt;
    this.panorama.position.set(camera.position.x, camera.position.y + (this.panorama.userData.offset as number), camera.position.z);
    this.sun.position.set(focus.x - 55, focus.y + 85, focus.z + 35);
    this.sun.target.position.copy(focus);
    // snow
    const p = this.snow.geometry.getAttribute('position') as THREE.BufferAttribute;
    const a = p.array as Float32Array;
    const cx = camera.position.x;
    const cy = camera.position.y;
    const cz = camera.position.z;
    for (let i = 0; i < a.length; i += 3) {
      a[i] = a[i]! + this.snowVel[i]! * dt;
      a[i + 1] = a[i + 1]! + this.snowVel[i + 1]! * dt;
      a[i + 2] = a[i + 2]! + this.snowVel[i + 2]! * dt;
      if (a[i + 1]! < cy - 20) a[i + 1] = cy + 30;
      a[i] = cx + wrap(a[i]! - cx, 60);
      a[i + 2] = cz + wrap(a[i + 2]! - cz, 60);
    }
    p.needsUpdate = true;
    // lifts
    const d = this.dummy;
    for (const l of this.lifts) {
      for (let i = 0; i < l.n; i++) {
        const t = (i / l.n + this.clock * 0.02) % 1;
        const up = t < 0.5;
        const u = up ? t * 2 : (t - 0.5) * 2;
        d.position.lerpVectors(up ? l.b : l.a, up ? l.a : l.b, u);
        d.position.y -= 1.6;
        d.position.x += up ? 1.4 : -1.4;
        d.rotation.set(0, 0, 0);
        d.updateMatrix();
        l.chairs.setMatrixAt(i, d.matrix);
      }
      l.chairs.instanceMatrix.needsUpdate = true;
    }
    for (const t of this.trains) {
      const k = (t.phase + this.clock * t.speed) % 1;
      t.mesh.position.lerpVectors(t.from, t.to, k);
    }
    // drop chunks beyond the fog (frustum culling alone keeps everything straight ahead)
    const cp = camera.position;
    for (const o of this.culled) o.obj.visible = o.c.distanceTo(cp) - o.r < FOG_END;
    // crowds
    let cheer = 0;
    let near = 0;
    for (const c of this.crowds) {
      const dist = Math.abs(c.s - sSkier);
      if (dist < 40 && !c.flagged && sSkier > c.s - 40) {
        c.flagged = true;
        c.cheer = 1;
        cheer = Math.max(cheer, 1);
      }
      if (c.cheer > 0) c.cheer = Math.max(0, c.cheer - dt * 0.22);
      if (dist < 220 && c.body.visible) {
        this.poseCrowd(c, this.clock);
        near = Math.max(near, 1 - dist / 220);
      }
    }
    return { cheer, crowdNear: near };
  }

  resetCrowds(): void {
    for (const c of this.crowds) {
      c.flagged = false;
      c.cheer = 0;
    }
  }

  /** Test/smoke hook: make every spectator cheer. */
  cheerAll(): void {
    for (const c of this.crowds) c.cheer = 1;
  }
}

function wrap(v: number, half: number): number {
  const s = half * 2;
  return ((((v + half) % s) + s) % s) - half;
}
