/** Tennis racket model: oval graphite frame, string bed (alpha), throat, wrapped grip. Handle along -Y, face in XY. */
import * as THREE from 'three';
import { gripTexture, stringsTexture } from '../../common/textures.ts';

export const RACKET_HEAD_Y = -0.5; // centre of the string bed below the hand

let shared: { frame: THREE.Material; accent: THREE.Material; strings: THREE.Material; grip: THREE.Material; cap: THREE.Material } | null =
  null;

function materials() {
  if (shared) return shared;
  const grip = gripTexture();
  grip.repeat.set(1, 2);
  shared = {
    frame: new THREE.MeshPhysicalMaterial({ color: 0x1a1f2b, roughness: 0.35, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.15 }),
    accent: new THREE.MeshPhysicalMaterial({ color: 0xa3e635, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 }),
    strings: new THREE.MeshStandardMaterial({
      map: stringsTexture(),
      transparent: true,
      alphaTest: 0.05,
      side: THREE.DoubleSide,
      roughness: 0.6,
      depthWrite: false,
    }),
    grip: new THREE.MeshStandardMaterial({ map: grip, color: 0x2a2f3a, roughness: 0.85 }),
    cap: new THREE.MeshStandardMaterial({ color: 0x2aa5a1, roughness: 0.4, metalness: 0.3 }),
  };
  return shared;
}

export function makeRacket(): THREE.Group {
  const m = materials();
  const g = new THREE.Group();
  const rx = 0.125;
  const ry = 0.16;
  const cy = RACKET_HEAD_Y;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.sin(a) * rx, cy + Math.cos(a) * ry, 0));
  }
  const head = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 96, 0.0095, 8, true), m.frame);
  head.scale.z = 1.9;
  head.castShadow = true;
  g.add(head);
  // lime accent on the top of the hoop
  const accPts: THREE.Vector3[] = [];
  for (let i = -8; i <= 8; i++) {
    const a = (i / 64) * Math.PI * 2;
    accPts.push(new THREE.Vector3(Math.sin(a) * (rx + 0.001), cy + Math.cos(a) * (ry + 0.001), 0));
  }
  const acc = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(accPts), 24, 0.0099, 8), m.accent);
  acc.scale.z = 1.95;
  g.add(acc);
  // throat: two beams from the handle to the bottom of the hoop
  const throatTop = cy - ry * 0.92;
  for (const s of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.012, -0.13, 0),
      new THREE.Vector3(s * 0.035, -0.22, 0),
      new THREE.Vector3(s * Math.sin(0.45) * rx, throatTop + 0.02, 0),
    ]);
    const beam = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.009, 8), m.frame);
    beam.scale.z = 1.7;
    beam.castShadow = true;
    g.add(beam);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(2 * Math.sin(0.45) * rx, 0.012, 0.022), m.accent);
  bridge.position.y = throatTop + 0.012;
  g.add(bridge);
  const strings = new THREE.Mesh(new THREE.PlaneGeometry(rx * 2, ry * 2), m.strings);
  strings.position.y = cy;
  g.add(strings);
  // octagonal grip, butt cap
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.0165, 0.0155, 0.2, 8), m.grip);
  grip.position.y = -0.03;
  grip.castShadow = true;
  g.add(grip);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.017, 0.016, 8), m.cap);
  cap.position.y = 0.075;
  g.add(cap);
  return g;
}
