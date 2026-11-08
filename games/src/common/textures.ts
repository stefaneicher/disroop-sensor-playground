/** Procedural canvas textures (no image assets): court acrylic/clay, net mesh, strings, ball felt, boards, sprites. */
import * as THREE from 'three';

export type Surface = 'hart' | 'sand';

/** Deterministic PRNG so the court looks the same on every start. */
export function rand(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

export function tex(c: HTMLCanvasElement, srgb = true, repeat = false): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Tileable value noise height field (0..1), `size` px, `cells` lattice cells per tile, fBm octaves. */
export function noiseField(size: number, cells: number, octaves: number, seed: number): Float32Array {
  const r = rand(seed);
  const out = new Float32Array(size * size);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const n = cells << o;
    const lat = new Float32Array(n * n).map(() => r());
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * n;
      const y0 = Math.floor(fy);
      const ty = fy - y0;
      const sy = ty * ty * (3 - 2 * ty);
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * n;
        const x0 = Math.floor(fx);
        const tx = fx - x0;
        const sx = tx * tx * (3 - 2 * tx);
        const a = lat[(y0 % n) * n + (x0 % n)]!;
        const b = lat[(y0 % n) * n + ((x0 + 1) % n)]!;
        const c = lat[((y0 + 1) % n) * n + (x0 % n)]!;
        const d = lat[((y0 + 1) % n) * n + ((x0 + 1) % n)]!;
        out[y * size + x]! += amp * (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy);
      }
    }
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i]! /= total;
  return out;
}

/** Tangent-space normal map from a tileable height field. */
export function normalMap(h: Float32Array, size: number, strength: number): THREE.CanvasTexture {
  const [c, g] = canvas(size, size);
  const img = g.createImageData(size, size);
  const at = (x: number, y: number) => h[((y + size) % size) * size + ((x + size) % size)]!;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const n = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      img.data[i] = ((-dx / n) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((dy / n) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / n) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return tex(c, false, true);
}

function grainCanvas(size: number, seed: number): HTMLCanvasElement {
  const [c, g] = canvas(size, size);
  const img = g.createImageData(size, size);
  const r = rand(seed);
  const h = noiseField(size, 16, 4, seed + 1);
  for (let i = 0; i < size * size; i++) {
    const v = 255 * (0.55 * h[i]! + 0.45 * r());
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

export interface CourtTextures {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
}

/**
 * Colour + roughness for the whole floor (`fw` × `fl` metres, court `cw` × `cl` centred), with wear around the
 * baselines, plus a tiled micro normal map (acrylic grain or clay granules).
 */
export function courtTextures(surface: Surface, fw: number, fl: number, cw: number, cl: number): CourtTextures {
  const PX = 1024;
  const PY = 2048;
  const sx = PX / fw;
  const sy = PY / fl;
  const toPx = (x: number, z: number): [number, number] => [(x + fw / 2) * sx, (z + fl / 2) * sy];
  const clay = surface === 'sand';
  const r = rand(clay ? 11 : 7);
  const [c, g] = canvas(PX, PY);
  const [rc, rg] = canvas(PX / 2, PY / 2);

  // base colours: US-Open-style blue court in a green surround, or terre battue
  g.fillStyle = clay ? '#a8502c' : '#3d6e4f';
  g.fillRect(0, 0, PX, PY);
  if (!clay) {
    const [x0, y0] = toPx(-cw / 2, -cl / 2);
    g.fillStyle = '#2c5a8c';
    g.fillRect(x0, y0, cw * sx, cl * sy);
  }
  rg.fillStyle = clay ? '#ebebeb' : '#a8a8a8'; // roughness (G channel)
  rg.fillRect(0, 0, PX / 2, PY / 2);

  const grain = g.createPattern(grainCanvas(256, 3), 'repeat')!;
  g.globalAlpha = clay ? 0.22 : 0.09;
  g.globalCompositeOperation = 'overlay';
  g.fillStyle = grain;
  g.fillRect(0, 0, PX, PY);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;

  // large-scale blotches (uneven paint / moisture)
  for (let i = 0; i < 260; i++) {
    const x = r() * PX;
    const y = r() * PY;
    const rad = 20 + r() * 120;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    const dark = r() < 0.5;
    const col = clay ? (dark ? '90,35,20' : '200,110,70') : dark ? '0,0,0' : '255,255,255';
    gr.addColorStop(0, `rgba(${col},${clay ? 0.09 : 0.04})`);
    gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }

  // wear where the players stand and slide (around the baselines, mostly near the centre)
  for (const side of [-1, 1]) {
    for (let i = 0; i < 80; i++) {
      const x = (r() - 0.5) * (r() < 0.7 ? 5 : 9);
      const z = side * (cl / 2 + (r() - 0.35) * 3.2);
      const [px, py] = toPx(x, z);
      const rad = (0.3 + r() * 1.1) * sx;
      const gr = g.createRadialGradient(px, py, 0, px, py, rad);
      const col = clay ? '214,140,98' : '165,190,205';
      gr.addColorStop(0, `rgba(${col},${clay ? 0.22 : 0.13})`);
      gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr;
      g.fillRect(px - rad, py - rad, rad * 2, rad * 2);
      const rr = rad / 2;
      const rgr = rg.createRadialGradient(px / 2, py / 2, 0, px / 2, py / 2, rr);
      rgr.addColorStop(0, clay ? 'rgba(255,255,255,0.3)' : 'rgba(100,100,100,0.4)');
      rgr.addColorStop(1, 'rgba(128,128,128,0)');
      rg.fillStyle = rgr;
      rg.fillRect(px / 2 - rr, py / 2 - rr, rr * 2, rr * 2);
    }
    g.lineCap = 'round';
    for (let i = 0; i < (clay ? 110 : 50); i++) {
      const x = (r() - 0.5) * 7;
      const z = side * (cl / 2 + (r() - 0.4) * 2.5);
      const [px, py] = toPx(x, z);
      const len = (0.3 + r() * (clay ? 1.6 : 0.7)) * sx;
      const a = (r() - 0.5) * 0.9;
      g.strokeStyle = clay ? `rgba(${r() < 0.5 ? '120,48,26' : '205,125,85'},0.35)` : `rgba(25,30,40,${0.06 + r() * 0.08})`;
      g.lineWidth = (clay ? 2 + r() * 5 : 1 + r() * 2.5) * (sx / 43);
      g.beginPath();
      g.moveTo(px, py);
      g.quadraticCurveTo(px + Math.cos(a) * len * 0.5, py + (r() - 0.5) * 12, px + Math.cos(a) * len, py + Math.sin(a) * len);
      g.stroke();
    }
  }
  if (clay) {
    for (let i = 0; i < 220; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? '255,180,140' : '80,30,15'},0.035)`;
      g.fillRect(r() * PX, 0, 2 + r() * 10, PY);
    }
  }

  const map = tex(c);
  const roughnessMap = tex(rc, false);
  const micro = noiseField(256, 32, 3, clay ? 21 : 5);
  const nm = normalMap(micro, 256, clay ? 10 : 4);
  nm.repeat.set(fw / 1.2, fl / 1.2);
  return { map, roughnessMap, normalMap: nm };
}

/** Square-mesh net (alpha), 4×4 cells per tile. */
export function netTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(128, 128);
  g.strokeStyle = 'rgba(20,24,28,1)';
  g.lineWidth = 3;
  for (let i = 0; i <= 4; i++) {
    g.beginPath();
    g.moveTo(i * 32, 0);
    g.lineTo(i * 32, 128);
    g.moveTo(0, i * 32);
    g.lineTo(128, i * 32);
    g.stroke();
  }
  return tex(c, true, true);
}

/** Racket strings: 16 mains × 19 crosses on a transparent ellipse, with a stencilled logo. */
export function stringsTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(256, 320);
  g.save();
  g.beginPath();
  g.ellipse(128, 160, 126, 158, 0, 0, Math.PI * 2);
  g.clip();
  g.strokeStyle = 'rgba(240,240,232,0.95)';
  g.lineWidth = 2.4;
  for (let i = 1; i <= 16; i++) {
    const x = (i / 17) * 256;
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 320);
    g.stroke();
  }
  for (let i = 1; i <= 19; i++) {
    const y = (i / 20) * 320;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(256, y);
    g.stroke();
  }
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(163,230,53,0.95)';
  g.font = 'bold 150px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('D', 128, 165);
  g.restore();
  return tex(c);
}

/** Optic-yellow felt with the curved white seam (equirectangular). */
export function ballTexture(): THREE.CanvasTexture {
  const W = 512;
  const H = 256;
  const [c, g] = canvas(W, H);
  const img = g.createImageData(W, H);
  const r = rand(9);
  const h = noiseField(256, 32, 3, 13);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = 0.8 + 0.2 * (0.6 * h[(y % 256) * 256 + (x % 256)]! + 0.4 * r());
      const i = (y * W + x) * 4;
      img.data[i] = 208 * n;
      img.data[i + 1] = 232 * n;
      img.data[i + 2] = 58 * n;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  g.strokeStyle = 'rgba(248,250,236,0.95)';
  g.lineWidth = 7;
  let prev: [number, number] | null = null;
  const a = 0.75;
  const b = 0.25;
  const cc = 2 * Math.sqrt(a * b);
  for (let i = 0; i <= 720; i++) {
    const t = (i / 720) * Math.PI * 2;
    const x = a * Math.cos(t) + b * Math.cos(3 * t);
    const z = a * Math.sin(t) - b * Math.sin(3 * t);
    const y = cc * Math.sin(2 * t);
    const n = Math.hypot(x, y, z);
    const u = (Math.atan2(z / n, x / n) / (Math.PI * 2) + 0.5) * W;
    const v = (0.5 - Math.asin(y / n) / Math.PI) * H;
    if (prev && Math.abs(prev[0] - u) < W / 2) {
      g.beginPath();
      g.moveTo(prev[0], prev[1]);
      g.lineTo(u, v);
      g.stroke();
    }
    prev = [u, v];
  }
  return tex(c);
}

/** Soft round sprite (white, alpha falloff) for glows, particles and contact shadows. */
export function radialTexture(stops: [number, number][] = [[0, 1], [1, 0]]): THREE.CanvasTexture {
  const [c, g] = canvas(128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [o, a] of stops) gr.addColorStop(o, `rgba(255,255,255,${a})`);
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return tex(c);
}

export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

/** LED/sponsor board in the Disroop look, 1024×128, tiles horizontally. */
export function drawBanner(c: HTMLCanvasElement, logo: HTMLImageElement | null, variant: number): void {
  const g = c.getContext('2d')!;
  const bg = g.createLinearGradient(0, 0, 0, 128);
  bg.addColorStop(0, '#172236');
  bg.addColorStop(1, '#0b1220');
  g.fillStyle = bg;
  g.fillRect(0, 0, 1024, 128);
  g.fillStyle = '#a3e635';
  g.fillRect(0, 120, 1024, 8);
  g.textBaseline = 'middle';
  for (let k = 0; k < 2; k++) {
    const x0 = k * 512;
    const alt = (variant + k) % 2 === 0;
    if (logo) g.drawImage(logo, x0 + 28, 22, 84, 84);
    g.font = 'bold 64px system-ui, "Segoe UI", sans-serif';
    g.fillStyle = '#f9fafb';
    const text = alt ? 'DISROOP' : 'THINGY:52';
    g.fillText(text, x0 + 128, 62);
    const w = g.measureText(text).width;
    g.font = '600 34px system-ui, "Segoe UI", sans-serif';
    g.fillStyle = alt ? '#a3e635' : '#2aa5a1';
    g.fillText(alt ? 'live' : 'Tennis', x0 + 142 + w, 68);
  }
}

/** Grip wrap: diagonal overlapping bands. */
export function gripTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(64, 256);
  g.fillStyle = '#e5e7eb';
  g.fillRect(0, 0, 64, 256);
  g.strokeStyle = '#9ca3af';
  g.lineWidth = 3;
  for (let y = -64; y < 320; y += 20) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(64, y + 40);
    g.stroke();
  }
  return tex(c, true, true);
}

/** Thingy:52 top face: rubber rim, label and a forward arrow. */
export function thingyTopTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#273140';
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#334155';
  g.beginPath();
  g.roundRect(16, 16, 224, 224, 36);
  g.fill();
  g.fillStyle = '#a3e635';
  g.beginPath();
  g.moveTo(128, 28);
  g.lineTo(160, 74);
  g.lineTo(96, 74);
  g.closePath();
  g.fill();
  g.textAlign = 'center';
  g.font = '600 20px system-ui, sans-serif';
  g.fillStyle = '#cbd5e1';
  g.fillText('vorne', 128, 100);
  g.font = 'bold 42px system-ui, sans-serif';
  g.fillStyle = '#f9fafb';
  g.fillText('THINGY', 128, 158);
  g.font = '600 28px system-ui, sans-serif';
  g.fillStyle = '#2aa5a1';
  g.fillText(':52', 128, 194);
  return tex(c);
}
