/** Court geometry in metres, three.js world frame: X right, Y up, Z towards the player (net at z = 0). */
export const COURT = {
  length: 23.77,
  doublesWidth: 10.97,
  singlesHalfWidth: 4.115,
  halfLength: 11.885,
  serviceLine: 6.4,
  netHeight: 0.914,
  ballRadius: 0.033,
} as const;

export type Who = 'player' | 'cpu';

export const other = (w: Who): Who => (w === 'player' ? 'cpu' : 'player');

/** Side of the court a z coordinate is on. The player is at +z. */
export const sideOf = (z: number): Who => (z >= 0 ? 'player' : 'cpu');

export function inSingles(x: number, z: number): boolean {
  const m = COURT.ballRadius; // ball touching the line is in
  return Math.abs(x) <= COURT.singlesHalfWidth + m && Math.abs(z) <= COURT.halfLength + m;
}

/** Service box of the receiver. deuce: server's right half seen from the server. */
export function inServiceBox(x: number, z: number, receiver: Who, deuce: boolean): boolean {
  const m = COURT.ballRadius;
  const depthOk = receiver === 'cpu' ? z <= m && z >= -COURT.serviceLine - m : z >= -m && z <= COURT.serviceLine + m;
  if (!depthOk || Math.abs(x) > COURT.singlesHalfWidth + m) return false;
  // player serves from +z (right = +x) cross-court into the cpu's box at -x for deuce; cpu mirrored.
  const wantNegX = receiver === 'cpu' ? deuce : !deuce;
  return wantNegX ? x <= m : x >= -m;
}
