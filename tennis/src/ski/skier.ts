/** The racer: boots, skis, legs, torso, poles, helmet; pose follows tuck, lean and flight. */
import * as THREE from 'three';

const m = (hex: number, rough = 0.6): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ color: hex, roughness: rough });

export class SkierModel {
  readonly root = new THREE.Group();
  private readonly hips = new THREE.Group();
  private readonly torso = new THREE.Group();
  private readonly thighs: THREE.Group[] = [];
  private readonly shins: THREE.Group[] = [];
  private readonly arms: THREE.Group[] = [];
  private readonly skis: THREE.Mesh[] = [];
  private readonly head = new THREE.Group();

  constructor() {
    const suit = m(0xd62828, 0.5);
    const suit2 = m(0x111827, 0.5);
    const skin = m(0xe8b79a, 0.7);
    const helmet = m(0xfacc15, 0.35);
    const ski = m(0x1f2937, 0.35);
    const poleM = m(0xcfd6de, 0.4);

    this.root.add(this.hips);
    for (const x of [-0.11, 0.11]) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 1.75), ski);
      s.position.set(x, 0.03, -0.05);
      s.castShadow = true;
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.01, 0.9), m(0xfacc15, 0.4));
      top.position.set(0, 0.021, 0.1);
      s.add(top);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.25), ski);
      tip.position.set(0, 0.03, -0.95);
      tip.rotation.x = 0.35;
      s.add(tip);
      this.root.add(s);
      this.skis.push(s);
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.34), suit2);
      boot.position.set(x, 0.15, 0);
      this.root.add(boot);
      const shin = new THREE.Group();
      shin.position.set(x, 0.25, 0);
      const shinMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.3, 3, 6), suit);
      shinMesh.position.y = 0.21;
      shinMesh.castShadow = true;
      shin.add(shinMesh);
      this.root.add(shin);
      this.shins.push(shin);
      const thigh = new THREE.Group();
      const thighMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.3, 3, 6), suit);
      thighMesh.position.y = 0.21;
      thighMesh.castShadow = true;
      thigh.add(thighMesh);
      this.root.add(thigh);
      this.thighs.push(thigh);
    }
    const bodyMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.45, 4, 8), suit);
    bodyMesh.position.y = 0.33;
    bodyMesh.castShadow = true;
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.1, 10), m(0xffffff, 0.5));
    stripe.position.y = 0.4;
    this.torso.add(bodyMesh, stripe);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.12), suit2);
    back.position.set(0, 0.45, 0.17);
    this.torso.add(back);
    this.head.position.y = 0.72;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 10), helmet);
    skull.castShadow = true;
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), skin);
    face.position.set(0, -0.03, -0.07);
    const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.07, 0.06), m(0x0ea5e9, 0.15));
    goggles.position.set(0, 0.01, -0.125);
    this.head.add(skull, face, goggles);
    this.torso.add(this.head);
    for (const x of [-0.21, 0.21]) {
      const arm = new THREE.Group();
      arm.position.set(x, 0.58, 0);
      const up = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.42, 3, 6), suit);
      up.position.y = -0.22;
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.3, 5), poleM);
      stick.position.set(0, -0.5, 0.45);
      stick.rotation.x = -0.9;
      arm.add(up, stick);
      this.torso.add(arm);
      this.arms.push(arm);
    }
    this.hips.add(this.torso);
  }

  /** Applies the pose. tuck 0..1, lean -1..1 (right positive), air flight. */
  pose(tuck: number, lean: number, air: boolean, t: number): void {
    const f = air ? Math.max(0.6, tuck) : tuck;
    const L = 0.42;
    const a = 0.4 + 0.75 * f; // shin tilt forward
    const b = 0.35 + 0.9 * f; // thigh tilt back
    const kneeY = 0.25 + L * Math.cos(a);
    const kneeZ = -L * Math.sin(a);
    this.hips.position.set(0, kneeY + L * Math.cos(b), kneeZ + L * Math.sin(b));
    this.shins.forEach((sh) => sh.rotation.set(-a, 0, 0));
    this.thighs.forEach((th, i) => {
      th.position.set(i === 0 ? -0.11 : 0.11, kneeY, kneeZ);
      th.rotation.set(b, 0, 0);
    });
    const L2 = 0.25 + 0.95 * f;
    this.torso.rotation.set(-L2, 0, -lean * 0.2);
    this.head.rotation.x = 0.15 + 0.75 * f;
    const phi = 0.3 + 0.75 * f;
    for (const arm of this.arms) arm.rotation.x = phi + L2;
    this.root.rotation.z = -lean * 0.5;
    for (const sk of this.skis) sk.rotation.x = air ? -0.08 : 0;
    this.torso.rotation.y = Math.sin(t * 9) * 0.01 * (1 - f);
  }
}
