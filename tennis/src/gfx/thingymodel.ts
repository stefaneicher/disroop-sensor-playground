import * as THREE from 'three';
import type { Quat } from '../core/quat.ts';
import { makeRacket } from './racket.ts';
import { ROLL_LIMIT_DEG, WARN_RATIO, type LimitLevel } from '../core/limits.ts';

/** Thingy:52 als Modell (60 × 60 × 15 mm, 1 Einheit = 1 cm): Oberseite +Y, LED-Loch oben links, USB unten Mitte. */
export function thingyModel(): { group: THREE.Group; setLed(on: boolean): void } {
  const group = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.55 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.8 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(6, 1.5, 6), [rubber, rubber, body, body, rubber, rubber]);
  group.add(box);
  const led = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 1.2 });
  const ledHole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.06, 24), led);
  ledHole.position.set(-2.1, 0.77, -2.1);
  group.add(ledHole);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.5, 24), new THREE.MeshStandardMaterial({ color: 0x0b1120 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(-2.1, 0.78, -2.1);
  group.add(ring);
  const usb = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.1), new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.8, roughness: 0.3 }));
  usb.position.set(0, 0, 3.02);
  group.add(usb);
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.5), new THREE.MeshBasicMaterial({ color: 0x9ca3af }));
  logo.rotation.x = -Math.PI / 2;
  logo.position.set(0, 0.77, 0.6);
  group.add(logo);
  return {
    group,
    setLed(on) {
      const c = on ? 0x22c55e : 0xef4444;
      led.color.setHex(c);
      led.emissive.setHex(c);
    },
  };
}

/** Kleine eigenständige Szene für die Kalibrieransicht. */
export class ThingyPreview {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  private model = thingyModel();
  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(canvas.width, canvas.height, false);
    this.camera.position.set(0, 9, 11);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(4, 10, 6);
    this.scene.add(sun);
    // Thingy sitzt am Griff, der Schläger zeigt nach vorne (Kopf von der Hand weg).
    const racket = makeRacket();
    racket.scale.setScalar(10);
    racket.rotation.x = -Math.PI / 2;
    racket.position.set(0, 0, -3.5);
    this.model.group.rotation.x = 0;
    this.pose.add(this.model.group, racket);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(4.2, 24, 16), this.halo);
    this.pose.add(glow);
    this.scene.add(this.pose);
    this.addRollArc();
    this.camera.position.set(0, 4, 22);
    this.camera.lookAt(0, 0, -2);
  }
  private pose = new THREE.Group();
  private halo = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.25, side: THREE.DoubleSide });

  /** Bogen hinter dem Modell: grün = sinnvolle Neigung, gelb = Grenze nah, rot = Schulter/Körper machen das nicht mit. */
  private addRollArc(): void {
    const seg = (from: number, to: number, color: number) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(7.2, 8, 48, 1, Math.PI / 2 + (from * Math.PI) / 180, ((to - from) * Math.PI) / 180),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
      m.position.z = -4;
      this.scene.add(m);
    };
    const w = ROLL_LIMIT_DEG * WARN_RATIO;
    seg(-180, -ROLL_LIMIT_DEG, 0xef4444); seg(-ROLL_LIMIT_DEG, -w, 0xf59e0b); seg(-w, w, 0x22c55e);
    seg(w, ROLL_LIMIT_DEG, 0xf59e0b); seg(ROLL_LIMIT_DEG, 180, 0xef4444);
  }

  render(q: Quat | null, level: LimitLevel = 'ok'): void {
    this.model.setLed(!!q);
    this.halo.color.setHex(level === 'alarm' ? 0xef4444 : level === 'warn' ? 0xf59e0b : 0x22c55e);
    if (q) this.pose.quaternion.set(q[1], q[2], q[3], q[0]);
    this.renderer.render(this.scene, this.camera);
  }
}
