import { useState, useEffect } from "react";
import "./WorkoutTracker.css";

// ── TYPES ────────────────────────────────────────────────────────────────────

type MuscleLevel = "primary" | "secondary";
type ActiveMuscles = Record<string, MuscleLevel>;
type ExerciseType = "strength" | "timed" | "cardio";

interface MuscleInfo { n: string; g: string; }
interface ExerciseDef { id: string; name: string; type: ExerciseType; cat?: string; }
interface SuggExercise extends ExerciseDef { isFocus?: boolean; score?: number; newP?: string[]; ovP?: string[]; newS?: string[]; }
interface FocusDef { name: string; icon: string; desc: string; exIds: string[]; }
interface WorkoutSet { weight: string; reps: string; done: boolean; }
interface WorkoutExercise extends ExerciseDef { uid: string; sets: WorkoutSet[]; }
interface WorkoutSession { id: string; date: string; duration: number; focus?: string | null; exercises: WorkoutExercise[]; }
interface PersonalRecord { name: string; weight: number; reps: number; date: string; isCardio?: boolean; }
interface PersonalRecordAPI extends PersonalRecord { exercise_id: string; }
type PRDict = Record<string, PersonalRecord>;
interface StatusDef { label: string; color: string; bg: string; }
interface BodyShapeDef { t: "circle" | "ellipse" | "rect"; cx?: number; cy?: number; r?: number; rx?: number; ry?: number; x?: number; y?: number; w?: number; h?: number; }
interface MuscleDef { mid: string; cx: number; cy: number; rx: number; ry: number; }
interface CoachingTip { icon: string; title: string; body: string; }
interface BodyMapProps { active?: ActiveMuscles; preview?: ActiveMuscles; onHoverMuscle?: (mid: string | null) => void; }
interface SuggCardProps { ex: SuggExercise; activeMuscles: ActiveMuscles; isAdded: boolean; onAdd: () => void; onRemove: () => void; onHover: () => void; onLeave: () => void; }

// ── MUSCLE INFO ──────────────────────────────────────────────────────────────

const MI: Record<string, MuscleInfo> = {
  upper_pec:   { n: "Upper Chest",      g: "Chest"      },
  lower_pec:   { n: "Lower Chest",      g: "Chest"      },
  front_delt:  { n: "Front Delt",       g: "Shoulders"  },
  side_delt:   { n: "Side Delt",        g: "Shoulders"  },
  rear_delt:   { n: "Rear Delt",        g: "Shoulders"  },
  upper_trap:  { n: "Upper Traps",      g: "Back"       },
  lower_trap:  { n: "Lower Traps",      g: "Back"       },
  rhomboid:    { n: "Rhomboids",        g: "Back"       },
  upper_lat:   { n: "Upper Lats",       g: "Back"       },
  lower_lat:   { n: "Lower Lats",       g: "Back"       },
  teres_major: { n: "Teres Major",      g: "Back"       },
  erector:     { n: "Erectors",         g: "Back"       },
  bicep_long:  { n: "Biceps (Outer)",   g: "Biceps"     },
  bicep_short: { n: "Biceps (Inner)",   g: "Biceps"     },
  brachialis:  { n: "Brachialis",       g: "Biceps"     },
  tricep_long: { n: "Triceps (Long)",   g: "Triceps"    },
  tricep_lat:  { n: "Triceps (Lat.)",   g: "Triceps"    },
  tricep_med:  { n: "Triceps (Med.)",   g: "Triceps"    },
  forearm:     { n: "Forearms",         g: "Arms"       },
  upper_abs:   { n: "Upper Abs",        g: "Core"       },
  lower_abs:   { n: "Lower Abs",        g: "Core"       },
  oblique:     { n: "Obliques",         g: "Core"       },
  glute_max:   { n: "Glute Max",        g: "Glutes"     },
  glute_med:   { n: "Glute Med",        g: "Glutes"     },
  quad_rf:     { n: "Rectus Femoris",   g: "Quads"      },
  quad_vl:     { n: "Vastus Lateralis", g: "Quads"      },
  quad_vmo:    { n: "VMO",              g: "Quads"      },
  adductor:    { n: "Adductors",        g: "Legs"       },
  ham_bf:      { n: "Biceps Femoris",   g: "Hamstrings" },
  ham_semi:    { n: "Semitendinosus",   g: "Hamstrings" },
  gastroc:     { n: "Gastrocnemius",    g: "Calves"     },
  soleus:      { n: "Soleus",           g: "Calves"     },
};

// ── EXERCISE → MUSCLE MAP ────────────────────────────────────────────────────

const EM: Record<string, { p: string[]; s: string[] }> = {
  bench:        { p: ["lower_pec", "upper_pec"],                              s: ["front_delt", "tricep_lat", "tricep_med"] },
  incline_db:   { p: ["upper_pec", "front_delt"],                             s: ["tricep_lat", "tricep_med"] },
  incline_bar:  { p: ["upper_pec", "front_delt"],                             s: ["tricep_lat", "tricep_med"] },
  decline:      { p: ["lower_pec"],                                           s: ["tricep_lat", "front_delt"] },
  cable_fly:    { p: ["lower_pec", "upper_pec"],                              s: ["front_delt"] },
  pec_deck:     { p: ["lower_pec", "upper_pec"],                              s: ["front_delt"] },
  dips:         { p: ["lower_pec", "tricep_long"],                            s: ["front_delt", "tricep_lat"] },
  skull:        { p: ["tricep_long", "tricep_lat"],                           s: ["tricep_med"] },
  cgbench:      { p: ["tricep_lat", "tricep_med"],                            s: ["lower_pec", "front_delt"] },
  tri_push:     { p: ["tricep_lat", "tricep_med"],                            s: ["tricep_long"] },
  tri_oh:       { p: ["tricep_long"],                                         s: ["tricep_lat", "tricep_med"] },
  ohp:          { p: ["front_delt", "side_delt"],                             s: ["upper_pec", "tricep_lat", "tricep_med", "upper_trap"] },
  db_press:     { p: ["front_delt", "upper_pec"],                             s: ["tricep_lat", "tricep_med"] },
  arnold:       { p: ["front_delt", "side_delt"],                             s: ["upper_pec", "tricep_lat"] },
  lat_pd:       { p: ["upper_lat", "lower_lat"],                              s: ["teres_major", "bicep_long", "bicep_short", "rear_delt"] },
  lat_pd_wide:  { p: ["upper_lat"],                                           s: ["lower_lat", "teres_major", "rear_delt"] },
  lat_pd_close: { p: ["lower_lat", "teres_major"],                            s: ["upper_lat", "bicep_long"] },
  pullups:      { p: ["upper_lat", "lower_lat"],                              s: ["teres_major", "bicep_long", "rear_delt"] },
  sa_pulldown:  { p: ["upper_lat", "teres_major"],                            s: ["lower_lat", "bicep_long"] },
  tbar:         { p: ["lower_lat", "rhomboid"],                               s: ["upper_lat", "teres_major", "bicep_short", "rear_delt"] },
  bb_row:       { p: ["lower_lat", "rhomboid", "lower_trap"],                 s: ["upper_lat", "teres_major", "bicep_long", "rear_delt", "erector"] },
  db_row:       { p: ["lower_lat", "teres_major"],                            s: ["rhomboid", "upper_lat", "bicep_long", "rear_delt"] },
  meadows:      { p: ["lower_lat", "teres_major"],                            s: ["rhomboid", "upper_lat", "bicep_long"] },
  cs_row:       { p: ["rhomboid", "lower_trap"],                              s: ["lower_lat", "rear_delt", "bicep_short"] },
  cable_row:    { p: ["lower_lat", "rhomboid"],                               s: ["lower_trap", "bicep_long", "rear_delt"] },
  face_pull:    { p: ["rear_delt", "lower_trap"],                             s: ["rhomboid", "side_delt"] },
  rev_fly:      { p: ["rear_delt", "rhomboid"],                               s: ["lower_trap", "side_delt"] },
  bb_curl:      { p: ["bicep_long", "bicep_short"],                           s: ["brachialis", "forearm"] },
  db_curl:      { p: ["bicep_long", "bicep_short"],                           s: ["brachialis", "forearm"] },
  hammer:       { p: ["brachialis", "bicep_long"],                            s: ["forearm"] },
  preacher:     { p: ["bicep_short", "bicep_long"],                           s: ["brachialis"] },
  incline_curl: { p: ["bicep_long"],                                          s: ["bicep_short", "brachialis"] },
  lat_raise:    { p: ["side_delt"],                                           s: ["upper_trap", "front_delt"] },
  cable_lat:    { p: ["side_delt"],                                           s: ["upper_trap"] },
  front_raise:  { p: ["front_delt"],                                          s: ["side_delt", "upper_pec"] },
  upright_row:  { p: ["side_delt", "upper_trap"],                             s: ["front_delt", "bicep_long"] },
  shrug:        { p: ["upper_trap"],                                          s: ["lower_trap"] },
  db_shrug:     { p: ["upper_trap"],                                          s: ["lower_trap"] },
  squat:        { p: ["quad_rf", "quad_vl", "quad_vmo", "glute_max"],        s: ["ham_bf", "ham_semi", "adductor", "erector"] },
  front_sq:     { p: ["quad_rf", "quad_vmo"],                                 s: ["quad_vl", "glute_max", "erector"] },
  hack_sq:      { p: ["quad_rf", "quad_vl", "quad_vmo"],                     s: ["glute_max", "ham_bf"] },
  leg_press:    { p: ["quad_vl", "quad_rf", "glute_max"],                    s: ["quad_vmo", "ham_bf", "adductor"] },
  leg_press_1:  { p: ["quad_vmo", "quad_rf"],                                 s: ["quad_vl", "glute_max"] },
  bulg_split:   { p: ["quad_rf", "glute_max"],                               s: ["quad_vl", "quad_vmo", "ham_bf", "adductor"] },
  lunges:       { p: ["quad_rf", "glute_max"],                               s: ["quad_vl", "ham_bf", "adductor"] },
  step_up:      { p: ["quad_rf", "glute_max"],                               s: ["quad_vl", "ham_bf"] },
  rdl:          { p: ["ham_bf", "ham_semi", "glute_max"],                    s: ["erector", "adductor", "gastroc"] },
  dead:         { p: ["ham_bf", "ham_semi", "glute_max", "erector"],         s: ["quad_vl", "adductor", "upper_trap", "lower_lat"] },
  sdl:          { p: ["ham_bf", "ham_semi"],                                  s: ["glute_max", "erector"] },
  good_morn:    { p: ["ham_bf", "erector"],                                   s: ["glute_max", "ham_semi"] },
  hip_thrust:   { p: ["glute_max", "glute_med"],                              s: ["ham_bf", "ham_semi", "adductor"] },
  leg_curl:     { p: ["ham_bf", "ham_semi"],                                  s: ["gastroc"] },
  leg_curl_s:   { p: ["ham_semi", "ham_bf"],                                  s: ["gastroc"] },
  leg_ext:      { p: ["quad_rf", "quad_vl", "quad_vmo"],                     s: [] },
  calf_raise:   { p: ["gastroc"],                                             s: ["soleus"] },
  calf_seat:    { p: ["soleus"],                                              s: ["gastroc"] },
  w_situp:      { p: ["upper_abs", "lower_abs"],                              s: ["oblique"] },
  roman:        { p: ["erector"],                                             s: ["glute_max", "ham_bf"] },
  w_roman:      { p: ["erector", "oblique"],                                  s: ["glute_max"] },
  cable_crunch: { p: ["upper_abs", "lower_abs"],                              s: ["oblique"] },
  ab_wheel:     { p: ["upper_abs", "lower_abs"],                              s: ["oblique", "erector"] },
  hanging_lr:   { p: ["lower_abs", "oblique"],                               s: ["upper_abs"] },
  dragon:       { p: ["upper_abs", "lower_abs", "oblique"],                  s: ["erector"] },
  pallof:       { p: ["oblique"],                                             s: ["upper_abs", "lower_abs"] },
  ghd:          { p: ["erector", "glute_max"],                               s: ["ham_bf", "upper_abs"] },
  plank:        { p: ["upper_abs", "lower_abs"],                              s: ["oblique", "erector"] },
  side_plank:   { p: ["oblique"],                                             s: ["upper_abs", "lower_abs"] },
  run:          { p: ["gastroc", "quad_rf"],                                  s: ["ham_bf", "glute_max", "soleus"] },
  cycle:        { p: ["quad_rf", "quad_vl"],                                  s: ["ham_bf", "gastroc", "glute_max"] },
  row_erg:      { p: ["lower_lat", "rhomboid"],                               s: ["quad_rf", "ham_bf", "erector", "bicep_long"] },
  jump_rope:    { p: ["gastroc", "soleus"],                                   s: ["quad_rf", "ham_bf"] },
  stair:        { p: ["quad_rf", "glute_max"],                               s: ["ham_bf", "gastroc"] },
  assault:      { p: ["gastroc", "quad_rf"],                                  s: ["ham_bf", "glute_max"] },
  swim:         { p: ["upper_lat", "front_delt"],                             s: ["teres_major", "tricep_long", "rear_delt"] },
  sled_push:    { p: ["quad_rf", "glute_max"],                               s: ["ham_bf", "gastroc", "erector"] },
  battle_rope:  { p: ["front_delt", "side_delt"],                             s: ["upper_abs", "lower_abs", "oblique"] },
  hiit:         { p: ["quad_rf", "gastroc"],                                  s: ["ham_bf", "glute_max", "upper_abs"] },
};

// ── EXERCISE LIST ────────────────────────────────────────────────────────────

const EX: Record<string, ExerciseDef[]> = {
  Push: [
    { id: "bench",       name: "Bench Press",           type: "strength" },
    { id: "incline_db",  name: "Incline DB Press",       type: "strength" },
    { id: "incline_bar", name: "Incline Bar Press",      type: "strength" },
    { id: "decline",     name: "Decline Press",          type: "strength" },
    { id: "cable_fly",   name: "Cable Fly",              type: "strength" },
    { id: "pec_deck",    name: "Pec Deck",               type: "strength" },
    { id: "dips",        name: "Dips",                   type: "strength" },
    { id: "skull",       name: "Skull Crushers",         type: "strength" },
    { id: "cgbench",     name: "Close-Grip Bench",       type: "strength" },
    { id: "tri_push",    name: "Tricep Pushdown",        type: "strength" },
    { id: "tri_oh",      name: "Overhead Tricep Ext.",   type: "strength" },
    { id: "ohp",         name: "Overhead Press",         type: "strength" },
    { id: "db_press",    name: "DB Shoulder Press",      type: "strength" },
    { id: "arnold",      name: "Arnold Press",           type: "strength" },
  ],
  Pull: [
    { id: "lat_pd",       name: "Lat Pulldown",           type: "strength" },
    { id: "lat_pd_wide",  name: "Wide-Grip Pulldown",     type: "strength" },
    { id: "lat_pd_close", name: "Close-Grip Pulldown",    type: "strength" },
    { id: "pullups",      name: "Pull-ups",               type: "strength" },
    { id: "sa_pulldown",  name: "Single-Arm Pulldown",    type: "strength" },
    { id: "tbar",         name: "T-Bar Row",              type: "strength" },
    { id: "bb_row",       name: "Barbell Row",            type: "strength" },
    { id: "db_row",       name: "DB Row",                 type: "strength" },
    { id: "meadows",      name: "Meadows Row",            type: "strength" },
    { id: "cs_row",       name: "Cable Seated Row",       type: "strength" },
    { id: "cable_row",    name: "Cable Row",              type: "strength" },
    { id: "face_pull",    name: "Face Pull",              type: "strength" },
    { id: "rev_fly",      name: "Reverse Fly",            type: "strength" },
    { id: "bb_curl",      name: "Barbell Curl",           type: "strength" },
    { id: "db_curl",      name: "DB Curl",                type: "strength" },
    { id: "hammer",       name: "Hammer Curl",            type: "strength" },
    { id: "preacher",     name: "Preacher Curl",          type: "strength" },
    { id: "incline_curl", name: "Incline DB Curl",        type: "strength" },
  ],
  Shoulders: [
    { id: "lat_raise",   name: "Lateral Raise",           type: "strength" },
    { id: "cable_lat",   name: "Cable Lateral Raise",     type: "strength" },
    { id: "front_raise", name: "Front Raise",             type: "strength" },
    { id: "upright_row", name: "Upright Row",             type: "strength" },
    { id: "shrug",       name: "Barbell Shrug",           type: "strength" },
    { id: "db_shrug",    name: "DB Shrug",                type: "strength" },
  ],
  Legs: [
    { id: "squat",      name: "Back Squat",               type: "strength" },
    { id: "front_sq",   name: "Front Squat",              type: "strength" },
    { id: "hack_sq",    name: "Hack Squat",               type: "strength" },
    { id: "leg_press",  name: "Leg Press",                type: "strength" },
    { id: "leg_press_1",name: "High-Foot Leg Press",      type: "strength" },
    { id: "bulg_split", name: "Bulgarian Split Squat",    type: "strength" },
    { id: "lunges",     name: "Lunges",                   type: "strength" },
    { id: "step_up",    name: "Step-Up",                  type: "strength" },
    { id: "rdl",        name: "Romanian Deadlift",        type: "strength" },
    { id: "dead",       name: "Deadlift",                 type: "strength" },
    { id: "sdl",        name: "Stiff-Leg Deadlift",       type: "strength" },
    { id: "good_morn",  name: "Good Morning",             type: "strength" },
    { id: "hip_thrust", name: "Hip Thrust",               type: "strength" },
    { id: "leg_curl",   name: "Lying Leg Curl",           type: "strength" },
    { id: "leg_curl_s", name: "Seated Leg Curl",          type: "strength" },
    { id: "leg_ext",    name: "Leg Extension",            type: "strength" },
    { id: "calf_raise", name: "Standing Calf Raise",      type: "strength" },
    { id: "calf_seat",  name: "Seated Calf Raise",        type: "strength" },
  ],
  Core: [
    { id: "w_situp",      name: "Weighted Sit-up",        type: "strength" },
    { id: "roman",        name: "Back Extension",         type: "strength" },
    { id: "w_roman",      name: "Oblique Ext.",           type: "strength" },
    { id: "cable_crunch", name: "Cable Crunch",           type: "strength" },
    { id: "ab_wheel",     name: "Ab Wheel",               type: "strength" },
    { id: "hanging_lr",   name: "Hanging Leg Raise",      type: "strength" },
    { id: "dragon",       name: "Dragon Flag",            type: "strength" },
    { id: "pallof",       name: "Pallof Press",           type: "strength" },
    { id: "ghd",          name: "GHD Sit-up",             type: "strength" },
    { id: "plank",        name: "Plank",                  type: "timed"    },
    { id: "side_plank",   name: "Side Plank",             type: "timed"    },
  ],
  Cardio: [
    { id: "run",         name: "Running",                 type: "cardio" },
    { id: "cycle",       name: "Cycling",                 type: "cardio" },
    { id: "row_erg",     name: "Rowing Erg",              type: "cardio" },
    { id: "jump_rope",   name: "Jump Rope",               type: "cardio" },
    { id: "stair",       name: "Stair Climber",           type: "cardio" },
    { id: "assault",     name: "Assault Bike",            type: "cardio" },
    { id: "swim",        name: "Swimming",                type: "cardio" },
    { id: "sled_push",   name: "Sled Push",               type: "cardio" },
    { id: "battle_rope", name: "Battle Ropes",            type: "cardio" },
    { id: "hiit",        name: "HIIT",                    type: "cardio" },
  ],
};

const ALL_EX: ExerciseDef[] = Object.entries(EX).flatMap(([cat, exs]) => exs.map(e => ({ ...e, cat })));

const TYPE_COLOR: Record<ExerciseType, string> = {
  strength: "#E8981E",
  cardio:   "#52B788",
  timed:    "#7B9FE0",
};

const CAT_ICON: Record<string, string> = {
  Push:      "💪",
  Pull:      "🏋️",
  Shoulders: "🔺",
  Legs:      "🦵",
  Core:      "🔥",
  Cardio:    "❤️",
};

// ── FOCUS ────────────────────────────────────────────────────────────────────

const FOCUS: Record<string, FocusDef> = {
  push:  { name: "Push Day",    icon: "💪", desc: "Chest · Shoulders · Triceps",   exIds: ["bench","incline_db","ohp","skull","tri_push","lat_raise","cable_fly","dips","db_press","tri_oh"] },
  pull:  { name: "Pull Day",    icon: "🏋️", desc: "Back · Rear Delts · Biceps",    exIds: ["lat_pd","tbar","pullups","bb_row","face_pull","bb_curl","hammer","cable_row","rev_fly","cs_row"] },
  legs:  { name: "Leg Day",     icon: "🦵", desc: "Quads · Hamstrings · Glutes",   exIds: ["squat","rdl","leg_press","hip_thrust","leg_curl","leg_ext","calf_raise","bulg_split","hack_sq"] },
  upper: { name: "Upper Body",  icon: "🔝", desc: "Full upper push & pull",        exIds: ["bench","lat_pd","ohp","tbar","skull","bb_curl","lat_raise","cs_row","db_press","hammer"] },
  lower: { name: "Lower Body",  icon: "⬇️", desc: "Full lower compound work",      exIds: ["squat","rdl","leg_press","hip_thrust","leg_curl","calf_raise","roman","sdl","bulg_split"] },
  full:  { name: "Full Body",   icon: "⚡", desc: "Hit everything in one session", exIds: ["bench","lat_pd","squat","ohp","rdl","bb_curl","skull","face_pull","hip_thrust","plank"] },
  core:  { name: "Core Focus",  icon: "🔥", desc: "Abs · Lower back · Stability",  exIds: ["w_situp","hanging_lr","cable_crunch","roman","ab_wheel","plank","pallof","dragon","w_roman"] },
};

// ── BODY SHAPES (SVG silhouette) ─────────────────────────────────────────────

const BODY_SHAPES: BodyShapeDef[] = [
  { t: "ellipse", cx: 50, cy: 14, rx: 12, ry: 14 },
  { t: "rect",    x: 30,  y: 27,  w: 40,  h: 45  },
  { t: "ellipse", cx: 18, cy: 38, rx: 10, ry: 22 },
  { t: "ellipse", cx: 82, cy: 38, rx: 10, ry: 22 },
  { t: "ellipse", cx: 12, cy: 68, rx: 8,  ry: 18 },
  { t: "ellipse", cx: 88, cy: 68, rx: 8,  ry: 18 },
  { t: "ellipse", cx: 37, cy: 78, rx: 13, ry: 22 },
  { t: "ellipse", cx: 63, cy: 78, rx: 13, ry: 22 },
  { t: "ellipse", cx: 36, cy: 104,rx: 10, ry: 20 },
  { t: "ellipse", cx: 64, cy: 104,rx: 10, ry: 20 },
  { t: "ellipse", cx: 35, cy: 128,rx: 9,  ry: 16 },
  { t: "ellipse", cx: 65, cy: 128,rx: 9,  ry: 16 },
  { t: "ellipse", cx: 31, cy: 148,rx: 8,  ry: 14 },
  { t: "ellipse", cx: 69, cy: 148,rx: 8,  ry: 14 },
  { t: "ellipse", cx: 33, cy: 165,rx: 7,  ry: 10 },
  { t: "ellipse", cx: 67, cy: 165,rx: 7,  ry: 10 },
  { t: "ellipse", cx: 6,  cy: 88,  rx: 5, ry:  8 },
  { t: "ellipse", cx: 94, cy: 88,  rx: 5, ry:  8 },
];

// ── FRONT MUSCLES ────────────────────────────────────────────────────────────

const FM: MuscleDef[] = [
  { mid: "front_delt",  cx: 22,  cy: 35,  rx: 7,  ry: 7  },
  { mid: "front_delt",  cx: 78,  cy: 35,  rx: 7,  ry: 7  },
  { mid: "side_delt",   cx: 17,  cy: 34,  rx: 5,  ry: 6  },
  { mid: "side_delt",   cx: 83,  cy: 34,  rx: 5,  ry: 6  },
  { mid: "upper_pec",   cx: 37,  cy: 34,  rx: 10, ry: 7  },
  { mid: "upper_pec",   cx: 63,  cy: 34,  rx: 10, ry: 7  },
  { mid: "lower_pec",   cx: 37,  cy: 44,  rx: 10, ry: 7  },
  { mid: "lower_pec",   cx: 63,  cy: 44,  rx: 10, ry: 7  },
  { mid: "bicep_long",  cx: 16,  cy: 48,  rx: 5,  ry: 10 },
  { mid: "bicep_long",  cx: 84,  cy: 48,  rx: 5,  ry: 10 },
  { mid: "bicep_short", cx: 18,  cy: 54,  rx: 4,  ry: 8  },
  { mid: "bicep_short", cx: 82,  cy: 54,  rx: 4,  ry: 8  },
  { mid: "brachialis",  cx: 14,  cy: 60,  rx: 4,  ry: 7  },
  { mid: "brachialis",  cx: 86,  cy: 60,  rx: 4,  ry: 7  },
  { mid: "forearm",     cx: 11,  cy: 75,  rx: 4,  ry: 12 },
  { mid: "forearm",     cx: 89,  cy: 75,  rx: 4,  ry: 12 },
  { mid: "upper_abs",   cx: 50,  cy: 57,  rx: 10, ry: 8  },
  { mid: "lower_abs",   cx: 50,  cy: 67,  rx: 9,  ry: 7  },
  { mid: "oblique",     cx: 31,  cy: 62,  rx: 7,  ry: 10 },
  { mid: "oblique",     cx: 69,  cy: 62,  rx: 7,  ry: 10 },
  { mid: "quad_vl",     cx: 36,  cy: 93,  rx: 9,  ry: 14 },
  { mid: "quad_vl",     cx: 64,  cy: 93,  rx: 9,  ry: 14 },
  { mid: "quad_rf",     cx: 40,  cy: 88,  rx: 7,  ry: 16 },
  { mid: "quad_rf",     cx: 60,  cy: 88,  rx: 7,  ry: 16 },
  { mid: "quad_vmo",    cx: 38,  cy: 106, rx: 6,  ry: 6  },
  { mid: "quad_vmo",    cx: 62,  cy: 106, rx: 6,  ry: 6  },
  { mid: "adductor",    cx: 44,  cy: 96,  rx: 6,  ry: 14 },
  { mid: "adductor",    cx: 56,  cy: 96,  rx: 6,  ry: 14 },
  { mid: "gastroc",     cx: 34,  cy: 130, rx: 7,  ry: 13 },
  { mid: "gastroc",     cx: 66,  cy: 130, rx: 7,  ry: 13 },
];

// ── BACK MUSCLES ─────────────────────────────────────────────────────────────

const BM: MuscleDef[] = [
  { mid: "upper_trap",  cx: 38,  cy: 29,  rx: 11, ry: 8  },
  { mid: "upper_trap",  cx: 62,  cy: 29,  rx: 11, ry: 8  },
  { mid: "lower_trap",  cx: 38,  cy: 42,  rx: 9,  ry: 7  },
  { mid: "lower_trap",  cx: 62,  cy: 42,  rx: 9,  ry: 7  },
  { mid: "rear_delt",   cx: 21,  cy: 33,  rx: 7,  ry: 7  },
  { mid: "rear_delt",   cx: 79,  cy: 33,  rx: 7,  ry: 7  },
  { mid: "side_delt",   cx: 16,  cy: 33,  rx: 5,  ry: 6  },
  { mid: "side_delt",   cx: 84,  cy: 33,  rx: 5,  ry: 6  },
  { mid: "rhomboid",    cx: 43,  cy: 38,  rx: 8,  ry: 8  },
  { mid: "rhomboid",    cx: 57,  cy: 38,  rx: 8,  ry: 8  },
  { mid: "upper_lat",   cx: 26,  cy: 46,  rx: 9,  ry: 12 },
  { mid: "upper_lat",   cx: 74,  cy: 46,  rx: 9,  ry: 12 },
  { mid: "lower_lat",   cx: 29,  cy: 60,  rx: 8,  ry: 10 },
  { mid: "lower_lat",   cx: 71,  cy: 60,  rx: 8,  ry: 10 },
  { mid: "teres_major", cx: 22,  cy: 40,  rx: 6,  ry: 8  },
  { mid: "teres_major", cx: 78,  cy: 40,  rx: 6,  ry: 8  },
  { mid: "erector",     cx: 44,  cy: 55,  rx: 5,  ry: 14 },
  { mid: "erector",     cx: 56,  cy: 55,  rx: 5,  ry: 14 },
  { mid: "tricep_long", cx: 17,  cy: 48,  rx: 5,  ry: 10 },
  { mid: "tricep_long", cx: 83,  cy: 48,  rx: 5,  ry: 10 },
  { mid: "tricep_lat",  cx: 15,  cy: 55,  rx: 4,  ry: 8  },
  { mid: "tricep_lat",  cx: 85,  cy: 55,  rx: 4,  ry: 8  },
  { mid: "tricep_med",  cx: 13,  cy: 63,  rx: 4,  ry: 7  },
  { mid: "tricep_med",  cx: 87,  cy: 63,  rx: 4,  ry: 7  },
  { mid: "glute_max",   cx: 37,  cy: 78,  rx: 13, ry: 13 },
  { mid: "glute_max",   cx: 63,  cy: 78,  rx: 13, ry: 13 },
  { mid: "glute_med",   cx: 29,  cy: 72,  rx: 8,  ry: 7  },
  { mid: "glute_med",   cx: 71,  cy: 72,  rx: 8,  ry: 7  },
  { mid: "ham_bf",      cx: 36,  cy: 98,  rx: 8,  ry: 14 },
  { mid: "ham_bf",      cx: 64,  cy: 98,  rx: 8,  ry: 14 },
  { mid: "ham_semi",    cx: 42,  cy: 100, rx: 6,  ry: 13 },
  { mid: "ham_semi",    cx: 58,  cy: 100, rx: 6,  ry: 13 },
  { mid: "gastroc",     cx: 35,  cy: 130, rx: 7,  ry: 13 },
  { mid: "gastroc",     cx: 65,  cy: 130, rx: 7,  ry: 13 },
  { mid: "soleus",      cx: 34,  cy: 148, rx: 6,  ry: 12 },
  { mid: "soleus",      cx: 66,  cy: 148, rx: 6,  ry: 12 },
];

// ── BODY MAP COMPONENT ───────────────────────────────────────────────────────

function BodyMap({ active = {}, preview = {}, onHoverMuscle }: BodyMapProps) {
  const [hovMid, setHovMid] = useState<string | null>(null);

  const fill = (mid: string) => {
    if (preview[mid]) return "#52B788";
    if (active[mid] === "primary") return "#E8981E";
    if (active[mid] === "secondary") return "rgba(232,152,30,0.35)";
    return "rgba(255,255,255,0.04)";
  };

  const stroke = (mid: string) => {
    if (preview[mid]) return "#52B788";
    if (active[mid]) return "#E8981E";
    return "rgba(255,255,255,0.1)";
  };

  const renderView = (muscles: MuscleDef[], label: string) => (
    <div className="body-view">
      <svg viewBox="0 0 100 180" width={90} height={162} style={{ display: "block" }}>
        {BODY_SHAPES.map((s, i) => {
          if (s.t === "circle") return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />;
          if (s.t === "ellipse") return <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />;
          return <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={4} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />;
        })}
        {muscles.map((s, i) => (
          <ellipse
            key={i}
            cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry}
            fill={fill(s.mid)}
            stroke={stroke(s.mid)}
            strokeWidth={active[s.mid] || preview[s.mid] ? 1.5 : 0.5}
            style={{ cursor: "default", transition: "fill 0.2s, stroke 0.2s" }}
            onMouseEnter={() => { setHovMid(s.mid); onHoverMuscle?.(s.mid); }}
            onMouseLeave={() => { setHovMid(null); onHoverMuscle?.(null); }}
          />
        ))}
      </svg>
      <div className="body-lbl">{label}</div>
    </div>
  );

  return (
    <div>
      <div className="map-tooltip">{hovMid ? MI[hovMid]?.n : "\u00a0"}</div>
      <div className="body-map-wrap">
        {renderView(FM, "FRONT")}
        {renderView(BM, "BACK")}
      </div>
    </div>
  );
}

// ── SUGGESTION CARD ──────────────────────────────────────────────────────────

function SuggCard({ ex, activeMuscles, isAdded, onAdd, onRemove, onHover, onLeave }: SuggCardProps) {
  const m    = EM[ex.id] || { p: [], s: [] };
  const newP = m.p.filter(mid => !activeMuscles[mid]);
  const ovP  = m.p.filter(mid => activeMuscles[mid] === "primary");
  const newS = m.s.filter(mid => !activeMuscles[mid]).slice(0, 3);

  return (
    <div
      className={`sugg-card ${isAdded ? "added" : ""} ${ex.isFocus ? "focus-pick" : ""}`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <div className="sugg-left">
        <div className="sugg-name">
          {ex.name}
          {ex.isFocus && <span className="sugg-focus-star"> ★ FOCUS</span>}
        </div>
        <div className="sugg-muscles">
          {newP.map(mid => <span key={mid} className="mtag new">{MI[mid]?.n}</span>)}
          {ovP.map(mid  => <span key={mid} className="mtag overlap">{MI[mid]?.n}</span>)}
          {newS.map(mid => <span key={mid} className="mtag sec">{MI[mid]?.n}</span>)}
        </div>
      </div>
      <button
        className={`sugg-btn ${isAdded ? "added" : "add"}`}
        onClick={isAdded ? onRemove : onAdd}
      >
        {isAdded ? "✓" : "+"}
      </button>
    </div>
  );
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

const fmtClock = (ms: number): string => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
};

const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

const fmtDur = (ms: number): string => {
  const m = Math.floor(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
};

const orm1 = (w: number, r: number): number =>
  r === 1 ? w : Math.round(w * (1 + r / 30));

// ── CONSTANTS ────────────────────────────────────────────────────────────────

const UPPER_IDS = new Set([
  "bench","incline_db","incline_bar","decline","cable_fly","pec_deck","dips",
  "skull","cgbench","tri_push","tri_oh","ohp","db_press","arnold",
  "lat_pd","lat_pd_wide","lat_pd_close","pullups","sa_pulldown","tbar",
  "bb_row","db_row","meadows","cs_row","cable_row","face_pull","rev_fly",
  "bb_curl","db_curl","hammer","preacher","incline_curl",
  "lat_raise","cable_lat","front_raise","upright_row","shrug","db_shrug",
]);

const GROUPS = [
  "Chest","Shoulders","Triceps","Biceps","Back","Core",
  "Quads","Hamstrings","Glutes","Calves","Legs","Arms",
];

const getActive = (exList: ExerciseDef[]): ActiveMuscles => {
  const result: ActiveMuscles = {};
  exList.forEach(ex => {
    const m = EM[ex.id];
    if (!m) return;
    m.p.forEach(mid => { if (!result[mid]) result[mid] = "primary"; });
    m.s.forEach(mid => { if (!result[mid]) result[mid] = "secondary"; });
  });
  return result;
};

const muscleGroups = (active: ActiveMuscles): Set<string> => {
  const groups = new Set<string>();
  Object.entries(active).forEach(([mid, level]) => {
    if (level === "primary" && MI[mid]) groups.add(MI[mid].g);
  });
  return groups;
};

// ── STATUS ───────────────────────────────────────────────────────────────────

const STATUS: Record<string, StatusDef> = {
  NEW:       { label: "NEW",           color: "#6A6558", bg: "rgba(106,101,88,0.15)"  },
  GAINING:   { label: "PROGRESSING",   color: "#52B788", bg: "rgba(82,183,136,0.12)"  },
  READY:     { label: "READY TO JUMP", color: "#E8981E", bg: "rgba(232,152,30,0.12)"  },
  BUILDING:  { label: "BUILDING REPS", color: "#6C9FD4", bg: "rgba(108,159,212,0.12)" },
  STALLED:   { label: "STALLED",       color: "#E04040", bg: "rgba(224,64,64,0.12)"   },
  PLATEAUED: { label: "PLATEAU",       color: "#FF8C42", bg: "rgba(255,140,66,0.12)"  },
  DELOAD:    { label: "DELOAD",        color: "#A07CF0", bg: "rgba(160,124,240,0.12)" },
};

// ── ANALYZE EXERCISE ─────────────────────────────────────────────────────────

interface SessionSummary { date: string; topW: number; topR: number; totalSets: number; }
interface AnalysisResult {
  sessions: SessionSummary[];
  last: SessionSummary;
  est1RM: number | null;
  status: StatusDef;
  nextWeight: number;
  nextReps: number;
  reason: string;
}

function analyzeEx(exId: string, history: WorkoutSession[]): AnalysisResult | null {
  const sessions: SessionSummary[] = [];
  [...history].reverse().forEach(w => {
    const f = w.exercises.find(e => e.id === exId);
    if (!f || !f.sets.length) return;
    const ws = f.sets.map(s => parseFloat(s.weight)).filter(x => !isNaN(x) && x > 0);
    const rs = f.sets.map(s => parseInt(s.reps)).filter(x => !isNaN(x) && x > 0);
    if (!ws.length) return;
    sessions.push({ date: w.date, topW: Math.max(...ws), topR: rs.length ? Math.max(...rs) : 0, totalSets: f.sets.length });
  });
  if (!sessions.length) return null;

  const last  = sessions[sessions.length - 1];
  const prev  = sessions.length >= 2 ? sessions[sessions.length - 2] : null;
  const back2 = sessions.length >= 3 ? sessions[sessions.length - 3] : null;
  const est1RM = last.topR > 0 ? orm1(last.topW, last.topR) : null;
  const step   = UPPER_IDS.has(exId) ? 2.5 : 5;

  let status: StatusDef;
  let nextWeight: number;
  let nextReps: number;
  let reason: string;

  if (sessions.length === 1) {
    status = STATUS.NEW; nextWeight = last.topW + step; nextReps = last.topR || 8;
    reason = `First session at ${last.topW}kg. Felt manageable? Add ${step}kg next time and match that rep count.`;
  } else {
    const wD = last.topW - prev!.topW;
    const rD = last.topR - prev!.topR;
    const stalled3 = back2 && back2.topW === last.topW && prev!.topW === last.topW;
    if (stalled3) {
      status = STATUS.DELOAD; nextWeight = Math.round(last.topW * 0.85 / step) * step; nextReps = last.topR + 2;
      reason = `Three sessions at the same weight. Drop to ${nextWeight}kg (~85%), nail the reps with perfect form, then attack it fresh next block.`;
    } else if (wD > 0) {
      status = STATUS.GAINING; nextWeight = last.topW + step; nextReps = last.topR;
      reason = `Up ${wD}kg from last session. Keep adding ${step}kg while it's moving.`;
    } else if (wD === 0 && rD > 0) {
      if (last.topR >= 12) {
        status = STATUS.READY; nextWeight = last.topW + step; nextReps = Math.max(6, last.topR - 4);
        reason = `${last.topR} reps at ${last.topW}kg — time to bump. Move to ${last.topW + step}kg, expect ~${Math.max(6, last.topR - 4)} reps. That's the deal.`;
      } else {
        status = STATUS.BUILDING; nextWeight = last.topW; nextReps = last.topR + 1;
        reason = `Reps up to ${last.topR}. Keep milking this weight — push for ${last.topR + 1} before touching the plates.`;
      }
    } else if (wD === 0 && rD === 0) {
      status = STATUS.PLATEAUED; nextWeight = last.topW; nextReps = last.topR + 1;
      reason = `Same numbers twice in a row. Longer rest (3 min), tighter setup, one more rep.`;
    } else {
      status = STATUS.STALLED; nextWeight = prev!.topW; nextReps = last.topR + 2;
      reason = `Weight dropped from ${prev!.topW}kg to ${last.topW}kg. Step back, nail it, re-earn it.`;
    }
  }
  return { sessions, last, est1RM, status, nextWeight, nextReps, reason };
}

// ── TIPS ─────────────────────────────────────────────────────────────────────

const TIPS: CoachingTip[] = [
  { icon: "⏱", title: "Rest Between Sets",    body: "Compounds: 2–4 min. Isolation: 60–90 sec. More rest = more output per set." },
  { icon: "📈", title: "Progressive Overload", body: "Add weight only when you hit the top of your rep range across all sets. Reps first, then weight." },
  { icon: "🥩", title: "Protein Intake",       body: "1.6–2.2g per kg bodyweight daily. Spread across meals — ~30–50g per sitting for best uptake." },
  { icon: "😴", title: "Sleep",                body: "7–9 hours non-negotiable. Growth hormone peaks in deep sleep. No training trick compensates for sleep debt." },
  { icon: "🔁", title: "Deload Weeks",         body: "Every 4–8 weeks, drop to 60–70% intensity for one week. You come back stronger, not weaker." },
  { icon: "💧", title: "Hydration",            body: "2% dehydration = ~6% strength loss. Drink before and during training, especially on cardio days." },
  { icon: "📐", title: "Form > Weight",        body: "Slow the eccentric, feel the target muscle, full range of motion. Every single rep." },
  { icon: "🫀", title: "Cardio + Strength",    body: "2–3 sessions/week under 30–40 min improves recovery and work capacity without eating muscle." },
];

// ── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function WorkoutTracker() {
  // UI state
  const [tab,       setTab]       = useState<string>("workout");
  const [wStep,     setWStep]     = useState<number>(0);   // 0=start 1=focus 2=build 3=review
  const [focus,     setFocus]     = useState<string | null>(null);
  const [planned,   setPlanned]   = useState<ExerciseDef[]>([]);
  const [hovEx,     setHovEx]     = useState<ExerciseDef | null>(null);
  const [showAll,   setShowAll]   = useState<boolean>(false);
  // logging
  const [active,    setActive]    = useState<boolean>(false);
  const [startTs,   setStartTs]   = useState<number | null>(null);
  const [elapsed,   setElapsed]   = useState<number>(0);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [showPick,  setShowPick]  = useState<boolean>(false);
  const [search,    setSearch]    = useState<string>("");
  // data
  const [history,   setHistory]   = useState<WorkoutSession[]>([]);
  const [prs,       setPrs]       = useState<PRDict>({});
  const [expanded,  setExpanded]  = useState<Set<string>>(new Set());
  // auth
  const [token,     setToken]     = useState<string | null>(() => localStorage.getItem("iron_log_token"));
  const [authView,  setAuthView]  = useState<"login" | "register">("login");
  const [authUser,  setAuthUser]  = useState("");
  const [authPass,  setAuthPass]  = useState("");
  const [authErr,   setAuthErr]   = useState("");

  const authFetch = (url: string, opts: RequestInit = {}) =>
    fetch(url, {
      ...opts,
      headers: { Authorization: `Bearer ${token ?? ""}`, ...(opts.headers as Record<string, string> ?? {}) },
    }).then(res => {
      if (res.status === 401) { localStorage.removeItem("iron_log_token"); setToken(null); }
      return res;
    });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErr("");
    if (authView === "register") {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: authUser, password: authPass }),
      });
      if (!res.ok) { setAuthErr((await res.json()).detail); return; }
    }
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username: authUser, password: authPass }),
    });
    if (!res.ok) { setAuthErr((await res.json()).detail); return; }
    const data = await res.json();
    localStorage.setItem("iron_log_token", data.access_token);
    setToken(data.access_token);
  };

  // ── Fetch initial data ──
  useEffect(() => {
    if (!token) return;
    authFetch("/api/workouts")
      .then(r => r.json())
      .then((data: WorkoutSession[]) => setHistory(data))
      .catch(() => {});
    authFetch("/api/prs")
      .then(r => r.json())
      .then((data: PersonalRecordAPI[]) => {
        const dict: PRDict = {};
        data.forEach(pr => { dict[pr.exercise_id] = pr; });
        setPrs(dict);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── Timer ──
  useEffect(() => {
    if (!active || !startTs) return;
    const id = setInterval(() => setElapsed(Date.now() - startTs), 1000);
    return () => clearInterval(id);
  }, [active, startTs]);

  // ── Wizard computed ──
  const activeMuscles  = getActive(planned);
  const previewMuscles = hovEx ? getActive([hovEx]) : {};
  const coveredGroups  = muscleGroups(activeMuscles);

  const getSuggestions = (): SuggExercise[] => {
    const focusIds   = focus ? FOCUS[focus].exIds : [];
    const plannedIds = new Set(planned.map(e => e.id));
    return ALL_EX
      .filter(ex => !plannedIds.has(ex.id) && ex.type !== "cardio")
      .map(ex => {
        const m       = EM[ex.id] || { p: [], s: [] };
        const newP    = m.p.filter(mid => !activeMuscles[mid]);
        const ovP     = m.p.filter(mid => activeMuscles[mid] === "primary");
        const newS    = m.s.filter(mid => !activeMuscles[mid]);
        const isFocus = focusIds.includes(ex.id);
        return { ...ex, score: (isFocus ? 100 : 0) + newP.length * 10 + newS.length * 2, newP, ovP, newS, isFocus };
      })
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  };

  const startFromWizard = () => {
    setWStep(0);
    setActive(true);
    setStartTs(Date.now());
    setElapsed(0);
    setExercises(planned.map(ex => ({
      ...ex,
      uid: `${ex.id}_${Date.now()}_${Math.random()}`,
      sets: [{ weight: "", reps: "", done: false }],
    })));
    setPlanned([]);
  };

  // ── Logging handlers ──
  const addExercise = (ex: ExerciseDef) => {
    setExercises(p => [...p, { ...ex, uid: `${ex.id}_${Date.now()}`, sets: [{ weight: "", reps: "", done: false }] }]);
    setShowPick(false);
    setSearch("");
  };

  const removeExercise = (uid: string) =>
    setExercises(p => p.filter(e => e.uid !== uid));

  const updateSet = (uid: string, idx: number, field: keyof WorkoutSet, value: string | boolean) =>
    setExercises(p => p.map(ex =>
      ex.uid !== uid ? ex : { ...ex, sets: ex.sets.map((s, i) => i === idx ? { ...s, [field]: value } : s) }
    ));

  const toggleSet = (uid: string, idx: number) =>
    setExercises(p => p.map(ex =>
      ex.uid !== uid ? ex : { ...ex, sets: ex.sets.map((s, i) => i === idx ? { ...s, done: !s.done } : s) }
    ));

  const addSet = (uid: string) =>
    setExercises(p => p.map(ex =>
      ex.uid !== uid ? ex : { ...ex, sets: [...ex.sets, { weight: "", reps: "", done: false }] }
    ));

  const removeSet = (uid: string, idx: number) =>
    setExercises(p => p.map(ex =>
      ex.uid !== uid ? ex : { ...ex, sets: ex.sets.filter((_, i) => i !== idx) }
    ));

  const isNewPr = (exId: string, weight: string): boolean => {
    const w = parseFloat(weight);
    return !isNaN(w) && w > 0 && (!prs[exId] || w > prs[exId].weight);
  };

  const finishWorkout = () => {
    if (!startTs) return;
    const dur  = Date.now() - startTs;
    const done = exercises
      .map(ex => ({ ...ex, sets: ex.sets.filter(s => s.done) }))
      .filter(ex => ex.sets.length > 0);
    const session: WorkoutSession = {
      id:        crypto.randomUUID(),
      date:      new Date().toISOString(),
      duration:  dur,
      focus:     focus,
      exercises: done,
    };
    const newPrs: PRDict = { ...prs };
    done.forEach(ex => ex.sets.forEach(s => {
      const wt = parseFloat(s.weight);
      const r  = parseInt(s.reps) || 0;
      if (!isNaN(wt) && wt > 0) {
        const cur = newPrs[ex.id];
        if (!cur || wt > cur.weight || (wt === cur.weight && r > (cur.reps || 0)))
          newPrs[ex.id] = { weight: wt, reps: r, date: session.date, name: ex.name, isCardio: ex.type === "cardio" };
      }
    }));
    const newHistory = [session, ...history].slice(0, 60);

    // Persist to backend
    authFetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(session),
    }).catch(() => {});
    Object.entries(newPrs).forEach(([exercise_id, pr]) => {
      authFetch(`/api/prs/${exercise_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pr, exercise_id }),
      }).catch(() => {});
    });

    setHistory(newHistory);
    setPrs(newPrs);
    setActive(false);
    setExercises([]);
    setStartTs(null);
    setElapsed(0);
    setWStep(0);
    setPlanned([]);
    setFocus(null);
    setTab("history");
  };

  // ── Computed / derived ──
  const doneSets = exercises.reduce((a, ex) => a + ex.sets.filter(s => s.done).length, 0);
  const volume   = exercises.reduce((a, ex) => ex.type !== "strength" ? a :
    a + ex.sets.filter(s => s.done).reduce((b, s) => b + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0), 0);

  const colLabels = (ex: WorkoutExercise): [string, string] =>
    ex.type === "cardio" ? ["DURATION (min)", "DIST (km)"]
    : ex.type === "timed" ? ["DURATION (s)", "NOTES"]
    : ["WEIGHT (kg)", "REPS"];

  const toggleExpand = (id: string) =>
    setExpanded(p => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const filteredEx = search.trim()
    ? ALL_EX.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
    : ALL_EX;
  const grouped: Record<string, ExerciseDef[]> = {};
  filteredEx.forEach(ex => { (grouped[ex.cat!] = grouped[ex.cat!] || []).push(ex); });

  // Sort coach data by most urgent status
  const STATUS_ORDER: Record<string, number> = {
    "DELOAD": 0, "STALLED": 1, "PLATEAU": 2,
    "READY TO JUMP": 3, "PROGRESSING": 4, "BUILDING REPS": 5, "NEW": 6,
  };
  const coachData = ALL_EX
    .map(ex => ({ ex, a: analyzeEx(ex.id, history) }))
    .filter((item): item is { ex: ExerciseDef; a: AnalysisResult } => item.a !== null)
    .sort((x, y) => (STATUS_ORDER[x.a.status.label] ?? 9) - (STATUS_ORDER[y.a.status.label] ?? 9));

  // ── RENDER ────────────────────────────────────────────────────────────────

  if (!token) return (
    <div className="wt-auth-screen">
      <div className="auth-card">
        <h1>🏋️ IRON LOG</h1>
        <h2>{authView === "login" ? "Sign In" : "Create Account"}</h2>
        <form onSubmit={handleAuth}>
          <input
            placeholder="Username"
            value={authUser}
            onChange={e => setAuthUser(e.target.value)}
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="Password"
            value={authPass}
            onChange={e => setAuthPass(e.target.value)}
            autoComplete="current-password"
          />
          {authErr && <p className="auth-err">{authErr}</p>}
          <button type="submit" className="auth-submit">
            {authView === "login" ? "Sign In" : "Register"}
          </button>
        </form>
        <button
          className="auth-toggle"
          onClick={() => { setAuthView(v => v === "login" ? "register" : "login"); setAuthErr(""); }}
        >
          {authView === "login" ? "Need an account? Register" : "Have an account? Sign In"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="app">
      {/* HEADER */}
      <div className="hdr">
        <div className="hdr-top">
          <div>
            <div className="logo">⚡ IRON LOG</div>
            <div className="logo-sub">Workout Tracker</div>
          </div>
          {active && <div className="timer-pill">{fmtClock(elapsed)}</div>}
          <button
            className="logout-btn"
            onClick={() => { localStorage.removeItem("iron_log_token"); setToken(null); }}
          >
            Logout
          </button>
        </div>
        <div className="tabs">
          {[
            { key: "workout", label: active ? "⚡ ACTIVE" : wStep > 0 ? "⚡ BUILDING" : "⚡ WORKOUT" },
            { key: "history", label: `📋 HISTORY (${history.length})` },
            { key: "prs",     label: `🏆 PRs (${Object.keys(prs).length})` },
            { key: "coach",   label: `🧠 COACH (${coachData.length})` },
          ].map(({ key, label }) => (
            <button key={key} className={`tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* STATS BAR */}
      {active && (
        <div className="stats-bar">
          {[
            { v: exercises.length, l: "Exercises" },
            { v: doneSets,         l: "Sets Done"  },
            { v: volume > 0 ? `${Math.round(volume)}` : "—", l: "Vol (kg)" },
            { v: exercises.reduce((a, ex) => a + ex.sets.filter(s => s.done && s.reps).length, 0) || "—", l: "Reps" },
          ].map(({ v, l }) => (
            <div key={l} className="stat">
              <div className="stat-val">{v}</div>
              <div className="stat-lbl">{l}</div>
            </div>
          ))}
        </div>
      )}

      <div className="content">

        {/* ══ WORKOUT TAB ══ */}
        {tab === "workout" && (
          <>
            {/* Step 0: Start screen */}
            {!active && wStep === 0 && (
              <div className="start-screen">
                <p className="start-pre">Ready to crush it?</p>
                <h1 className="start-hero">LET'S<br /><span>WORK</span></h1>
                <button className="btn-start" onClick={() => setWStep(1)} style={{ marginBottom: 12 }}>
                  BUILD WORKOUT
                </button>
                {history.length > 0 && (
                  <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 12 }}>
                    Last: {fmtDate(history[0].date)} · {fmtDur(history[0].duration)}
                  </p>
                )}
              </div>
            )}

            {/* Step 1: Choose focus */}
            {!active && wStep === 1 && (
              <>
                <div className="wz-hdr">
                  <button className="wz-back" onClick={() => setWStep(0)}>✕ Cancel</button>
                  <span className="wz-focus-label">STEP 1 — FOCUS</span>
                  <button className="wz-next" onClick={() => setWStep(2)} disabled={!focus}>BUILD →</button>
                </div>
                <div className="wizard-title">What are we training?</div>
                <div className="wizard-sub">Pick a focus to get smart exercise suggestions</div>
                <div className="focus-grid">
                  {Object.entries(FOCUS).map(([k, f]) => (
                    <div key={k} className={`focus-card ${focus === k ? "selected" : ""}`} onClick={() => setFocus(k)}>
                      <div className="focus-icon">{f.icon}</div>
                      <div className="focus-name">{f.name}</div>
                      <div className="focus-desc">{f.desc}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Step 2: Build with body map */}
            {!active && wStep === 2 && (() => {
              const suggestions  = getSuggestions();
              const focusSuggs   = suggestions.filter(s => s.isFocus);
              const otherSuggs   = suggestions.filter(s => !s.isFocus);
              const displayOther = showAll ? otherSuggs : otherSuggs.slice(0, 8);
              return (
                <>
                  <div className="wz-hdr">
                    <button className="wz-back" onClick={() => setWStep(1)}>← BACK</button>
                    <span className="wz-focus-label">{FOCUS[focus!]?.icon} {FOCUS[focus!]?.name.toUpperCase()}</span>
                    <button className="wz-next" onClick={() => setWStep(3)} disabled={planned.length === 0}>REVIEW →</button>
                  </div>

                  <BodyMap active={activeMuscles} preview={previewMuscles} />

                  <div className="coverage-bar-wrap">
                    <div className="coverage-top">
                      <span className="coverage-title">Muscle Coverage</span>
                      <span className="coverage-count">
                        {coveredGroups.size}
                        <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'IBM Plex Mono',monospace", fontWeight: 400 }}>
                          &nbsp;/ {GROUPS.length} groups
                        </span>
                      </span>
                    </div>
                    <div className="coverage-groups">
                      {GROUPS.map(g => {
                        const hit     = coveredGroups.has(g);
                        const preview = hovEx && muscleGroups(previewMuscles).has(g) && !hit;
                        return (
                          <span key={g} className="group-chip" style={{
                            color:       preview ? "#52B788" : hit ? "#E8981E" : "var(--muted)",
                            background:  preview ? "rgba(82,183,136,0.1)" : hit ? "var(--ad)" : "transparent",
                            borderColor: preview ? "rgba(82,183,136,0.3)" : hit ? "rgba(232,152,30,0.3)" : "var(--border)",
                          }}>
                            {g}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {focusSuggs.length > 0 && (
                    <>
                      <div className="section-title">
                        ⭐ SUGGESTED FOR {FOCUS[focus!]?.name.toUpperCase()}
                        <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "'IBM Plex Mono',monospace", fontWeight: 400, letterSpacing: 0 }}>
                          hover to preview on map
                        </span>
                      </div>
                      {focusSuggs.map(ex => (
                        <SuggCard key={ex.id} ex={ex} activeMuscles={activeMuscles}
                          isAdded={planned.some(p => p.id === ex.id)}
                          onAdd={()    => setPlanned(p => [...p, ex])}
                          onRemove={()  => setPlanned(p => p.filter(e => e.id !== ex.id))}
                          onHover={()   => setHovEx(ex)}
                          onLeave={()   => setHovEx(null)}
                        />
                      ))}
                    </>
                  )}

                  <div className="section-title" style={{ marginTop: 16 }}>➕ MORE EXERCISES</div>
                  {displayOther.map(ex => (
                    <SuggCard key={ex.id} ex={ex} activeMuscles={activeMuscles}
                      isAdded={planned.some(p => p.id === ex.id)}
                      onAdd={()    => setPlanned(p => [...p, ex])}
                      onRemove={()  => setPlanned(p => p.filter(e => e.id !== ex.id))}
                      onHover={()   => setHovEx(ex)}
                      onLeave={()   => setHovEx(null)}
                    />
                  ))}
                  {!showAll && otherSuggs.length > 8 && (
                    <button
                      onClick={() => setShowAll(true)}
                      style={{ width: "100%", background: "transparent", border: "1px dashed var(--border)", color: "var(--muted)", borderRadius: 6, padding: 10, cursor: "pointer", fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, marginBottom: 12 }}
                    >
                      show {otherSuggs.length - 8} more exercises…
                    </button>
                  )}

                  {planned.length > 0 && (
                    <>
                      <div className="section-title" style={{ marginTop: 16 }}>✓ ADDED ({planned.length})</div>
                      {planned.map((ex, i) => {
                        const m = EM[ex.id] || { p: [], s: [] };
                        return (
                          <div key={ex.id} className="planned-card">
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{i + 1}</span>
                                <div className="planned-name">{ex.name}</div>
                              </div>
                              <div className="planned-muscles">{m.p.map(mid => MI[mid]?.n).join(" · ")}</div>
                            </div>
                            <button className="btn-rm" onClick={() => setPlanned(p => p.filter(e => e.id !== ex.id))}>✕</button>
                          </div>
                        );
                      })}
                      <button
                        className="wz-next"
                        style={{ width: "100%", marginTop: 10, padding: 12, fontSize: 15 }}
                        onClick={() => setWStep(3)}
                      >
                        REVIEW WORKOUT →
                      </button>
                    </>
                  )}
                </>
              );
            })()}

            {/* Step 3: Review & start */}
            {!active && wStep === 3 && (() => {
              const finalActive = getActive(planned);
              const finalGroups = muscleGroups(finalActive);
              return (
                <>
                  <div className="wz-hdr">
                    <button className="wz-back" onClick={() => setWStep(2)}>← EDIT</button>
                    <span className="wz-focus-label">REVIEW WORKOUT</span>
                    <div style={{ width: 72 }} />
                  </div>
                  <BodyMap active={finalActive} preview={{}} />
                  <div className="coverage-bar-wrap" style={{ marginBottom: 16 }}>
                    <div className="coverage-top">
                      <span className="coverage-title">Final Coverage</span>
                      <span className="coverage-count">
                        {finalGroups.size}
                        <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'IBM Plex Mono',monospace", fontWeight: 400 }}>
                          &nbsp;/ {GROUPS.length} groups
                        </span>
                      </span>
                    </div>
                    <div className="coverage-groups">
                      {GROUPS.map(g => (
                        <span key={g} className="group-chip" style={{
                          color:       finalGroups.has(g) ? "#E8981E" : "var(--muted)",
                          background:  finalGroups.has(g) ? "var(--ad)" : "transparent",
                          borderColor: finalGroups.has(g) ? "rgba(232,152,30,0.3)" : "var(--border)",
                        }}>
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                  {planned.map((ex, i) => {
                    const m    = EM[ex.id] || { p: [], s: [] };
                    const anlz = analyzeEx(ex.id, history);
                    return (
                      <div key={ex.id} className="review-card">
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                              <span className="review-num">{i + 1}</span>
                              <div>
                                <div className="review-ex-name">{ex.name}</div>
                                {anlz && (
                                  <div style={{ fontSize: 10, color: anlz.status.color, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, letterSpacing: 1 }}>
                                    TARGET: {anlz.nextWeight}kg × {anlz.nextReps} reps
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="review-muscles">
                              {m.p.map(mid => <span key={mid} className="mtag new">{MI[mid]?.n}</span>)}
                              {m.s.slice(0, 3).map(mid => <span key={mid} className="mtag sec">{MI[mid]?.n}</span>)}
                            </div>
                          </div>
                          <button className="btn-rm" style={{ marginTop: 4 }} onClick={() => setPlanned(p => p.filter(e => e.id !== ex.id))}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                  <button className="btn-start" onClick={startFromWizard} disabled={planned.length === 0} style={{ marginTop: 8 }}>
                    ⚡ START WORKOUT ({planned.length} exercises)
                  </button>
                </>
              );
            })()}

            {/* Active workout logging */}
            {active && (
              <>
                <div className="wx-actions">
                  <button className="btn-add-ex" onClick={() => setShowPick(true)}>+ ADD EXERCISE</button>
                  <button className="btn-finish" onClick={finishWorkout} disabled={doneSets === 0}>✓ FINISH</button>
                </div>
                {exercises.length === 0 && (
                  <div className="empty">
                    <div className="empty-icon">🏋️</div>
                    <div className="empty-label">No exercises yet</div>
                  </div>
                )}
                {exercises.map(ex => {
                  const [wL, rL] = colLabels(ex);
                  const doneCt   = ex.sets.filter(s => s.done).length;
                  const curPr    = prs[ex.id];
                  const anlz     = analyzeEx(ex.id, history);
                  const m        = EM[ex.id] || { p: [], s: [] };
                  return (
                    <div key={ex.uid} className="ex-card">
                      <div className="ex-hdr">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                            <div className="ex-name">{ex.name}</div>
                            {curPr && (
                              <span className="pr-pill">PR {curPr.weight}kg{curPr.reps ? ` × ${curPr.reps}` : ""}</span>
                            )}
                          </div>
                          <div className="ex-meta">
                            <span style={{ color: TYPE_COLOR[ex.type] }}>●</span>
                            <span>{doneCt}/{ex.sets.length} sets</span>
                            {anlz && <span style={{ color: anlz.status.color }}>→ {anlz.nextWeight}kg × {anlz.nextReps}</span>}
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 5 }}>
                            {m.p.map(mid => <span key={mid} className="mtag new">{MI[mid]?.n}</span>)}
                            {m.s.slice(0, 2).map(mid => <span key={mid} className="mtag sec">{MI[mid]?.n}</span>)}
                          </div>
                        </div>
                        <button className="btn-icon" onClick={() => removeExercise(ex.uid)}>✕</button>
                      </div>
                      <div className="set-table">
                        <div className="set-col-hdr">
                          <div className="col-lbl">#</div>
                          <div className="col-lbl">{wL}</div>
                          <div className="col-lbl">{rL}</div>
                          <div className="col-lbl">✓</div>
                          <div className="col-lbl" />
                        </div>
                        {ex.sets.map((set, idx) => {
                          const showPrTag = ex.type === "strength" && isNewPr(ex.id, set.weight) && !!set.weight;
                          return (
                            <div key={idx} className="set-row">
                              <div className={`set-num ${set.done ? "done" : ""}`}>{idx + 1}</div>
                              <div className="inp-wrap">
                                <input
                                  className={`set-inp ${set.done ? "done" : ""}`}
                                  type="number" min="0" step="0.5"
                                  placeholder={ex.type === "cardio" ? "30" : ex.type === "timed" ? "60" : "0"}
                                  value={set.weight}
                                  onChange={e => updateSet(ex.uid, idx, "weight", e.target.value)}
                                />
                                {showPrTag && <span className="new-pr-tag">NEW PR!</span>}
                              </div>
                              <input
                                className={`set-inp ${set.done ? "done" : ""}`}
                                type={ex.type === "timed" ? "text" : "number"} min="0" step="1"
                                placeholder={ex.type === "cardio" ? "5.0" : ex.type === "timed" ? "—" : "0"}
                                value={set.reps}
                                onChange={e => updateSet(ex.uid, idx, "reps", e.target.value)}
                              />
                              <button
                                className={`check-btn ${set.done ? "done" : ""}`}
                                onClick={() => toggleSet(ex.uid, idx)}
                              >
                                {set.done ? "✓" : "○"}
                              </button>
                              <button
                                className="rm-set-btn"
                                onClick={() => removeSet(ex.uid, idx)}
                                disabled={ex.sets.length <= 1}
                                style={{ opacity: ex.sets.length <= 1 ? 0.2 : 1 }}
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                        <button className="btn-add-set" onClick={() => addSet(ex.uid)}>+ add set</button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}

        {/* ══ HISTORY TAB ══ */}
        {tab === "history" && (
          history.length === 0
            ? <div className="empty"><div className="empty-icon">📋</div><div className="empty-label">No sessions yet</div></div>
            : history.map(w => {
                const isOpen = expanded.has(w.id);
                const sets   = w.exercises.reduce((a, e) => a + e.sets.length, 0);
                const vol    = w.exercises.reduce((a, e) => e.type !== "strength" ? a :
                  a + e.sets.reduce((b, s) => b + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0), 0);
                return (
                  <div key={w.id} className="hist-card">
                    <div className="hist-hdr" onClick={() => toggleExpand(w.id)}>
                      <div>
                        <div className="hist-date">{fmtDate(w.date)}</div>
                        <div className="hist-meta">
                          <span>⏱ {fmtDur(w.duration)}</span>
                          <span>🏋️ {w.exercises.length} ex</span>
                          <span>📊 {sets} sets</span>
                          {vol > 0 && <span>💪 {Math.round(vol)}kg</span>}
                        </div>
                      </div>
                      <span style={{ color: "var(--muted)", fontSize: 14 }}>{isOpen ? "▲" : "▼"}</span>
                    </div>
                    {isOpen && (
                      <div className="hist-body">
                        {w.exercises.map(ex => (
                          <div key={ex.uid} className="hist-ex">
                            <div className="hist-ex-name">{ex.name}</div>
                            <div className="hist-chips">
                              {ex.sets.map((s, i) => {
                                const isPr = ex.type === "strength" && prs[ex.id] && prs[ex.id].weight === parseFloat(s.weight);
                                return (
                                  <span key={i} className={`chip ${isPr ? "pr-chip" : ""}`}>
                                    {ex.type === "cardio" ? `${s.weight}min${s.reps ? ` · ${s.reps}km` : ""}`
                                      : ex.type === "timed" ? `${s.weight}s`
                                      : `${s.weight}kg × ${s.reps}`}
                                    {isPr ? " 🏆" : ""}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
        )}

        {/* ══ PRs TAB ══ */}
        {tab === "prs" && (
          Object.keys(prs).length === 0
            ? <div className="empty"><div className="empty-icon">🏆</div><div className="empty-label">No PRs yet</div></div>
            : <>
                <p className="pr-header">{Object.keys(prs).length} Personal Records</p>
                <div className="pr-grid">
                  {Object.entries(prs)
                    .sort((a, b) => new Date(b[1].date).getTime() - new Date(a[1].date).getTime())
                    .map(([id, pr]) => (
                      <div key={id} className="pr-card">
                        <div className="pr-ex-name">{pr.name}</div>
                        <div className="pr-weight-val">
                          {pr.weight}<span className="pr-weight-unit">{pr.isCardio ? "min" : "kg"}</span>
                        </div>
                        {pr.reps > 0 && (
                          <div className="pr-reps">{pr.isCardio ? `${pr.reps} km` : `× ${pr.reps} reps`}</div>
                        )}
                        {!pr.isCardio && pr.weight && pr.reps > 0 && (
                          <div className="pr-reps" style={{ color: "var(--blue)" }}>est. 1RM ~{orm1(pr.weight, pr.reps)}kg</div>
                        )}
                        <div className="pr-date">{fmtDate(pr.date)}</div>
                      </div>
                    ))}
                </div>
              </>
        )}

        {/* ══ COACH TAB ══ */}
        {tab === "coach" && (
          <>
            {coachData.length > 0 && (
              <>
                <div className="coach-intro">
                  Progression analysis from your logged history — sorted by exercises that need the most attention.
                  Red = intervene, amber = ready for weight jump, green = moving forward.
                </div>
                {coachData.map(({ ex, a }) => {
                  const { sessions, last, est1RM, status, nextWeight, nextReps, reason } = a;
                  const maxW = Math.max(...sessions.map(s => s.topW));
                  return (
                    <div key={ex.id} className="coach-card">
                      <div className="coach-hdr">
                        <div>
                          <div className="coach-ex-name">{ex.name}</div>
                          <span className="session-count">{sessions.length} session{sessions.length !== 1 ? "s" : ""}</span>
                        </div>
                        <span className="status-badge" style={{ color: status.color, background: status.bg, borderColor: status.color }}>
                          {status.label}
                        </span>
                      </div>
                      <div className="coach-body">
                        {sessions.length > 1 && (
                          <div className="trend-wrap">
                            {sessions.map((s, i) => {
                              const h      = maxW > 0 ? Math.max(4, Math.round((s.topW / maxW) * 28)) : 4;
                              const isLast = i === sessions.length - 1;
                              return (
                                <div key={i} title={`${s.topW}kg`} style={{
                                  width: 7, height: h, borderRadius: "2px 2px 0 0", flexShrink: 0,
                                  background: isLast ? status.color : "var(--s3)",
                                  opacity: isLast ? 1 : 0.4 + 0.6 * (i / sessions.length),
                                }} />
                              );
                            })}
                            <span style={{ fontSize: 8, color: "var(--muted)", marginLeft: 5, alignSelf: "center", letterSpacing: 1 }}>TREND</span>
                          </div>
                        )}
                        <div className="coach-row">
                          <div>
                            <div className="coach-stat-lbl">Last Weight</div>
                            <div className="coach-stat-val">{last.topW}<span className="coach-stat-unit">kg</span></div>
                          </div>
                          {last.topR > 0 && (
                            <div>
                              <div className="coach-stat-lbl">Last Reps</div>
                              <div className="coach-stat-val">{last.topR}<span className="coach-stat-unit">reps</span></div>
                            </div>
                          )}
                          <div>
                            <div className="coach-stat-lbl">Sets</div>
                            <div className="coach-stat-val">{last.totalSets}<span className="coach-stat-unit">sets</span></div>
                          </div>
                          {est1RM && (
                            <div>
                              <div className="coach-stat-lbl">Est. 1RM</div>
                              <div style={{ marginTop: 4 }}><span className="orm-badge">~{est1RM}kg</span></div>
                            </div>
                          )}
                        </div>
                        <div className="rec-box">
                          <div className="rec-box-label">▶ Next Session Target</div>
                          <div className="rec-target">
                            {nextWeight}kg<span className="rec-target-unit"> × {nextReps} reps</span>
                          </div>
                          <div className="rec-reason">{reason}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
            {coachData.length === 0 && (
              <div className="empty" style={{ paddingBottom: 16 }}>
                <div className="empty-icon">🧠</div>
                <div className="empty-label">Log sessions to unlock coaching</div>
              </div>
            )}
            <div className="coach-section-title">General Principles</div>
            <div className="tips-grid">
              {TIPS.map(t => (
                <div key={t.title} className="tip-card">
                  <div className="tip-icon">{t.icon}</div>
                  <div className="tip-title">{t.title}</div>
                  <div className="tip-body">{t.body}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* EXERCISE PICKER OVERLAY */}
      {showPick && (
        <div
          className="overlay"
          onClick={e => { if (e.target === e.currentTarget) { setShowPick(false); setSearch(""); } }}
        >
          <div className="picker">
            <div className="picker-hdr">
              <span className="picker-title">Add Exercise</span>
              <button className="btn-icon" style={{ padding: "5px 10px" }} onClick={() => { setShowPick(false); setSearch(""); }}>
                ✕ Close
              </button>
            </div>
            <input
              className="search-inp"
              placeholder={`Search ${ALL_EX.length} exercises…`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
            {Object.entries(grouped).map(([cat, list]) => (
              <div key={cat}>
                <div className="cat-lbl">{CAT_ICON[cat]} {cat} ({list.length})</div>
                {list.map(ex => (
                  <button key={ex.id} className="ex-opt" onClick={() => addExercise(ex)}>
                    <span className="type-dot" style={{ background: TYPE_COLOR[ex.type] }} />
                    <span style={{ flex: 1 }}>{ex.name}</span>
                    {prs[ex.id] && <span className="ex-pr-hint">PR {prs[ex.id].weight}kg</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
