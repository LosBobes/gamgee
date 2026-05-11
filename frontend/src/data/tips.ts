import type { CoachingTip } from "../types";
import { Timer, TrendingUp, Beef, Moon, RefreshCw, Droplets, Target, HeartPulse } from "lucide-react";

export const TIPS: CoachingTip[] = [
  {
    icon: Timer,
    title: "Rest Between Sets",
    body: "Compounds: 2–4 min. Isolation: 60–90 sec. More rest = more output per set.",
    bodyBro: "Compounds: 2–4 min. Isolation: 60–90 sec. Yes, that long. More rest = more output per set. Scrolling counts.",
  },
  {
    icon: TrendingUp,
    title: "Progressive Overload",
    body: "Add weight only when you hit the top of your rep range across all sets. Reps first, then weight.",
    bodyBro: "Only add weight when you've owned the top of your rep range across all sets. Reps first, then weight. There are no shortcuts, only plates.",
  },
  {
    icon: Beef,
    title: "Protein Intake",
    body: "1.6–2.2g per kg bodyweight daily. Spread across meals, ~30–50g per sitting for best uptake.",
    bodyBro: "1.6–2.2g per kg bodyweight daily. Spread it across meals, ~30–50g per sitting. Chicken, eggs, protein shakes. Repeat forever. The Swoly Bible demands it.",
  },
  {
    icon: Moon,
    title: "Sleep",
    body: "7–9 hours non-negotiable. Growth hormone peaks in deep sleep. No training trick compensates for sleep debt.",
    bodyBro: "7–9 hours. Non-negotiable. Growth hormone peaks in deep sleep. No supplement, no training hack, nothing compensates for sleeping like a corpse.",
  },
  {
    icon: RefreshCw,
    title: "Deload Weeks",
    body: "Every 4–8 weeks, drop to 60–70% intensity for one week. You come back stronger, not weaker.",
    bodyBro: "Every 4–8 weeks, drop to 60–70% intensity for one week. Feels like cheating. You'll come back and absolutely smash it. Trust the process.",
  },
  {
    icon: Droplets,
    title: "Hydration",
    body: "2% dehydration = ~6% strength loss. Drink before and during training, especially on cardio days.",
    bodyBro: "Just 2% dehydration = ~6% strength drop. Drink before and during training. Water is literally free gains. Stop sleeping on it.",
  },
  {
    icon: Target,
    title: "Form > Weight",
    body: "Slow the eccentric, feel the target muscle, full range of motion. Every single rep.",
    bodyBro: "Slow the eccentric, feel the target muscle, full range of motion. Every. Single. Rep. Ego lifting is how you become a cautionary tale.",
  },
  {
    icon: HeartPulse,
    title: "Cardio + Strength",
    body: "2–3 sessions/week under 30–40 min improves recovery and work capacity without eating muscle.",
    bodyBro: "2–3 sessions/week under 30–40 min improves recovery and work capacity without eating your gains. Your heart is a muscle too, bro.",
  },
];
