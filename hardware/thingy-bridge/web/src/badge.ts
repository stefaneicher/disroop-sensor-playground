import type { ConnectionView } from './state.ts';

export type BadgeKind = 'live' | 'sim' | 'connecting' | 'nodata';
export interface Badge { kind: BadgeKind; text: string; simBanner: boolean }

// One unambiguous header badge derived from connectionView(): is the data real, simulated or missing?
export function statusBadge(view: Pick<ConnectionView, 'status' | 'stale' | 'source'>): Badge {
  const simBanner = view.source === 'sim';
  const badge = (kind: BadgeKind, text: string): Badge => ({ kind, text, simBanner });
  if (view.stale) return badge('nodata', 'Keine Daten');
  if (view.status === 'connecting' || view.status === 'reconnecting') return badge('connecting', 'Verbindet…');
  if (view.status === 'device-offline') return badge('connecting', 'Thingy nicht verbunden');
  if (view.source === 'sim') return badge('sim', 'SIMULATOR – keine echten Daten');
  return badge('live', 'LIVE – Thingy');
}
