/** Synthesised sounds (WebAudio, no files): racket hit, bounce, net, crowd. */
export class Sfx {
  private ctx: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  muted = false;

  /** Must be called from a user gesture (browser autoplay policy). */
  unlock(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const n = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, n * 2, n);
    const d = this.noise.getChannelData(0);
    let seed = 1;
    for (let i = 0; i < d.length; i++) {
      seed = (seed * 16807) % 2147483647;
      d[i] = (seed / 2147483647) * 2 - 1;
    }
  }

  private env(gain: number, attack: number, decay: number, at = 0): GainNode | null {
    const c = this.ctx;
    if (!c || this.muted) return null;
    const g = c.createGain();
    const t = c.currentTime + at;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(c.destination);
    return g;
  }

  private tone(freq: number, gain: number, decay: number, type: OscillatorType = 'sine', endFreq = freq): void {
    const c = this.ctx;
    const g = this.env(gain, 0.003, decay);
    if (!c || !g) return;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(endFreq, c.currentTime + decay);
    o.connect(g);
    o.start();
    o.stop(c.currentTime + decay + 0.05);
  }

  private burst(gain: number, decay: number, filter: BiquadFilterType, freq: number, q = 1, attack = 0.002): void {
    const c = this.ctx;
    const g = this.env(gain, attack, decay);
    if (!c || !g || !this.noise) return;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = filter;
    f.frequency.value = freq;
    f.Q.value = q;
    src.connect(f).connect(g);
    src.start(0, Math.random());
    src.stop(c.currentTime + attack + decay + 0.05);
  }

  /** Racket hit; power 0..1 makes it brighter and louder. */
  hit(power: number): void {
    this.burst(0.5 + 0.4 * power, 0.07, 'bandpass', 1800 + 1400 * power, 3);
    this.tone(520 + 200 * power, 0.25, 0.06, 'triangle', 300);
  }

  bounce(): void {
    this.tone(170, 0.35, 0.09, 'sine', 90);
    this.burst(0.12, 0.04, 'lowpass', 900);
  }

  net(): void {
    this.burst(0.3, 0.18, 'lowpass', 500, 0.7);
  }

  /** Crowd reaction: applause swell (stronger for the player's points). */
  crowd(strength: number): void {
    for (let i = 0; i < 4; i++) {
      const c = this.ctx;
      const g = this.env(0.08 * strength, 0.15, 1.2 + 0.3 * i, i * 0.05);
      if (!c || !g || !this.noise) return;
      const src = c.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 900 + 700 * i;
      f.Q.value = 0.8;
      src.connect(f).connect(g);
      src.start(0, Math.random());
      src.stop(c.currentTime + 2);
    }
  }
}
