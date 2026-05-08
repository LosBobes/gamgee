import type { ActiveMuscles, ExerciseDef, StatusDef } from "./types";
import { MI } from "./data/muscles";
import { EM } from "./data/exercises";

export const UPPER_IDS = new Set([
  "bench","incline_db","incline_bar","decline","cable_fly","pec_deck","dips",
  "skull","cgbench","tri_push","tri_oh","ohp","db_press","arnold",
  "lat_pd","lat_pd_wide","lat_pd_close","pullups","sa_pulldown","tbar",
  "bb_row","db_row","meadows","cs_row","cable_row","face_pull","rev_fly",
  "bb_curl","db_curl","hammer","preacher","incline_curl",
  "lat_raise","cable_lat","front_raise","upright_row","shrug","db_shrug",
]);

export const GROUPS = [
  "Chest","Shoulders","Triceps","Biceps","Back","Core",
  "Quads","Hamstrings","Glutes","Calves","Legs","Arms",
];

export const getActive = (exList: ExerciseDef[]): ActiveMuscles => {
  const result: ActiveMuscles = {};
  exList.forEach(ex => {
    const m = EM[ex.id];
    if (!m) return;
    m.p.forEach(mid => { if (!result[mid]) result[mid] = "primary"; });
    m.s.forEach(mid => { if (!result[mid]) result[mid] = "secondary"; });
  });
  return result;
};

export const muscleGroups = (active: ActiveMuscles): Set<string> => {
  const groups = new Set<string>();
  Object.entries(active).forEach(([mid, level]) => {
    if (level === "primary" && MI[mid]) groups.add(MI[mid].g);
  });
  return groups;
};

export const STATUS: Record<string, StatusDef> = {
  NEW:       { label: "NEW",           color: "#6A6558", bg: "rgba(106,101,88,0.15)"  },
  GAINING:   { label: "PROGRESSING",   color: "#52B788", bg: "rgba(82,183,136,0.12)"  },
  READY:     { label: "READY TO JUMP", color: "#E8981E", bg: "rgba(232,152,30,0.12)"  },
  BUILDING:  { label: "BUILDING REPS", color: "#6C9FD4", bg: "rgba(108,159,212,0.12)" },
  STALLED:   { label: "STALLED",       color: "#E04040", bg: "rgba(224,64,64,0.12)"   },
  PLATEAUED: { label: "PLATEAU",       color: "#FF8C42", bg: "rgba(255,140,66,0.12)"  },
  DELOAD:    { label: "DELOAD",        color: "#A07CF0", bg: "rgba(160,124,240,0.12)" },
};
