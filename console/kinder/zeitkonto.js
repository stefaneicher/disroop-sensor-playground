// Zeitkonto für den Kinder-Spielplatz: ein Wochenbudget pro Gerät, Neustart an einem festen Wochentag.
// Reine Funktionen ohne DOM, damit sie mit `node --test` geprüft werden können.

export const DEFAULTS = Object.freeze({
  weeklyMinutes: 30,   // Spielzeit pro Woche auf diesem Gerät
  resetDay: 6,         // 0 = Sonntag … 6 = Samstag
  resetHour: 0,        // Neustart um 00:00 Uhr Ortszeit
  countLearning: true, // zählen Lernspiele zur Spielzeit?
});

// Eltern-Code: SHA-256 von "spielplatz:" + Code. Ändern mit
//   python3 -c "import hashlib;print(hashlib.sha256(b'spielplatz:NEUERCODE').hexdigest())"
// Das ist Schutz vor Kindern, keine echte Sicherheit: Wer den Code lesen kann, kann ihn ausprobieren.
export const PARENT_CODE_SHA256 = 'd2d7135a17d1bfed5c04b5bf986f2992f16a89b18e7b59d09df320c7d8881d7c';

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
    version: 2,
    settings: { ...DEFAULTS },
    unlimited: false, // Eltern haben unbegrenztes Spielen eingeschaltet
    weeks: {},        // weekKey → { usedMs, bonusMin, log: [{game, startedAt, ms}] }
  };
}

/** Liest einen gespeicherten Zustand; Unbekanntes oder Altes ergibt einen frischen Zustand. */
export function restore(raw) {
  if (raw && raw.version === 2 && raw.settings && raw.weeks) {
    return { ...newState(), ...raw, settings: { ...DEFAULTS, ...raw.settings } };
  }
  return newState();
}

function week(state, now) {
  const k = weekKey(now, state.settings.resetDay, state.settings.resetHour);
  state.weeks[k] ??= { usedMs: 0, bonusMin: 0, log: [] };
  return state.weeks[k];
}

export function budgetMs(state, now) {
  return (state.settings.weeklyMinutes + week(state, now).bonusMin) * 60_000;
}

export function usedMs(state, now) {
  return week(state, now).usedMs;
}

export function remainingMs(state, now) {
  if (state.unlimited) return Infinity;
  return Math.max(0, budgetMs(state, now) - usedMs(state, now));
}

export function weekLog(state, now) {
  return week(state, now).log;
}

/** Verbucht gespielte Zeit (auch bei «unbegrenzt», damit die Übersicht stimmt). Gibt die Restzeit zurück. */
export function addUsage(state, ms, now, game) {
  const w = week(state, now);
  const add = Math.max(0, Math.min(ms, 60_000)); // ein Tick zählt nie mehr als 1 Minute
  w.usedMs += add;
  const last = w.log[w.log.length - 1];
  if (last && last.game === game && now - (last.startedAt + last.ms) < 120_000) last.ms += add;
  else w.log.push({ game, startedAt: now - add, ms: add });
  return remainingMs(state, now);
}

export function addBonus(state, minutes, now) {
  week(state, now).bonusMin += minutes;
}

/** Setzt die laufende Woche zurück: volle Zeit, kein Bonus, leere Übersicht. */
export function resetWeek(state, now) {
  const k = weekKey(now, state.settings.resetDay, state.settings.resetHour);
  state.weeks[k] = { usedMs: 0, bonusMin: 0, log: [] };
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
  if (!Number.isFinite(ms)) return '∞';
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
