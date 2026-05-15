import type { LucideIcon } from "lucide-react";
import { Dumbbell, ArrowDown, PersonStanding, ChevronsUp, ChevronsDown, Zap, Flame, Activity, Target, Trophy, Heart, Star, Shield, Bike, Mountain, Wind, Timer, Swords } from "lucide-react";
import type { FocusDef, CustomFocusDef } from "../types";

export const FOCUS: Record<string, FocusDef> = {
  push: {
    name: "Push Day",
    icon: Dumbbell,
    desc: "Chest · Shoulders · Triceps",
    exIds: [
      "bench", "incline_db", "incline_bar", "decline", "smith_bench", "machine_chest", "floor_press", "larsen_press",
      "cable_fly", "pec_deck", "db_pullover", "svend_press",
      "dips", "push_up", "decline_pushup", "diamond_pushup", "archer_pushup",
      "ohp", "db_press", "arnold", "viking_press", "landmine_press", "behind_neck",
      "lat_raise", "cable_lat", "mach_lat", "lean_lat", "front_raise", "plate_front", "upright_row",
      "skull", "cgbench", "tate_press", "jm_press", "tri_push", "rope_pushdown", "sa_pushdown", "tri_oh", "kickback",
    ],
  },
  pull: {
    name: "Pull Day",
    icon: ArrowDown,
    desc: "Back · Rear Delts · Biceps",
    exIds: [
      "lat_pd", "lat_pd_wide", "lat_pd_close", "machine_pd", "sa_pulldown", "straight_arm",
      "pullups", "chinups", "neutral_pullup", "weighted_pull",
      "tbar", "bb_row", "pendlay_row", "db_row", "kroc_row", "meadows", "seal_row",
      "cs_row", "cable_row", "machine_row", "inverted_row",
      "face_pull", "rev_fly", "y_raise", "cuban_press", "rack_pull", "shrug", "db_shrug",
      "bb_curl", "ez_curl", "db_curl", "cable_curl", "hammer", "preacher", "incline_curl",
      "spider_curl", "conc_curl", "drag_curl", "zottman",
    ],
  },
  legs: {
    name: "Leg Day",
    icon: PersonStanding,
    desc: "Quads · Hamstrings · Glutes",
    exIds: [
      "squat", "front_sq", "goblet_sq", "zercher_sq", "box_sq", "pause_sq", "safety_sq",
      "hack_sq", "pendulum_sq", "sissy_sq", "leg_press", "leg_press_1",
      "bulg_split", "lunges", "walking_lunge", "reverse_lunge", "curtsy_lunge", "step_up",
      "rdl", "single_rdl", "dead", "sumo_dl", "trap_bar_dl", "sdl", "good_morn",
      "hip_thrust", "glute_bridge", "frog_pump", "glute_kickback", "pull_through", "kb_swing",
      "leg_curl", "leg_curl_s", "nordic_curl", "leg_ext", "abductor_m", "adductor_m",
      "calf_raise", "calf_seat", "donkey_calf",
    ],
  },
  upper: {
    name: "Upper Body",
    icon: ChevronsUp,
    desc: "Full upper push & pull",
    exIds: [
      "bench", "incline_db", "machine_chest", "cable_fly", "dips", "push_up",
      "ohp", "db_press", "arnold", "landmine_press",
      "lat_raise", "front_raise", "upright_row", "shrug",
      "lat_pd", "pullups", "chinups", "tbar", "bb_row", "db_row", "cable_row", "face_pull", "rev_fly",
      "skull", "cgbench", "tri_push", "tri_oh",
      "bb_curl", "ez_curl", "db_curl", "hammer", "preacher",
    ],
  },
  lower: {
    name: "Lower Body",
    icon: ChevronsDown,
    desc: "Full lower compound work",
    exIds: [
      "squat", "front_sq", "goblet_sq", "hack_sq", "pause_sq", "leg_press", "bulg_split", "lunges", "walking_lunge", "step_up",
      "rdl", "single_rdl", "dead", "sumo_dl", "trap_bar_dl", "sdl", "good_morn",
      "hip_thrust", "glute_bridge", "glute_kickback", "pull_through", "kb_swing",
      "leg_curl", "leg_curl_s", "nordic_curl", "leg_ext", "abductor_m", "adductor_m",
      "calf_raise", "calf_seat", "donkey_calf", "roman",
    ],
  },
  full: {
    name: "Full Body",
    icon: Zap,
    desc: "Hit everything in one session",
    exIds: [
      "bench", "incline_db", "ohp", "dips", "push_up",
      "lat_pd", "pullups", "bb_row", "face_pull",
      "squat", "rdl", "dead", "hip_thrust", "bulg_split",
      "lat_raise", "bb_curl", "hammer", "skull", "tri_push",
      "plank", "hanging_lr", "ab_wheel", "farmers", "kb_swing", "burpees",
    ],
  },
  core: {
    name: "Core Focus",
    icon: Flame,
    desc: "Abs · Lower back · Stability",
    exIds: [
      "w_situp", "cable_crunch", "ab_wheel", "v_up", "bicycle", "russian_twist",
      "hanging_lr", "knee_raise", "dragon", "l_sit", "hollow_hold",
      "woodchop", "pallof", "ghd", "dead_bug", "bird_dog", "mtn_climber",
      "copenhagen", "suitcase_carry", "plank", "side_plank",
      "roman", "w_roman",
    ],
  },
  cardio: {
    name: "Cardio Day",
    icon: Heart,
    desc: "Running · Cycling · HIIT · Erg",
    exIds: [
      "run", "incline_walk", "sprint", "hill_sprint", "shuttle_run",
      "cycle", "elliptical", "row_erg", "ski_erg", "stair", "assault",
      "jump_rope", "swim", "sled_push", "prowler", "battle_rope",
      "burpees", "hiit",
    ],
  },
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
