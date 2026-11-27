// Zeitkonto für den Kinder-Spielplatz: Wochenbudget pro Kind, Neustart an einem festen Wochentag.
// Reine Funktionen ohne DOM, damit sie mit `node --test` geprüft werden können.

export const DEFAULTS = Object.freeze({
  weeklyMinutes: 30,   // Spielzeit pro Kind und Woche
  resetDay: 6,         // 0 = Sonntag … 6 = Samstag
  resetHour: 0,        // Neustart um 00:00 Uhr Ortszeit
  countLearning: true, // zählen Lernspiele zur Spielzeit?
});

/** Beginn der aktuellen Spielwoche (lokale Zeit) als Datum. */
export function weekStart(now, resetDay = DEFAULTS.resetDay, resetHour = DEFAULTS.resetHour) {
  const d = new Date(now);
  d.setHours(resetHour, 0, 0, 0);
  const back = (d.getDay() - resetDay + 7) % 7;
  d.setDate(d.getDate() - back);
  if (d.getTime() > new Date(now).getTime()) d.setDate(d.getDate() - 7);
  return d;
}

/** Schlüssel der Spielwoche, z. B. "2026-11-21". */
export function weekKey(now, resetDay, resetHour) {
  const d = weekStart(now, resetDay, resetHour);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Nächster Neustart als Datum. */
export function nextReset(now, resetDay, resetHour) {
  const d = weekStart(now, resetDay, resetHour);
  d.setDate(d.getDate() + 7);
  return d;
}

export function newState() {
  return {
    version: 1,
    pin: null,
    settings: { ...DEFAULTS },
    kids: [
      { id: 'k1', name: 'Kind 1', color: '#e4572e', minutes: null },
      { id: 'k2', name: 'Kind 2', color: '#2e86de', minutes: null },
      { id: 'k3', name: 'Kind 3', color: '#17a673', minutes: null },
    ],
    weeks: {}, // weekKey → { kidId → { usedMs, bonusMin, log: [{game, startedAt, ms}] } }
  };
}

function week(state, kidId, now) {
  const k = weekKey(now, state.settings.resetDay, state.settings.resetHour);
  state.weeks[k] ??= {};
  state.weeks[k][kidId] ??= { usedMs: 0, bonusMin: 0, log: [] };
  return state.weeks[k][kidId];
}

export function budgetMs(state, kidId, now) {
  const kid = state.kids.find(k => k.id === kidId);
  const base = kid?.minutes ?? state.settings.weeklyMinutes;
  return (base + week(state, kidId, now).bonusMin) * 60_000;
}

export function usedMs(state, kidId, now) {
  return week(state, kidId, now).usedMs;
}

export function remainingMs(state, kidId, now) {
  return Math.max(0, budgetMs(state, kidId, now) - usedMs(state, kidId, now));
}

/** Verbucht gespielte Zeit. Gibt die verbleibende Zeit zurück. */
export function addUsage(state, kidId, ms, now, game) {
  const w = week(state, kidId, now);
  const add = Math.max(0, Math.min(ms, 60_000)); // ein Tick zählt nie mehr als 1 Minute
  w.usedMs += add;
  const last = w.log[w.log.length - 1];
  if (last && last.game === game && now - (last.startedAt + last.ms) < 120_000) last.ms += add;
  else w.log.push({ game, startedAt: now - add, ms: add });
  return remainingMs(state, kidId, now);
}

export function addBonus(state, kidId, minutes, now) {
  week(state, kidId, now).bonusMin += minutes;
}

/** Zählt dieses Spiel zur Spielzeit? */
export function counts(state, game) {
  if (game.playtime === false) return false;
  if (game.category === 'Lernen' && !state.settings.countLearning) return false;
  return true;
}

/** Alte Wochen wegräumen (behält die letzten `keep` Wochen). */
export function prune(state, keep = 8) {
  const keys = Object.keys(state.weeks).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - keep))) delete state.weeks[k];
}

export function formatMs(ms) {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
