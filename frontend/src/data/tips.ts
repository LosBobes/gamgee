import type { CoachingTip } from "../types";
import { Timer, TrendingUp, Beef, Moon, RefreshCw, Droplets, Target, HeartPulse } from "lucide-react";

export const TIPS: CoachingTip[] = [
  { icon: Timer,      title: "Rest Between Sets",    body: "Compounds: 2–4 min. Isolation: 60–90 sec. More rest = more output per set." },
  { icon: TrendingUp, title: "Progressive Overload", body: "Add weight only when you hit the top of your rep range across all sets. Reps first, then weight." },
  { icon: Beef,       title: "Protein Intake",       body: "1.6–2.2g per kg bodyweight daily. Spread across meals — ~30–50g per sitting for best uptake." },
  { icon: Moon,       title: "Sleep",                body: "7–9 hours non-negotiable. Growth hormone peaks in deep sleep. No training trick compensates for sleep debt." },
  { icon: RefreshCw,  title: "Deload Weeks",         body: "Every 4–8 weeks, drop to 60–70% intensity for one week. You come back stronger, not weaker." },
  { icon: Droplets,   title: "Hydration",            body: "2% dehydration = ~6% strength loss. Drink before and during training, especially on cardio days." },
  { icon: Target,     title: "Form > Weight",        body: "Slow the eccentric, feel the target muscle, full range of motion. Every single rep." },
  { icon: HeartPulse, title: "Cardio + Strength",    body: "2–3 sessions/week under 30–40 min improves recovery and work capacity without eating muscle." },
];
