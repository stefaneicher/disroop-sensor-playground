// Where to put a popover next to its anchor: below if it fits in the viewport, else above; clamped horizontally.

export interface Rect { left: number; top: number; width: number; height: number }
export interface Size { width: number; height: number }
export interface Placement { left: number; top: number; above: boolean; arrowX: number }

const GAP = 8;

/** Coordinates are viewport-relative (like getBoundingClientRect); the result too. */
export function placePopover(anchor: Rect, pop: Size, viewport: Size, margin = 8): Placement {
  const center = anchor.left + anchor.width / 2;
  const maxLeft = Math.max(margin, viewport.width - pop.width - margin);
  const left = Math.min(Math.max(center - pop.width / 2, margin), maxLeft);
  const below = anchor.top + anchor.height + GAP;
  const above = anchor.top - GAP - pop.height;
  const fitsBelow = below + pop.height <= viewport.height - margin;
  const useAbove = !fitsBelow && above >= margin;
  const arrowX = Math.min(Math.max(center - left, 12), pop.width - 12);
  return { left, top: useAbove ? above : below, above: useAbove, arrowX };
}
