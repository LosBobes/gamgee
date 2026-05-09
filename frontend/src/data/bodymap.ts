import type { MuscleShape } from "../types";

// Shared silhouette for front and back — only the muscle layer differs.
// viewBox 0 0 100 180. Head is a separate <circle cx="50" cy="13" r="12"/>.
export const BODY_PATH =
  // Left neck → shoulder cap → outer arm (bicep bulge, forearm taper, wrist)
  "M 44,22 C 38,25 20,32 13,38 " +
  "C 10,40 8,44 8,50 C 7,56 7,62 9,68 " +
  "C 10,74 11,80 12,87 L 14,91 L 18,91 " +
  // Inner arm back up to armpit
  "C 18,84 18,76 19,70 C 20,64 22,58 24,52 " +
  // Left torso: chest → waist narrows → hip flares
  "C 24,57 27,64 32,72 C 32,76 29,79 26,83 " +
  // Left outer leg: thigh → knee → calf bulge → ankle → foot
  "C 25,86 25,90 25,96 C 25,102 26,108 27,112 " +
  "C 25,118 23,126 24,132 C 25,138 27,148 28,156 " +
  "L 27,162 L 26,170 C 29,174 33,175 38,174 " +
  // Left inner leg: foot → ankle → calf → knee → thigh → crotch
  "L 40,170 L 40,162 " +
  "C 39,154 39,146 40,136 C 41,128 42,120 43,114 " +
  "C 43,110 43,104 43,96 C 43,92 42,88 41,84 " +
  // Crotch
  "L 59,84 " +
  // Right inner leg: crotch → thigh → knee → calf → ankle → foot
  "C 58,88 57,92 57,96 C 57,104 57,110 57,114 " +
  "C 58,120 59,128 60,136 C 61,146 61,154 60,162 " +
  "L 60,170 C 67,175 71,174 72,170 L 73,162 L 72,156 " +
  // Right outer leg: ankle → calf bulge → knee → thigh → hip
  "C 73,148 75,138 76,132 C 77,126 75,118 75,112 " +
  "C 74,108 75,102 75,96 C 75,90 75,86 74,83 " +
  // Right torso: hip → waist → chest
  "C 71,79 68,76 68,72 C 73,64 76,57 76,52 " +
  // Right inner arm down to wrist, then outer arm back up
  "C 78,58 80,64 81,70 C 82,76 82,84 82,91 " +
  "L 86,91 C 88,84 90,76 91,70 " +
  // Outer arm up: forearm → bicep → shoulder cap → neck
  "C 92,62 93,56 92,50 C 90,44 87,40 87,38 " +
  "C 80,32 62,25 56,22 Z";

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
