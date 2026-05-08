import type { MuscleShape } from "../types";

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

// ─── Front view ─────────────────────────────────────────────────────────────

export const FM: MuscleShape[] = [
  // Deltoids — ellipses work well enough, small muscles
  { mid: "front_delt", cx: 22, cy: 35, rx: 7,  ry: 7  },
  { mid: "front_delt", cx: 78, cy: 35, rx: 7,  ry: 7  },
  { mid: "side_delt",  cx: 16, cy: 34, rx: 5,  ry: 6  },
  { mid: "side_delt",  cx: 84, cy: 34, rx: 5,  ry: 6  },

  // Pectorals — fan shapes from sternum to shoulder/axilla
  { mid: "upper_pec", d: "M 47,29 C 40,27 27,30 21,36 C 20,39 21,43 24,45 C 32,44 40,41 47,38 Z" },
  { mid: "upper_pec", d: "M 53,29 C 60,27 73,30 79,36 C 80,39 79,43 76,45 C 68,44 60,41 53,38 Z" },
  { mid: "lower_pec", d: "M 47,38 C 40,41 32,44 24,45 C 21,47 20,50 22,52 C 31,55 41,54 47,52 Z" },
  { mid: "lower_pec", d: "M 53,38 C 60,41 68,44 76,45 C 79,47 80,50 78,52 C 69,55 59,54 53,52 Z" },

  // Biceps
  { mid: "bicep_long",  cx: 16, cy: 48, rx: 5, ry: 10 },
  { mid: "bicep_long",  cx: 84, cy: 48, rx: 5, ry: 10 },
  { mid: "bicep_short", cx: 18, cy: 54, rx: 4, ry: 8  },
  { mid: "bicep_short", cx: 82, cy: 54, rx: 4, ry: 8  },
  { mid: "brachialis",  cx: 14, cy: 62, rx: 4, ry: 7  },
  { mid: "brachialis",  cx: 86, cy: 62, rx: 4, ry: 7  },

  // Forearms
  { mid: "forearm", cx: 11, cy: 76, rx: 4, ry: 12 },
  { mid: "forearm", cx: 89, cy: 76, rx: 4, ry: 12 },

  // Abs — stacked ovals are actually anatomically right here
  { mid: "upper_abs", cx: 50, cy: 57, rx: 9, ry: 7 },
  { mid: "lower_abs", cx: 50, cy: 67, rx: 8, ry: 6 },

  // Obliques — rotated to show the diagonal fiber direction
  { mid: "oblique", cx: 31, cy: 62, rx: 7, ry: 11, rotate: -22 },
  { mid: "oblique", cx: 69, cy: 62, rx: 7, ry: 11, rotate:  22 },

  // Quads
  { mid: "quad_vl",  cx: 36, cy: 93,  rx: 9,  ry: 14 },
  { mid: "quad_vl",  cx: 64, cy: 93,  rx: 9,  ry: 14 },
  { mid: "quad_rf",  cx: 40, cy: 88,  rx: 7,  ry: 16 },
  { mid: "quad_rf",  cx: 60, cy: 88,  rx: 7,  ry: 16 },
  { mid: "quad_vmo", cx: 38, cy: 106, rx: 6,  ry: 6  },
  { mid: "quad_vmo", cx: 62, cy: 106, rx: 6,  ry: 6  },

  // Adductors
  { mid: "adductor", cx: 44, cy: 96, rx: 6, ry: 14 },
  { mid: "adductor", cx: 56, cy: 96, rx: 6, ry: 14 },

  // Gastrocnemius (calves)
  { mid: "gastroc", cx: 34, cy: 130, rx: 7, ry: 13 },
  { mid: "gastroc", cx: 66, cy: 130, rx: 7, ry: 13 },
];

// ─── Back view ──────────────────────────────────────────────────────────────

export const BM: MuscleShape[] = [
  // Trapezius — proper diamond shapes
  { mid: "upper_trap", d: "M 50,24 C 43,26 30,29 18,35 L 16,39 C 22,42 32,44 42,45 C 46,44 49,41 50,38 Z" },
  { mid: "upper_trap", d: "M 50,24 C 57,26 70,29 82,35 L 84,39 C 78,42 68,44 58,45 C 54,44 51,41 50,38 Z" },
  { mid: "lower_trap", d: "M 50,38 C 48,41 45,44 40,46 C 34,48 28,52 30,58 C 34,62 40,62 45,58 C 48,54 50,48 50,42 Z" },
  { mid: "lower_trap", d: "M 50,38 C 52,41 55,44 60,46 C 66,48 72,52 70,58 C 66,62 60,62 55,58 C 52,54 50,48 50,42 Z" },

  // Rear + side deltoids
  { mid: "rear_delt", cx: 21, cy: 33, rx: 7, ry: 7 },
  { mid: "rear_delt", cx: 79, cy: 33, rx: 7, ry: 7 },
  { mid: "side_delt", cx: 16, cy: 33, rx: 5, ry: 6 },
  { mid: "side_delt", cx: 84, cy: 33, rx: 5, ry: 6 },

  // Rhomboids (between shoulder blades)
  { mid: "rhomboid", cx: 43, cy: 38, rx: 7, ry: 7 },
  { mid: "rhomboid", cx: 57, cy: 38, rx: 7, ry: 7 },

  // Latissimus dorsi — fan from spine to axilla
  { mid: "upper_lat", d: "M 50,46 C 44,46 32,48 24,54 C 20,60 20,66 22,72 L 27,72 C 30,66 34,60 40,56 C 44,52 48,50 50,48 Z" },
  { mid: "upper_lat", d: "M 50,46 C 56,46 68,48 76,54 C 80,60 80,66 78,72 L 73,72 C 70,66 66,60 60,56 C 56,52 52,50 50,48 Z" },
  { mid: "lower_lat", d: "M 30,70 C 26,72 24,76 26,80 C 28,83 33,83 35,79 C 35,75 33,71 30,70 Z" },
  { mid: "lower_lat", d: "M 70,70 C 74,72 76,76 74,80 C 72,83 67,83 65,79 C 65,75 67,71 70,70 Z" },

  // Teres major
  { mid: "teres_major", cx: 22, cy: 40, rx: 6, ry: 7, rotate: -15 },
  { mid: "teres_major", cx: 78, cy: 40, rx: 6, ry: 7, rotate:  15 },

  // Erector spinae (vertical along spine)
  { mid: "erector", cx: 44, cy: 55, rx: 5, ry: 14 },
  { mid: "erector", cx: 56, cy: 55, rx: 5, ry: 14 },

  // Triceps
  { mid: "tricep_long", cx: 17, cy: 48, rx: 5, ry: 10 },
  { mid: "tricep_long", cx: 83, cy: 48, rx: 5, ry: 10 },
  { mid: "tricep_lat",  cx: 15, cy: 55, rx: 4, ry: 8  },
  { mid: "tricep_lat",  cx: 85, cy: 55, rx: 4, ry: 8  },
  { mid: "tricep_med",  cx: 13, cy: 63, rx: 4, ry: 7  },
  { mid: "tricep_med",  cx: 87, cy: 63, rx: 4, ry: 7  },

  // Glutes — rounded anatomical shapes
  { mid: "glute_max", d: "M 48,70 C 40,68 28,70 26,78 C 24,86 28,93 36,95 C 42,95 46,92 48,88 L 48,74 Z" },
  { mid: "glute_max", d: "M 52,70 C 60,68 72,70 74,78 C 76,86 72,93 64,95 C 58,95 54,92 52,88 L 52,74 Z" },
  { mid: "glute_med",  cx: 29, cy: 72, rx: 8, ry: 7, rotate: -10 },
  { mid: "glute_med",  cx: 71, cy: 72, rx: 8, ry: 7, rotate:  10 },

  // Hamstrings
  { mid: "ham_bf",   cx: 36, cy: 98, rx: 8,  ry: 14 },
  { mid: "ham_bf",   cx: 64, cy: 98, rx: 8,  ry: 14 },
  { mid: "ham_semi", cx: 42, cy: 100, rx: 6, ry: 13 },
  { mid: "ham_semi", cx: 58, cy: 100, rx: 6, ry: 13 },

  // Calves
  { mid: "gastroc", cx: 35, cy: 130, rx: 7, ry: 13 },
  { mid: "gastroc", cx: 65, cy: 130, rx: 7, ry: 13 },
  { mid: "soleus",  cx: 34, cy: 148, rx: 6, ry: 12 },
  { mid: "soleus",  cx: 66, cy: 148, rx: 6, ry: 12 },
];
