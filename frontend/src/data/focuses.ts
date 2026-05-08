import type { FocusDef } from "../types";

export const FOCUS: Record<string, FocusDef> = {
  push:  { name: "Push Day",   icon: "💪", desc: "Chest · Shoulders · Triceps",   exIds: ["bench","incline_db","ohp","skull","tri_push","lat_raise","cable_fly","dips","db_press","tri_oh"] },
  pull:  { name: "Pull Day",   icon: "🏋️", desc: "Back · Rear Delts · Biceps",    exIds: ["lat_pd","tbar","pullups","bb_row","face_pull","bb_curl","hammer","cable_row","rev_fly","cs_row"] },
  legs:  { name: "Leg Day",    icon: "🦵", desc: "Quads · Hamstrings · Glutes",   exIds: ["squat","rdl","leg_press","hip_thrust","leg_curl","leg_ext","calf_raise","bulg_split","hack_sq"] },
  upper: { name: "Upper Body", icon: "🔝", desc: "Full upper push & pull",        exIds: ["bench","lat_pd","ohp","tbar","skull","bb_curl","lat_raise","cs_row","db_press","hammer"] },
  lower: { name: "Lower Body", icon: "⬇️", desc: "Full lower compound work",      exIds: ["squat","rdl","leg_press","hip_thrust","leg_curl","calf_raise","roman","sdl","bulg_split"] },
  full:  { name: "Full Body",  icon: "⚡", desc: "Hit everything in one session", exIds: ["bench","lat_pd","squat","ohp","rdl","bb_curl","skull","face_pull","hip_thrust","plank"] },
  core:  { name: "Core Focus", icon: "🔥", desc: "Abs · Lower back · Stability",  exIds: ["w_situp","hanging_lr","cable_crunch","roman","ab_wheel","plank","pallof","dragon","w_roman"] },
};
