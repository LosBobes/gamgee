import type { CoachingTip } from "../types";
import { Timer, TrendingUp, Beef, Moon, RefreshCw, Droplets, Target, HeartPulse } from "lucide-react";

export const TIPS: CoachingTip[] = [
  {
    icon: Timer,
    title: "Rest Between Sets",
    body: "Compounds: 2–4 min. Isolation: 60–90 sec. More rest = more output per set.",
    bodyBro: "Compounds: 2–4 min. Isolation: 60–90 sec. Yes, that long. More rest = more output per set. Scrolling counts.",
    bodyGrl: "Compounds: 2–4 min. Isolation: 60–90 sec. Rest is also girlbossing. Scroll, hydrate, lift.",
  },
  {
    icon: TrendingUp,
    title: "Progressive Overload",
    body: "Add weight only when you hit the top of your rep range across all sets. Reps first, then weight.",
    bodyBro: "Only add weight when you've owned the top of your rep range across all sets. Reps first, then weight. There are no shortcuts, only plates.",
    bodyGrl: "Add weight only when you've owned every rep in your range. Reps first, then weight. No shortcuts, only glow-ups.",
  },
  {
    icon: Beef,
    title: "Protein Intake",
    body: "1.6–2.2g per kg bodyweight daily. Spread across meals, ~30–50g per sitting for best uptake.",
    bodyBro: "1.6–2.2g per kg bodyweight daily. Spread it across meals, ~30–50g per sitting. Chicken, eggs, protein shakes. Repeat forever. The Swoly Bible demands it.",
    bodyGrl: "1.6–2.2g per kg bodyweight daily. Spread across meals, ~30–50g per sitting. Protein girl-dinner is still a girl-dinner. Hit the number, bestie.",
  },
  {
    icon: Moon,
    title: "Sleep",
    body: "7–9 hours non-negotiable. Growth hormone peaks in deep sleep. No training trick compensates for sleep debt.",
    bodyBro: "7–9 hours. Non-negotiable. Growth hormone peaks in deep sleep. No supplement, no training hack, nothing compensates for sleeping like a corpse.",
    bodyGrl: "7–9 hours. Non-negotiable. Sleep is the original glow serum and growth hormone peaks while you're in it. No serum, no supplement compares.",
  },
  {
    icon: RefreshCw,
    title: "Deload Weeks",
    body: "Every 4–8 weeks, drop to 60–70% intensity for one week. You come back stronger, not weaker.",
    bodyBro: "Every 4–8 weeks, drop to 60–70% intensity for one week. Feels like cheating. You'll come back and absolutely smash it. Trust the process.",
    bodyGrl: "Every 4–8 weeks, drop to 60–70% intensity for a week. Feels like cheating. You'll come back glowing. The deload is the strategy.",
  },
  {
    icon: Droplets,
    title: "Hydration",
    body: "2% dehydration = ~6% strength loss. Drink before and during training, especially on cardio days.",
    bodyBro: "Just 2% dehydration = ~6% strength drop. Drink before and during training. Water is literally free gains. Stop sleeping on it.",
    bodyGrl: "Just 2% dehydration = ~6% strength drop. Hot girls hydrate. The Stanley is your training partner. No excuses.",
  },
  {
    icon: Target,
    title: "Form > Weight",
    body: "Slow the eccentric, feel the target muscle, full range of motion. Every single rep.",
    bodyBro: "Slow the eccentric, feel the target muscle, full range of motion. Every. Single. Rep. Ego lifting is how you become a cautionary tale.",
    bodyGrl: "Slow the eccentric, feel the target muscle, full range of motion. Every. Single. Rep. Ego lifting is not the move, bestie.",
  },
  {
    icon: HeartPulse,
    title: "Cardio + Strength",
    body: "2–3 sessions/week under 30–40 min improves recovery and work capacity without eating muscle.",
    bodyBro: "2–3 sessions/week under 30–40 min improves recovery and work capacity without eating your gains. Your heart is a muscle too, bro.",
    bodyGrl: "2–3 sessions/week under 30–40 min builds recovery and stamina without nuking your gains. Hot girl walks count too.",
  },
];
