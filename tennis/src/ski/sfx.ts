/** Synthesised sounds for the ski game: wind, cow bells, cheering, edge noise, gate ticks, crash (WebAudio, no files). */
export class SkiSfx {
  private ctx: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  private wind: { gain: GainNode; filter: BiquadFilterNode } | null = null;
  private edge: { gain: GainNode; filter: BiquadFilterNode } | null = null;
  private crowd: GainNode | null = null;
  private nextBell = 0;
  muted = false;

  unlock(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext;
    if (!AC) return;
    const c = new AC();
    this.ctx = c;
    const n = c.sampleRate * 2;
    this.noise = c.createBuffer(1, n, c.sampleRate);
    const d = this.noise.getChannelData(0);
    let seed = 7;
    for (let i = 0; i < n; i++) {
      seed = (seed * 16807) % 2147483647;
      d[i] = (seed / 2147483647) * 2 - 1;
    }
    this.wind = this.loop('lowpass', 400);
    this.edge = this.loop('bandpass', 2400);
    const crowdLoop = this.loop('bandpass', 900);
    this.crowd = crowdLoop.gain;
  }

  private loop(type: BiquadFilterType, freq: number): { gain: GainNode; filter: BiquadFilterNode } {
    const c = this.ctx!;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = type === 'bandpass' ? 0.7 : 0.4;
    const gain = c.createGain();
    gain.gain.value = 0;
    src.connect(filter).connect(gain).connect(c.destination);
    src.start();
    return { gain, filter };
  }

  /** Continuous sounds. speed m/s, carve 0..1 (edge hiss), crowd 0..1 (distance to spectators), air flight. */
  update(speed: number, carve: number, crowd: number, air: boolean): void {
    const c = this.ctx;
    if (!c || this.muted) return;
    const t = c.currentTime;
    const v = Math.min(1, speed / 42);
    this.wind?.gain.gain.setTargetAtTime(0.02 + 0.28 * v * v, t, 0.1);
    this.wind?.filter.frequency.setTargetAtTime(250 + 1600 * v, t, 0.1);
    this.edge?.gain.gain.setTargetAtTime(air ? 0 : 0.015 + 0.09 * Math.min(1, speed / 30) * (0.3 + 0.7 * carve), t, 0.08);
    this.edge?.filter.frequency.setTargetAtTime(1800 + 2200 * v, t, 0.1);
    this.crowd?.gain.setTargetAtTime(0.16 * crowd, t, 0.3);
    if (crowd > 0.05 && t > this.nextBell) {
      this.bell(0.05 + 0.1 * crowd);
      this.nextBell = t + 0.12 + Math.random() * (0.45 - 0.3 * crowd);
    }
  }

  /** One cow bell (two inharmonic partials). */
  bell(level: number): void {
    const c = this.ctx;
    if (!c || this.muted) return;
    const f = 520 + Math.random() * 560;
    const t = c.currentTime;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.45 + Math.random() * 0.3);
    g.connect(c.destination);
    for (const [mult, amp] of [[1, 1], [2.76, 0.5], [5.4, 0.2]] as const) {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * mult;
      const og = c.createGain();
      og.gain.value = amp;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + 0.8);
    }
  }

  /** Cheering swell with a few whoops. */
  cheer(strength = 1): void {
    const c = this.ctx;
    if (!c || this.muted || !this.noise) return;
    const t = c.currentTime;
    for (let i = 0; i < 4; i++) {
      const g = c.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.1 * strength, t + 0.25);
      g.gain.exponentialRampToValueAtTime(0.001, t + 2.4 + i * 0.3);
      const src = c.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 700 + 650 * i;
      f.Q.value = 0.9;
      src.connect(f).connect(g).connect(c.destination);
      src.start(0, Math.random());
      src.stop(t + 3.2);
    }
    for (let i = 0; i < 5; i++) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      const at = t + 0.1 + Math.random() * 1.2;
      const base = 300 + Math.random() * 250;
      o.frequency.setValueAtTime(base, at);
      o.frequency.exponentialRampToValueAtTime(base * 1.5, at + 0.35);
      const g = c.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.012 * strength, at + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0005, at + 0.5);
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1100;
      o.connect(f).connect(g).connect(c.destination);
      o.start(at);
      o.stop(at + 0.6);
    }
  }

  tone(freq: number, dur = 0.12, level = 0.12, type: OscillatorType = 'square'): void {
    const c = this.ctx;
    if (!c || this.muted) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  /** Start countdown beeps. */
  beep(final = false): void {
    this.tone(final ? 1320 : 880, final ? 0.45 : 0.15, 0.15, 'sine');
  }

  /** Two-tone warning for an impossible wrist rotation. */
  alarm(): void {
    this.tone(520, 0.14, 0.14, 'square');
    setTimeout(() => this.tone(390, 0.18, 0.14, 'square'), 150);
  }

  gate(ok: boolean): void {
    if (ok) this.tone(1500, 0.05, 0.05, 'triangle');
    else this.tone(180, 0.22, 0.12, 'sawtooth');
  }

  land(impact: number): void {
    this.thud(Math.min(1, impact / 14));
  }

  crash(): void {
    this.thud(1);
    this.tone(120, 0.5, 0.15, 'sawtooth');
  }

  private thud(level: number): void {
    const c = this.ctx;
    if (!c || this.muted || !this.noise) return;
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 500;
    const g = c.createGain();
    g.gain.setValueAtTime(0.4 * level, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    src.connect(f).connect(g).connect(c.destination);
    src.start(0, Math.random());
    src.stop(t + 0.4);
  }
}
