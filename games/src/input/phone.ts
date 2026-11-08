/**
 * Phone sensors → MotionFrame (same format as the Thingy, docs/protocol.md). Pure math, no DOM.
 *
 * Browser data (W3C DeviceOrientation / DeviceMotion), all in the phone's portrait frame:
 * - orientation alpha/beta/gamma (°): intrinsic Z-X'-Y'' rotation from earth (East, North, Up) to the phone.
 * - rotationRate alpha/beta/gamma (°/s) around the phone's Z / X / Y axes.
 * - accelerationIncludingGravity x/y/z (m/s²); lying flat, screen up: z ≈ +9.81.
 *
 * Games expect the Thingy frame: X right, Y forward, Z up, as seen by the player. With the phone held flat
 * (screen up) that frame is the phone frame turned by the screen angle (portrait 0°, landscape 90°/270°),
 * so the player's "right" is the right edge of what they see on screen.
 */
import { axisAngle, mul, normalize, type Quat, type Vec3 } from './quat.ts';
import type { MotionFrame } from './motion.ts';

const RAD = Math.PI / 180;
export const G = 9.80665;

export interface Orientation {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
}

/** Phone orientation as quaternion [w, x, y, z]: phone frame → earth frame (Z up). */
export function phoneQuat(o: Orientation): Quat {
  const qz = axisAngle([0, 0, 1], (o.alpha ?? 0) * RAD);
  const qx = axisAngle([1, 0, 0], (o.beta ?? 0) * RAD);
  const qy = axisAngle([0, 1, 0], (o.gamma ?? 0) * RAD);
  return normalize(mul(mul(qz, qx), qy));
}

/** Rotation from the player frame into the phone frame for a screen angle (0, 90, 180, 270). */
function screenTurn(screenAngle: number): Quat {
  return axisAngle([0, 0, 1], -screenAngle * RAD);
}

/** Orientation in the player frame (X right on screen, Y forward, Z up). */
export function playerQuat(o: Orientation, screenAngle: number): Quat {
  return normalize(mul(phoneQuat(o), screenTurn(screenAngle)));
}

/** A vector in the phone frame expressed in the player frame (rotate by +screenAngle around Z). */
export function toPlayer(v: Vec3, screenAngle: number): Vec3 {
  const a = screenAngle * RAD;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c * v[0] - s * v[1], s * v[0] + c * v[1], v[2]];
}

export interface PhoneSample {
  t: number; // Unix ms
  orientation: Orientation;
  rotationRate: Orientation | null; // °/s around Z (alpha), X (beta), Y (gamma)
  accel: { x: number | null; y: number | null; z: number | null } | null; // m/s², including gravity
  screenAngle: number;
  button: boolean;
}

const r3 = (v: number): number => Math.round(v * 1000) / 1000;

/** One MotionFrame from a phone sample. */
export function phoneFrame(s: PhoneSample): MotionFrame {
  const rr = s.rotationRate;
  const gyroPhone: Vec3 = [rr?.beta ?? 0, rr?.gamma ?? 0, rr?.alpha ?? 0];
  const a = s.accel;
  const accPhone: Vec3 = [(a?.x ?? 0) / G, (a?.y ?? 0) / G, (a?.z ?? G) / G];
  const q = playerQuat(s.orientation, s.screenAngle);
  return {
    t: Math.round(s.t),
    q: [r3(q[0]), r3(q[1]), r3(q[2]), r3(q[3])],
    gyro: toPlayer(gyroPhone, s.screenAngle).map(r3) as Vec3,
    accel: toPlayer(accPhone, s.screenAngle).map(r3) as Vec3,
    button: s.button,
  };
}
