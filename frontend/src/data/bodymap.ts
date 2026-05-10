import type { MuscleShape } from "../types";

// viewBox 0 0 100 180. Head is a separate <circle cx="50" cy="13" r="12"/>.

// ─── Male silhouette — softer, athletic, 7.5-head proportions ────────────────
// Counter-clockwise from L neck. Smooth C1-continuous curves through:
// neck(43,22) → acromion(18,36) → outer arm(11,50) → wrist(13,104) → armpit(24,52)
// → waist(34,72) → hip(29,91) → crotch(44,93) → knee(30,146) → ankle(28,170).
export const MALE_BODY_PATH =
  "M 43,22 " +
  "C 38,25 26,29 18,36 " +
  "C 13,38 11,43 11,50 " +
  "C 11,60 12,71 13,82 " +
  "C 13,92 13,99 13,104 " +
  "C 11,114 13,120 16,120 " +
  "C 19,120 21,114 19,104 " +
  "C 19,98 19,90 20,82 " +
  "C 21,72 22,62 24,52 " +
  "C 25,57 30,64 34,72 " +
  "C 33,80 30,86 29,91 " +
  "C 28,98 28,108 28,118 " +
  "C 28,128 29,138 30,146 " +
  "C 29,154 27,162 28,170 " +
  "L 28,176 " +
  "C 31,178 37,178 41,176 " +
  "L 41,170 " +
  "C 42,160 43,148 43,138 " +
  "C 44,128 45,118 45,108 " +
  "C 45,102 45,98 44,93 " +
  "L 56,93 " +
  "C 55,98 55,102 55,108 " +
  "C 55,118 56,128 57,138 " +
  "C 57,148 58,160 59,170 " +
  "L 59,176 " +
  "C 63,178 69,178 72,176 " +
  "L 72,170 " +
  "C 73,162 71,154 70,146 " +
  "C 71,138 72,128 72,118 " +
  "C 72,108 72,98 71,91 " +
  "C 70,86 67,80 66,72 " +
  "C 70,64 75,57 76,52 " +
  "C 78,62 79,72 80,82 " +
  "C 81,90 81,98 81,104 " +
  "C 79,114 81,120 84,120 " +
  "C 87,120 89,114 87,104 " +
  "C 87,99 87,92 87,82 " +
  "C 88,71 89,60 89,50 " +
  "C 89,43 87,38 82,36 " +
  "C 74,29 62,25 57,22 Z";

// ─── Female silhouette — narrower waist, hip flare, slimmer arms ─────────────
// Hourglass: shoulders ≈ hips, waist nipped at y=67. Hip widest at (22,92).
export const FEMALE_BODY_PATH =
  "M 44,22 " +
  "C 39,25 28,30 22,36 " +
  "C 18,38 15,43 15,50 " +
  "C 15,60 15,71 15,82 " +
  "C 15,92 15,99 15,104 " +
  "C 13,114 15,120 18,120 " +
  "C 21,120 23,114 21,104 " +
  "C 21,98 21,90 22,82 " +
  "C 23,72 24,62 27,52 " +
  "C 28,57 33,61 37,67 " +
  "C 35,75 28,84 23,92 " +
  "C 22,98 22,108 22,118 " +
  "C 22,128 23,138 24,146 " +
  "C 23,154 22,162 24,170 " +
  "L 23,176 " +
  "C 26,178 33,178 39,176 " +
  "L 39,170 " +
  "C 40,160 41,148 41,138 " +
  "C 42,128 42,118 42,108 " +
  "C 42,102 42,98 41,93 " +
  "L 59,93 " +
  "C 58,98 58,102 58,108 " +
  "C 58,118 58,128 59,138 " +
  "C 59,148 60,160 61,170 " +
  "L 61,176 " +
  "C 67,178 74,178 77,176 " +
  "L 76,170 " +
  "C 78,162 77,154 76,146 " +
  "C 77,138 78,128 78,118 " +
  "C 78,108 78,98 77,92 " +
  "C 72,84 65,75 63,67 " +
  "C 67,61 72,57 73,52 " +
  "C 76,62 77,72 78,82 " +
  "C 79,90 79,98 79,104 " +
  "C 77,114 79,120 82,120 " +
  "C 85,120 87,114 85,104 " +
  "C 85,99 85,92 85,82 " +
  "C 85,71 85,60 85,50 " +
  "C 85,43 82,38 78,36 " +
  "C 72,30 61,25 56,22 Z";

// Legacy alias so any other importer doesn't break
export const BODY_PATH = MALE_BODY_PATH;

// ─── Front view ─────────────────────────────────────────────────────────────
// Muscles refit for new proportions:
//   shoulder y≈42, elbow y≈72, wrist y≈104, waist y≈70, knee y≈146, ankle y≈170.

export const FM: MuscleShape[] = [
  // Neck (sternocleidomastoid band, just under chin)
  { mid: "neck", cx: 50, cy: 26, rx: 5, ry: 3 },

  // Deltoids
  { mid: "front_delt", cx: 22, cy: 42, rx: 7,  ry: 7  },
  { mid: "front_delt", cx: 78, cy: 42, rx: 7,  ry: 7  },
  { mid: "side_delt",  cx: 14, cy: 44, rx: 4,  ry: 6  },
  { mid: "side_delt",  cx: 86, cy: 44, rx: 4,  ry: 6  },

  // Pecs (upper crescent + lower crescent — fill the chest plate)
  { mid: "upper_pec", d: "M 48,30 C 41,28 28,32 22,38 C 21,41 22,45 25,46 C 33,45 41,43 48,40 Z" },
  { mid: "upper_pec", d: "M 52,30 C 59,28 72,32 78,38 C 79,41 78,45 75,46 C 67,45 59,43 52,40 Z" },
  { mid: "lower_pec", d: "M 48,40 C 41,43 33,45 25,46 C 22,48 21,52 23,54 C 32,57 42,55 48,53 Z" },
  { mid: "lower_pec", d: "M 52,40 C 59,43 67,45 75,46 C 78,48 79,52 77,54 C 68,57 58,55 52,53 Z" },

  // Bicep / brachialis (upper arm front)
  { mid: "bicep_long",  cx: 15, cy: 58, rx: 4, ry: 10 },
  { mid: "bicep_long",  cx: 85, cy: 58, rx: 4, ry: 10 },
  { mid: "bicep_short", cx: 18, cy: 64, rx: 3, ry: 8  },
  { mid: "bicep_short", cx: 82, cy: 64, rx: 3, ry: 8  },
  { mid: "brachialis",  cx: 14, cy: 74, rx: 3, ry: 6  },
  { mid: "brachialis",  cx: 86, cy: 74, rx: 3, ry: 6  },

  // Forearm
  { mid: "forearm", cx: 15, cy: 92, rx: 3, ry: 12 },
  { mid: "forearm", cx: 85, cy: 92, rx: 3, ry: 12 },

  // Grip (hand)
  { mid: "grip", cx: 16, cy: 112, rx: 4, ry: 6 },
  { mid: "grip", cx: 84, cy: 112, rx: 4, ry: 6 },

  // Abs
  { mid: "upper_abs", cx: 50, cy: 58, rx: 9, ry: 7 },
  { mid: "lower_abs", cx: 50, cy: 70, rx: 8, ry: 7 },

  // Obliques (rotated to follow ribcage→hip line)
  { mid: "oblique", cx: 30, cy: 65, rx: 6, ry: 11, rotate: -22 },
  { mid: "oblique", cx: 70, cy: 65, rx: 6, ry: 11, rotate:  22 },

  // Quads (thigh from y=93 to y=146)
  { mid: "quad_vl",  cx: 33, cy: 110, rx: 5, ry: 18 },
  { mid: "quad_vl",  cx: 67, cy: 110, rx: 5, ry: 18 },
  { mid: "quad_rf",  cx: 38, cy: 108, rx: 4, ry: 20 },
  { mid: "quad_rf",  cx: 62, cy: 108, rx: 4, ry: 20 },
  { mid: "quad_vmo", cx: 40, cy: 134, rx: 4, ry: 7  },
  { mid: "quad_vmo", cx: 60, cy: 134, rx: 4, ry: 7  },

  // Adductor (inner thigh)
  { mid: "adductor", cx: 43, cy: 110, rx: 3, ry: 16 },
  { mid: "adductor", cx: 57, cy: 110, rx: 3, ry: 16 },

  // Calf (front view shows the gastroc bulk through the lower leg)
  { mid: "gastroc", cx: 33, cy: 156, rx: 5, ry: 9 },
  { mid: "gastroc", cx: 67, cy: 156, rx: 5, ry: 9 },
];

// ─── Back view ──────────────────────────────────────────────────────────────

export const BM: MuscleShape[] = [
  // Neck (back — splenius / upper cervical region)
  { mid: "neck", cx: 50, cy: 26, rx: 5, ry: 3 },

  // Trapezius
  { mid: "upper_trap", d: "M 50,24 C 44,26 32,30 22,36 L 21,40 C 26,43 35,45 43,46 C 47,45 50,42 50,38 Z" },
  { mid: "upper_trap", d: "M 50,24 C 56,26 68,30 78,36 L 79,40 C 74,43 65,45 57,46 C 53,45 50,42 50,38 Z" },
  { mid: "lower_trap", d: "M 50,38 C 48,42 45,46 40,48 C 34,50 28,54 30,60 C 34,64 40,64 45,60 C 48,56 50,50 50,42 Z" },
  { mid: "lower_trap", d: "M 50,38 C 52,42 55,46 60,48 C 66,50 72,54 70,60 C 66,64 60,64 55,60 C 52,56 50,50 50,42 Z" },

  // Deltoids (back)
  { mid: "rear_delt", cx: 22, cy: 40, rx: 6, ry: 7 },
  { mid: "rear_delt", cx: 78, cy: 40, rx: 6, ry: 7 },
  { mid: "side_delt", cx: 14, cy: 42, rx: 4, ry: 6 },
  { mid: "side_delt", cx: 86, cy: 42, rx: 4, ry: 6 },

  // Rhomboids
  { mid: "rhomboid", cx: 43, cy: 42, rx: 6, ry: 7 },
  { mid: "rhomboid", cx: 57, cy: 42, rx: 6, ry: 7 },

  // Lats (upper sweep + lower curl above hip)
  { mid: "upper_lat", d: "M 50,48 C 44,48 33,50 25,56 C 21,62 21,68 23,74 L 28,74 C 31,68 35,62 41,58 C 45,54 49,52 50,50 Z" },
  { mid: "upper_lat", d: "M 50,48 C 56,48 67,50 75,56 C 79,62 79,68 77,74 L 72,74 C 69,68 65,62 59,58 C 55,54 51,52 50,50 Z" },
  { mid: "lower_lat", d: "M 30,72 C 26,74 24,78 26,82 C 28,85 33,85 35,81 C 35,77 33,73 30,72 Z" },
  { mid: "lower_lat", d: "M 70,72 C 74,74 76,78 74,82 C 72,85 67,85 65,81 C 65,77 67,73 70,72 Z" },

  // Teres major (small wedge between scapula and lat)
  { mid: "teres_major", cx: 23, cy: 44, rx: 5, ry: 6, rotate: -15 },
  { mid: "teres_major", cx: 77, cy: 44, rx: 5, ry: 6, rotate:  15 },

  // Erector spinae (paraspinal columns)
  { mid: "erector", cx: 45, cy: 60, rx: 4, ry: 14 },
  { mid: "erector", cx: 55, cy: 60, rx: 4, ry: 14 },

  // Triceps (back of upper arm)
  { mid: "tricep_long", cx: 16, cy: 56, rx: 4, ry: 10 },
  { mid: "tricep_long", cx: 84, cy: 56, rx: 4, ry: 10 },
  { mid: "tricep_lat",  cx: 14, cy: 66, rx: 3, ry: 8  },
  { mid: "tricep_lat",  cx: 86, cy: 66, rx: 3, ry: 8  },
  { mid: "tricep_med",  cx: 13, cy: 75, rx: 3, ry: 6  },
  { mid: "tricep_med",  cx: 87, cy: 75, rx: 3, ry: 6  },

  // Glutes
  { mid: "glute_max", d: "M 48,72 C 40,70 28,73 26,82 C 24,90 28,96 36,98 C 42,98 46,95 48,90 L 48,76 Z" },
  { mid: "glute_max", d: "M 52,72 C 60,70 72,73 74,82 C 76,90 72,96 64,98 C 58,98 54,95 52,90 L 52,76 Z" },
  { mid: "glute_med", cx: 28, cy: 78, rx: 7, ry: 7, rotate: -10 },
  { mid: "glute_med", cx: 72, cy: 78, rx: 7, ry: 7, rotate:  10 },

  // Hamstrings (back of thigh)
  { mid: "ham_bf",   cx: 33, cy: 116, rx: 6, ry: 18 },
  { mid: "ham_bf",   cx: 67, cy: 116, rx: 6, ry: 18 },
  { mid: "ham_semi", cx: 41, cy: 118, rx: 4, ry: 16 },
  { mid: "ham_semi", cx: 59, cy: 118, rx: 4, ry: 16 },

  // Calves
  { mid: "gastroc", cx: 34, cy: 154, rx: 6, ry: 9 },
  { mid: "gastroc", cx: 66, cy: 154, rx: 6, ry: 9 },
  { mid: "soleus",  cx: 34, cy: 166, rx: 4, ry: 5 },
  { mid: "soleus",  cx: 66, cy: 166, rx: 4, ry: 5 },

  // Grip (back of hand)
  { mid: "grip", cx: 16, cy: 112, rx: 4, ry: 6 },
  { mid: "grip", cx: 84, cy: 112, rx: 4, ry: 6 },
];

// ─── Anatomical detail lines (very faint interior structure) ──────────────────
// Rendered as thin strokes at ~0.10 opacity to add realistic depth.

export const FRONT_LINES: string[] = [
  // Clavicles (sweep from neck base to acromion)
  "M 46,28 C 38,30 28,33 22,37",
  "M 54,28 C 62,30 72,33 78,37",
  // Sternum + linea alba
  "M 50,30 L 50,57",
  "M 50,57 L 50,80",
  // Lower pec crease
  "M 26,46 C 33,52 41,54 48,54",
  "M 74,46 C 67,52 59,54 52,54",
  // Ab segmentation lines
  "M 43,62 Q 50,64 57,62",
  "M 43,68 Q 50,70 57,68",
  // Quad center lines (rectus femoris ridge)
  "M 38,108 C 37,120 35,135 34,143",
  "M 62,108 C 63,120 65,135 66,143",
  // Kneecaps
  "M 34,144 C 32,148 32,152 35,153 C 38,154 42,153 43,151 C 44,148 43,144 40,143",
  "M 66,144 C 68,148 68,152 65,153 C 62,154 58,153 57,151 C 56,148 57,144 60,143",
];

export const BACK_LINES: string[] = [
  // Spine
  "M 50,30 C 50,46 50,60 50,72",
  // Glute crease
  "M 28,92 C 36,96 44,98 50,99 C 56,98 64,96 72,92",
  // Hamstring separation
  "M 41,100 L 39,140",
  "M 59,100 L 61,140",
  // Calf separation (gastroc heads)
  "M 33,148 C 31,156 30,162 30,166",
  "M 67,148 C 69,156 70,162 70,166",
];
