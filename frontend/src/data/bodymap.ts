import type { MuscleDef } from "../types";

// Shared silhouette for front and back — only the muscle layer differs.
// viewBox 0 0 100 180. Head is a separate <circle cx="50" cy="13" r="12"/>.
export const BODY_PATH =
  "M 44,22 C 38,25 22,32 14,40 L 10,44 C 8,50 7,60 7,74 L 7,90 L 13,90 " +
  "L 14,74 C 15,64 17,56 22,50 C 25,58 28,68 29,76 L 28,84 L 28,108 " +
  "L 27,130 L 27,152 L 26,163 L 25,172 C 29,175 33,176 38,175 " +
  "L 40,171 L 41,163 L 41,152 L 42,130 L 43,108 L 44,84 L 46,80 L 54,80 " +
  "L 56,84 L 57,108 L 58,130 L 59,152 L 59,163 L 60,171 L 62,175 " +
  "C 67,176 71,175 75,172 L 74,163 L 73,152 L 72,130 L 72,108 L 72,84 " +
  "L 71,76 C 72,68 75,58 78,50 C 83,56 85,64 86,74 L 87,90 L 93,90 " +
  "L 93,74 C 93,60 92,50 90,44 L 86,40 C 78,32 62,25 56,22 Z";

export const FM: MuscleDef[] = [
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

export const BM: MuscleDef[] = [
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
