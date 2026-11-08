/** Court surface (PBR, shader-painted anti-aliased lines at ITF dimensions) and the net with sag, tape, strap, posts. */
import * as THREE from 'three';
import { COURT } from '../core/court.ts';
import { courtTextures, netTexture, type Surface } from '../../common/textures.ts';

export const FLOOR_W = 22; // floor between the side walls (m)
export const FLOOR_L = 42; // floor between the end walls (m)
const W = COURT.doublesWidth;
const L = COURT.length;
const SH = COURT.singlesHalfWidth;

/** ITF lines as [minX, maxX, minZ, maxZ]; widths: baseline 10 cm, others 5 cm, all inside the court dimensions. */
export function courtLines(): [number, number, number, number][] {
  const b = 0.1;
  const w = 0.05;
  const hl = L / 2;
  const sl = COURT.serviceLine;
  return [
    [-W / 2, W / 2, -hl, -hl + b],
    [-W / 2, W / 2, hl - b, hl],
    [-W / 2, -W / 2 + w, -hl, hl],
    [W / 2 - w, W / 2, -hl, hl],
    [-SH, -SH + w, -hl, hl],
    [SH - w, SH, -hl, hl],
    [-SH, SH, -sl, -sl + w],
    [-SH, SH, sl - w, sl],
    [-w / 2, w / 2, -sl, sl],
    [-w / 2, w / 2, -hl + b, -hl + b + 0.1],
    [-w / 2, w / 2, hl - b - 0.1, hl - b],
  ];
}

export class Court {
  readonly group = new THREE.Group();
  private readonly floor: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshPhysicalMaterial>;
  surface: Surface = 'hart';

  constructor(surface: Surface) {
    const mat = new THREE.MeshPhysicalMaterial({ roughness: 1, metalness: 0, clearcoat: 0, normalScale: new THREE.Vector2(0.6, 0.6) });
    const lines = courtLines();
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uLines = { value: lines.map((l) => new THREE.Vector4(...l)) };
      sh.uniforms.uLineCol = { value: new THREE.Color(0xf5f5f0) };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vCourt;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCourt = (modelMatrix * vec4(transformed, 1.0)).xz;');
      sh.fragmentShader = sh.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
varying vec2 vCourt;
uniform vec4 uLines[${lines.length}];
uniform vec3 uLineCol;
float band(float x, float a, float b, float w) { return clamp((min(b, x + 0.5 * w) - max(a, x - 0.5 * w)) / w, 0.0, 1.0); }`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
vec2 fw = max(fwidth(vCourt) * 1.25, vec2(1e-4));
float lineCov = 0.0;
for (int i = 0; i < ${lines.length}; i++) {
  vec4 r = uLines[i];
  lineCov = max(lineCov, band(vCourt.x, r.x, r.y, fw.x) * band(vCourt.y, r.z, r.w, fw.y));
}
diffuseColor.rgb = mix(diffuseColor.rgb, uLineCol * (0.92 + 0.08 * diffuseColor.g), lineCov);`,
        )
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.55, lineCov);');
    };
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(FLOOR_W, FLOOR_L), mat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.receiveShadow = true;
    this.group.add(this.floor);
    this.setSurface(surface);
    this.buildNet();
  }

  setSurface(s: Surface): void {
    this.surface = s;
    const m = this.floor.material;
    m.map?.dispose();
    m.roughnessMap?.dispose();
    m.normalMap?.dispose();
    const t = courtTextures(s, FLOOR_W, FLOOR_L, W, L);
    m.map = t.map;
    m.roughnessMap = t.roughnessMap;
    m.normalMap = t.normalMap;
    // acrylic hard court: slight satin sheen; clay: fully matte
    m.clearcoat = s === 'hart' ? 0.12 : 0;
    m.clearcoatRoughness = 0.55;
    m.needsUpdate = true;
  }

  private buildNet(): void {
    const g = this.group;
    const postX = W / 2 + 0.914;
    const top = (x: number) => COURT.netHeight + (1.07 - COURT.netHeight) * (x / postX) ** 2;
    const geo = new THREE.PlaneGeometry(postX * 2, 1, 96, 8);
    const pos = geo.attributes.position!;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const v = pos.getY(i) + 0.5; // 0..1
      const y = v * (top(x) - 0.02);
      pos.setXYZ(i, x, y, Math.sin(v * Math.PI) * 0.03 * (1 - (x / postX) ** 2)); // slight belly
    }
    geo.computeVertexNormals();
    const nt = netTexture();
    nt.repeat.set((postX * 2) / (4 * 0.045), 1 / (4 * 0.045));
    const net = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ map: nt, transparent: true, side: THREE.DoubleSide, roughness: 0.9, depthWrite: false, alphaTest: 0.02 }),
    );
    net.renderOrder = 2;
    g.add(net);
    // headband (tape) along the sagging top
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 40; i++) {
      const x = -postX + (i / 40) * postX * 2;
      pts.push(new THREE.Vector3(x, top(x) - 0.03, 0));
    }
    const white = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
    const tape = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.032, 6), white);
    tape.scale.z = 0.35;
    tape.castShadow = true;
    g.add(tape);
    // bottom cord and centre strap
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, postX * 2, 6), new THREE.MeshStandardMaterial({ color: 0x1f2937 }));
    cord.rotation.z = Math.PI / 2;
    cord.position.y = 0.02;
    g.add(cord);
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.05, COURT.netHeight - 0.02, 0.012), white);
    strap.position.y = (COURT.netHeight - 0.02) / 2;
    strap.castShadow = true;
    g.add(strap);
    const anchor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.01, 0.06), new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.6, roughness: 0.4 }));
    anchor.position.y = 0.005;
    g.add(anchor);
    // posts with crank, dark green paint
    const paint = new THREE.MeshPhysicalMaterial({ color: 0x14352a, roughness: 0.35, metalness: 0.4, clearcoat: 0.6 });
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.042, 1.09, 16), paint);
      post.position.set(s * postX, 0.545, 0);
      post.castShadow = true;
      g.add(post);
      const capM = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint);
      capM.position.set(s * postX, 1.09, 0);
      g.add(capM);
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.06), paint);
      box.position.set(s * (postX + 0.05), 0.85, 0);
      g.add(box);
      const crank = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.9, roughness: 0.3 }));
      crank.rotation.z = Math.PI / 2;
      crank.position.set(s * (postX + 0.11), 0.85, 0);
      g.add(crank);
    }
  }
}
