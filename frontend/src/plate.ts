/**
 * Plate calculator. Given a target weight, a bar weight, and a multiset of
 * available plate sizes, compute the per-side plate combo that gets closest
 * to the target without exceeding it. Pure function — easy to unit test.
 *
 * Inputs are in whatever unit the user uses (kg or lb); the function doesn't
 * care, only ratios matter. Returns at most one of each plate per side, so
 * pairs go onto each side identically.
 */

export interface PlateInventoryItem {
  weight: number;
  count: number;
}

export interface PlateResult {
  perSide: number[];
  used: number;
  remaining: number;
}

const DEFAULT_KG_PLATES: PlateInventoryItem[] = [
  { weight: 25, count: 4 },
  { weight: 20, count: 4 },
  { weight: 15, count: 2 },
  { weight: 10, count: 4 },
  { weight: 5, count: 4 },
  { weight: 2.5, count: 4 },
  { weight: 1.25, count: 4 },
];

const DEFAULT_LB_PLATES: PlateInventoryItem[] = [
  { weight: 45, count: 4 },
  { weight: 35, count: 2 },
  { weight: 25, count: 4 },
  { weight: 10, count: 4 },
  { weight: 5, count: 4 },
  { weight: 2.5, count: 4 },
];

export function defaultPlates(unit: "kg" | "lb" = "kg"): PlateInventoryItem[] {
  return unit === "lb" ? [...DEFAULT_LB_PLATES] : [...DEFAULT_KG_PLATES];
}

export function defaultBarWeight(unit: "kg" | "lb" = "kg"): number {
  return unit === "lb" ? 45 : 20;
}

/** Compute the optimal greedy plate layout per side. */
export function loadout(
  target: number,
  bar: number,
  inventory: PlateInventoryItem[],
): PlateResult {
  if (!Number.isFinite(target) || target <= bar) {
    return { perSide: [], used: bar, remaining: Math.max(0, target - bar) };
  }
  let perSide = (target - bar) / 2;
  const plates: number[] = [];
  // Largest first — greedy works for the standard plate sets.
  const sorted = [...inventory]
    .filter(p => p.weight > 0 && p.count > 0)
    .sort((a, b) => b.weight - a.weight);
  for (const p of sorted) {
    // Each side gets the same plate, so we consume 2 plates per "use".
    let pairsAvail = Math.floor(p.count / 2);
    while (pairsAvail > 0 && perSide >= p.weight - 1e-9) {
      plates.push(p.weight);
      perSide = Math.round((perSide - p.weight) * 1000) / 1000;
      pairsAvail--;
    }
  }
  const usedPerSide = plates.reduce((a, b) => a + b, 0);
  return {
    perSide: plates,
    used: bar + 2 * usedPerSide,
    remaining: Math.max(0, target - (bar + 2 * usedPerSide)),
  };
}

/** Compact human-readable summary, e.g. "45 + 25 + 10 / side". */
export function summarize(result: PlateResult): string {
  if (result.perSide.length === 0) return "Bar only";
  const counts = new Map<number, number>();
  for (const p of result.perSide) counts.set(p, (counts.get(p) ?? 0) + 1);
  const parts: string[] = [];
  for (const [w, c] of [...counts].sort((a, b) => b[0] - a[0])) {
    parts.push(c > 1 ? `${w}×${c}` : `${w}`);
  }
  return `${parts.join(" + ")} / side`;
}
