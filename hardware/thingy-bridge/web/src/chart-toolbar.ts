// Binds the shared chart toolbar (time window presets, Pause/Live, reset, time format) to a ChartGroup.
import { presetFor } from './timewindow.ts';
import { fmtSpan } from './timefmt.ts';
import type { ChartGroup } from './chart-group.ts';

export function bindChartToolbar(root: HTMLElement, group: ChartGroup): void {
  const spans = [...root.querySelectorAll<HTMLButtonElement>('[data-span]')];
  const pause = root.querySelector<HTMLButtonElement>('[data-pause]');
  const mode = root.querySelector<HTMLButtonElement>('[data-time-mode]');
  const span = root.querySelector<HTMLElement>('[data-span-label]');
  const reset = root.querySelector<HTMLButtonElement>('[data-reset]');

  spans.forEach((b) => b.addEventListener('click', () => group.setSpan(Number(b.dataset['span']))));
  pause?.addEventListener('click', () => group.togglePause());
  reset?.addEventListener('click', () => group.reset());
  mode?.addEventListener('click', () => group.setMode(group.mode === 'relative' ? 'clock' : 'relative'));

  const update = (): void => {
    const preset = presetFor(group.view);
    spans.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset['span']) === preset)));
    if (pause) {
      pause.setAttribute('aria-pressed', String(!group.live));
      pause.textContent = group.live ? '❚❚ Pause' : '▶ Live';
      pause.title = group.live ? 'Verlauf anhalten (Daten werden weiter aufgezeichnet)' : 'Zurück zur Live-Ansicht';
    }
    if (mode) {
      mode.textContent = group.mode === 'relative' ? 'Zeit: relativ' : 'Zeit: Uhrzeit';
      mode.title = 'Zeitachse: relativ zu jetzt oder Uhrzeit';
    }
    if (reset) reset.disabled = group.live && preset !== null;
    if (span) span.textContent = `${fmtSpan(group.view.span)}${group.live ? '' : ' · angehalten'}`;
    root.classList.toggle('is-paused', !group.live);
  };
  group.onChange(update);
  update();
}
