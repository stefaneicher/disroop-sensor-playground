// Visible time window of the charts: span plus right edge; end === null means "live" (follows now).
export interface TimeView { span: number; end: number | null }
export interface Window { t0: number; t1: number }
export interface Limits { minSpan: number; maxSpan: number; oldest?: number | null }

export const WINDOW_PRESETS_MS = [10_000, 30_000, 60_000, 300_000] as const;
export const DEFAULT_LIMITS: Limits = { minSpan: 5_000, maxSpan: 300_000 };

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const clampSpan = (span: number, l: Limits): number => clamp(span, l.minSpan, l.maxSpan);

// Paused windows may not reach into the future nor (when there is history) start before the oldest sample.
function clampEnd(end: number, span: number, now: number, l: Limits): number {
  const earliest = l.oldest != null ? Math.min(now, l.oldest + span) : -Infinity;
  return clamp(end, earliest, now);
}

export const isLive = (v: TimeView): boolean => v.end === null;

export function resolveWindow(v: TimeView, now: number): Window {
  const t1 = v.end ?? now;
  return { t0: t1 - v.span, t1 };
}

export const liveView = (v: TimeView): TimeView => ({ span: v.span, end: null });
export const pauseView = (v: TimeView, now: number): TimeView => ({ span: v.span, end: v.end ?? now });
export const togglePause = (v: TimeView, now: number): TimeView => (isLive(v) ? pauseView(v, now) : liveView(v));

export function withSpan(v: TimeView, span: number, now: number, l: Limits = DEFAULT_LIMITS): TimeView {
  const s = clampSpan(span, l);
  return v.end === null ? { span: s, end: null } : { span: s, end: clampEnd(v.end, s, now, l) };
}

// Zoom by factor (>1 = zoom out) keeping the time under anchorFrac (0 = left, 1 = right) in place.
// Live windows stay live: their right edge is pinned to now.
export function zoomView(v: TimeView, now: number, factor: number, anchorFrac: number, l: Limits = DEFAULT_LIMITS): TimeView {
  const span = clampSpan(v.span * factor, l);
  if (v.end === null) return { span, end: null };
  const { t0 } = resolveWindow(v, now);
  const frac = clamp(anchorFrac, 0, 1);
  const anchor = t0 + frac * v.span;
  return { span, end: clampEnd(anchor + (1 - frac) * span, span, now, l) };
}

// Shift the window by deltaMs (negative = into the past). Panning always pauses.
export function panView(v: TimeView, now: number, deltaMs: number, l: Limits = DEFAULT_LIMITS): TimeView {
  const end = (v.end ?? now) + deltaMs;
  return { span: v.span, end: clampEnd(end, v.span, now, l) };
}

// Wheel delta (pixels, positive = scroll down) to zoom factor; down zooms out.
export const wheelFactor = (deltaY: number): number => Math.exp(clamp(deltaY, -300, 300) * 0.0015);

export const pinchFactor = (startDistance: number, distance: number): number =>
  (distance > 0 && startDistance > 0 ? startDistance / distance : 1);

export const presetFor = (v: TimeView): number | null => WINDOW_PRESETS_MS.find((p) => Math.abs(p - v.span) < 1) ?? null;
