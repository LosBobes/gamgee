export const fmtClock = (ms: number): string => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
};

export const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

export const fmtDur = (ms: number): string => {
  const m = Math.floor(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
};

export const orm1 = (w: number, r: number): number =>
  r === 1 ? w : Math.round(w * (1 + r / 30));

/** Estimated 1RM from a working set that left `rir` reps in reserve. A set of
 * `reps` reps with `rir` reps still in the tank is roughly equivalent to a max
 * effort of `reps + rir` reps, so we feed that into Epley. With `rir = 0` this
 * collapses to {@link orm1} (a set taken to failure). */
export const e1rmWithRir = (w: number, reps: number, rir: number): number => {
  const eff = reps + Math.max(0, rir);
  return eff <= 1 ? w : Math.round(w * (1 + eff / 30));
};

/** Effort is stored on each set as an RPE number (1..10, sports-science
 * canonical) but surfaced to the user as RIR — "reps left in the tank" — which
 * is the more intuitive inverse: RIR = 10 - RPE. These two helpers convert
 * between the stored value and the displayed one. */
export const rpeToRir = (rpe: number | null | undefined): number | null =>
  rpe == null || !Number.isFinite(rpe) ? null : Math.max(0, Math.min(10, 10 - Math.round(rpe)));
export const rirToRpe = (rir: number): number =>
  Math.max(1, Math.min(10, 10 - Math.round(rir)));

export const fmtShortDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
