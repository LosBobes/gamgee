import type { LucideIcon } from "lucide-react";
import { Dumbbell, ArrowDown, PersonStanding, ChevronsUp, ChevronsDown, Zap, Flame, Activity, Target, Trophy, Heart, Star, Shield, Bike, Mountain, Wind, Timer, Swords } from "lucide-react";
import type { FocusDef, CustomFocusDef } from "../types";

export const FOCUS: Record<string, FocusDef> = {
  push:  { name: "Push Day",   icon: Dumbbell,        desc: "Chest · Shoulders · Triceps",   exIds: ["bench","incline_db","ohp","skull","tri_push","lat_raise","cable_fly","dips","db_press","tri_oh"] },
  pull:  { name: "Pull Day",   icon: ArrowDown,        desc: "Back · Rear Delts · Biceps",    exIds: ["lat_pd","tbar","pullups","bb_row","face_pull","bb_curl","hammer","cable_row","rev_fly","cs_row"] },
  legs:  { name: "Leg Day",    icon: PersonStanding,   desc: "Quads · Hamstrings · Glutes",   exIds: ["squat","rdl","leg_press","hip_thrust","leg_curl","leg_ext","calf_raise","bulg_split","hack_sq"] },
  upper: { name: "Upper Body", icon: ChevronsUp,       desc: "Full upper push & pull",        exIds: ["bench","lat_pd","ohp","tbar","skull","bb_curl","lat_raise","cs_row","db_press","hammer"] },
  lower: { name: "Lower Body", icon: ChevronsDown,     desc: "Full lower compound work",      exIds: ["squat","rdl","leg_press","hip_thrust","leg_curl","calf_raise","roman","sdl","bulg_split"] },
  full:  { name: "Full Body",  icon: Zap,              desc: "Hit everything in one session", exIds: ["bench","lat_pd","squat","ohp","rdl","bb_curl","skull","face_pull","hip_thrust","plank"] },
  core:  { name: "Core Focus", icon: Flame,            desc: "Abs · Lower back · Stability",  exIds: ["w_situp","hanging_lr","cable_crunch","roman","ab_wheel","plank","pallof","dragon","w_roman"] },
};

export const ICON_OPTIONS: { name: string; icon: LucideIcon }[] = [
  { name: "Dumbbell",       icon: Dumbbell       },
  { name: "Flame",          icon: Flame          },
  { name: "Zap",            icon: Zap            },
  { name: "Activity",       icon: Activity       },
  { name: "Target",         icon: Target         },
  { name: "Trophy",         icon: Trophy         },
  { name: "Heart",          icon: Heart          },
  { name: "Star",           icon: Star           },
  { name: "Shield",         icon: Shield         },
  { name: "Bike",           icon: Bike           },
  { name: "Mountain",       icon: Mountain       },
  { name: "Wind",           icon: Wind           },
  { name: "Timer",          icon: Timer          },
  { name: "Swords",         icon: Swords         },
  { name: "PersonStanding", icon: PersonStanding },
  { name: "ChevronsUp",     icon: ChevronsUp     },
];

const STORAGE_KEY = "gamgee_custom_focuses";

export function getCustomFocuses(): CustomFocusDef[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

export function saveCustomFocuses(focuses: CustomFocusDef[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(focuses));
}

export function getFocusDef(focusId: string): FocusDef | undefined {
  if (FOCUS[focusId]) return FOCUS[focusId];
  const cf = getCustomFocuses().find(c => c.id === focusId);
  if (!cf) return undefined;
  const iconEntry = ICON_OPTIONS.find(o => o.name === cf.iconName) ?? ICON_OPTIONS[0];
  return { name: cf.name, icon: iconEntry.icon, desc: cf.desc, exIds: [] };
}
