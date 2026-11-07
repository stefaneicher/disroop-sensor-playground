/** Small frame-rate readout in the bottom-left corner (own rAF loop, averaged over 0.5 s). */
export function showFps(extra?: () => string): void {
  const el = document.createElement('div');
  el.id = 'fps';
  el.style.cssText = 'position:fixed;left:8px;bottom:6px;z-index:5;font:600 11px ui-monospace,Consolas,monospace;color:#a3e635;background:rgba(17,24,39,.6);padding:2px 6px;border-radius:6px;pointer-events:none';
  document.body.append(el);
  let frames = 0;
  let since = performance.now();
  const tick = (now: number): void => {
    frames++;
    if (now - since >= 500) {
      el.textContent = `${Math.round((frames * 1000) / (now - since))} FPS${extra ? ` · ${extra()}` : ''}`;
      frames = 0;
      since = now;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
