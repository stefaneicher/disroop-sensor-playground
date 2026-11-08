/** Movement-limit alarm (red vignette + tone) and the live calibration/test panel, shared by tennis and ski. */
import type { MotionController } from './core/controller.ts';
import { AlarmGate, checkLimits, ROLL_LIMIT_DEG, type LimitState } from './core/limits.ts';

const AXIS_TEXT = { roll: 'Handgelenk zu stark gedreht', pitch: 'Nase zu weit hoch/runter', total: 'Drehung ausserhalb des Möglichen' };

export class LimitMonitor {
  private readonly gate = new AlarmGate();
  private readonly vignette = document.createElement('div');
  private readonly panel = document.createElement('div');
  private readonly rows: Record<'roll' | 'pitch' | 'angle' | 'g', HTMLElement> = {} as never;
  private readonly dial = document.createElement('div');
  private readonly status = document.createElement('p');
  state: LimitState | null = null;

  private readonly ctrl: MotionController;
  private readonly alarm: () => void;
  private readonly onCalibrate: () => void;

  constructor(stage: HTMLElement, ctrl: MotionController, alarm: () => void, onCalibrate: () => void) {
    this.ctrl = ctrl;
    this.alarm = alarm;
    this.onCalibrate = onCalibrate;
    this.vignette.className = 'limit-alarm';
    this.vignette.innerHTML = '<span></span>';
    stage.append(this.vignette);
    this.panel.className = 'overlay';
    this.panel.id = 'testmode';
    this.panel.hidden = true;
    const rows = (['roll', 'pitch', 'angle', 'g'] as const)
      .map((k) => `<div class="tm-row"><span>${{ roll: 'Neigung', pitch: 'Nase', angle: 'Gesamtdrehung', g: 'Beschleunigung' }[k]}</span><b data-k="${k}">–</b><i class="tm-bar"><u data-b="${k}"></u></i></div>`)
      .join('');
    this.panel.innerHTML = `<div class="card tm"><h2>Kalibrieren &amp; Testen</h2><div class="tm-body"><div class="tm-dial"><div class="tm-arm"></div></div><div class="tm-rows">${rows}</div></div><p class="small muted tm-status"></p><div class="tm-btns"><button class="primary" data-a="cal">Jetzt kalibrieren</button><button data-a="back">Zurück</button></div></div>`;
    stage.append(this.panel);
    for (const k of ['roll', 'pitch', 'angle', 'g'] as const) this.rows[k] = this.panel.querySelector(`[data-k="${k}"]`)!;
    this.dial = this.panel.querySelector('.tm-arm')!;
    this.status = this.panel.querySelector('.tm-status')!;
    this.panel.querySelector('[data-a="cal"]')!.addEventListener('click', () => this.onCalibrate());
    this.panel.querySelector('[data-a="back"]')!.addEventListener('click', () => this.open(false));
  }

  open(on: boolean): void {
    this.panel.hidden = !on;
  }

  get isOpen(): boolean {
    return !this.panel.hidden;
  }

  /** Call every frame; `active` = game running (alarm only then), the test panel always shows the alarm. */
  update(nowMs: number, active: boolean): void {
    const f = this.ctrl.latest;
    if (!f) {
      this.state = null;
      this.vignette.dataset.level = 'ok';
      if (this.isOpen) this.status.textContent = 'Kein Thingy verbunden – Simulator oder Gerät starten.';
      return;
    }
    const s = checkLimits(this.ctrl.calibration.relative(f.q));
    this.state = s;
    const show = active || this.isOpen;
    this.vignette.dataset.level = show ? s.level : 'ok';
    this.vignette.firstElementChild!.textContent = show && s.axis && s.level === 'alarm' ? AXIS_TEXT[s.axis] : '';
    if (show && this.gate.fire(s, nowMs)) this.alarm();
    if (!this.isOpen) return;
    const g = Math.hypot(...f.accel);
    const set = (k: 'roll' | 'pitch' | 'angle' | 'g', text: string, ratio: number) => {
      this.rows[k].textContent = text;
      const bar = this.panel.querySelector<HTMLElement>(`[data-b="${k}"]`)!;
      bar.style.width = `${Math.min(100, Math.abs(ratio) * 100)}%`;
      bar.className = ratio > 1 ? 'bad' : ratio >= 0.85 ? 'warn' : '';
    };
    set('roll', `${s.roll.toFixed(0)}°`, s.roll / ROLL_LIMIT_DEG);
    set('pitch', `${s.pitch.toFixed(0)}°`, s.pitch / (s.pitch >= 0 ? 75 : 80));
    set('angle', `${s.angle.toFixed(0)}°`, s.angle / 140);
    set('g', `${g.toFixed(2)} g`, g / 3);
    this.dial.style.transform = `rotate(${s.roll.toFixed(1)}deg)`;
    this.status.textContent = s.level === 'alarm' ? `ALARM: ${AXIS_TEXT[s.axis!]}` : s.level === 'warn' ? 'Nah an der Grenze' : 'Im menschlichen Bereich – Gerät bewegen und beobachten.';
    this.status.style.color = s.level === 'ok' ? '' : s.level === 'alarm' ? 'var(--bad)' : 'var(--warn)';
  }
}
