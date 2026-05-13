// Lightweight singleton store for backend-driven content.
//
// On first import the store kicks off a fetch of every "content" resource
// from `/api/content/*`. Components subscribe via the `useXxx` hooks, which
// return the merged result (server rows overriding the bundled defaults).
// Before the fetch resolves the hooks return the bundled defaults so nothing
// flickers or has to handle a loading state.

import { useSyncExternalStore } from "react";
import {
  BRO_QUOTES, GRL_QUOTES, PRO_QUOTES, HERO_CALLS, GRL_HERO_CALLS,
} from "../data/quotes";
import { TIPS as TIPS_STATIC } from "../data/tips";
import { Content } from "../data/contentApi";
import type {
  QuoteRow, TipRow, FocusRow, MuscleRow, StretchRow,
  ExerciseInfoRow, MetricDefRow, WeekDayRow,
} from "../data/contentApi";

type Library = {
  // Quotes split by bucket; identical shapes to the bundled defaults so
  // callers don't need to know whether the data came from server or static.
  broQuotes: string[];
  grlQuotes: string[];
  proQuotes: { text: string; source: string }[];
  heroCallsBro: [string, string][];
  heroCallsGrl: [string, string][];

  tips: typeof TIPS_STATIC;
  focuses: FocusRow[];
  muscles: MuscleRow[];
  stretches: StretchRow[];
  exerciseInfo: ExerciseInfoRow[];
  metrics: MetricDefRow[];
  weekDays: WeekDayRow[];

  loaded: boolean;
};

const initial: Library = {
  broQuotes: BRO_QUOTES,
  grlQuotes: GRL_QUOTES,
  proQuotes: PRO_QUOTES,
  heroCallsBro: HERO_CALLS,
  heroCallsGrl: GRL_HERO_CALLS,
  tips: TIPS_STATIC,
  focuses: [],
  muscles: [],
  stretches: [],
  exerciseInfo: [],
  metrics: [],
  weekDays: [],
  loaded: false,
};

let snapshot: Library = initial;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function getSnapshot(): Library {
  return snapshot;
}

function mergeQuotes(rows: QuoteRow[]) {
  const bro: string[] = [];
  const grl: string[] = [];
  const pro: { text: string; source: string }[] = [];
  const heroBro: [string, string][] = [];
  const heroGrl: [string, string][] = [];
  for (const r of rows) {
    switch (r.bucket) {
      case "bro":      bro.push(r.text); break;
      case "grl":      grl.push(r.text); break;
      case "pro":      pro.push({ text: r.text, source: r.source ?? "" }); break;
      case "hero_bro": heroBro.push([r.text, r.line2 ?? ""]); break;
      case "hero_grl": heroGrl.push([r.text, r.line2 ?? ""]); break;
    }
  }
  return { bro, grl, pro, heroBro, heroGrl };
}

// Merge backend tips with static defaults. Backend wins on overlap.
function mergeTips(rows: TipRow[]) {
  if (rows.length === 0) return TIPS_STATIC;
  // The frontend tips type carries a lucide icon component; the backend just
  // gives us the icon name. Look up the icon by name and fall back to the
  // matching static entry if we can't resolve it.
  const byId: Record<string, typeof TIPS_STATIC[number]> = {};
  // Match static tips to their backend id by title (the static array has no
  // ids). Build a lookup keyed by lowercased title.
  for (const s of TIPS_STATIC) byId[s.title.toLowerCase()] = s;
  const out: typeof TIPS_STATIC = [];
  for (const r of rows) {
    const fallback = byId[r.title.toLowerCase()];
    if (!fallback) continue;  // unknown icon → skip until the editor renders by name
    out.push({
      icon: fallback.icon,
      title: r.title,
      body: r.body,
      bodyBro: r.body_bro ?? fallback.bodyBro,
      bodyGrl: r.body_grl ?? fallback.bodyGrl,
    });
  }
  return out;
}

let _initStarted = false;

export async function refreshContentLibrary(): Promise<void> {
  try {
    const [quotes, tips, focuses, muscles, stretches, info, metrics, weekDays] =
      await Promise.all([
        Content.quotes(),
        Content.tips(),
        Content.focuses(),
        Content.muscles(),
        Content.stretches(),
        Content.exerciseInfo(),
        Content.metrics(),
        Content.weekDays(),
      ]);
    const q = mergeQuotes(quotes);
    snapshot = {
      broQuotes: q.bro.length    ? q.bro    : BRO_QUOTES,
      grlQuotes: q.grl.length    ? q.grl    : GRL_QUOTES,
      proQuotes: q.pro.length    ? q.pro    : PRO_QUOTES,
      heroCallsBro: q.heroBro.length ? q.heroBro : HERO_CALLS,
      heroCallsGrl: q.heroGrl.length ? q.heroGrl : GRL_HERO_CALLS,
      tips: mergeTips(tips),
      focuses, muscles, stretches,
      exerciseInfo: info,
      metrics, weekDays,
      loaded: true,
    };
    emit();
  } catch (err) {
    console.warn("Content library refresh failed; using defaults:", err);
  }
}

if (typeof window !== "undefined" && !_initStarted) {
  _initStarted = true;
  // Defer to the next tick so the import cycle settles and the first paint
  // can still happen against the bundled defaults.
  setTimeout(() => { void refreshContentLibrary(); }, 0);
}

export function useContentLibrary(): Library {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export const useBroQuotes    = () => useContentLibrary().broQuotes;
export const useGrlQuotes    = () => useContentLibrary().grlQuotes;
export const useProQuotes    = () => useContentLibrary().proQuotes;
export const useHeroCallsBro = () => useContentLibrary().heroCallsBro;
export const useHeroCallsGrl = () => useContentLibrary().heroCallsGrl;
export const useTips         = () => useContentLibrary().tips;
