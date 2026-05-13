// Stretch library — keyed by muscle group (matches MuscleInfo.g in muscles.ts).
// `pickStretches(workedGroups)` returns a deduped, ordered list of stretches
// covering every muscle group hit during the session.

export interface Stretch {
  name: string;
  duration: number;     // seconds per side (or total if no "side")
  perSide?: boolean;    // if true, the user does each side
  group: string;        // muscle group this stretch targets
  cue: string;          // short coaching cue
}

export const STRETCH_LIB: Record<string, Stretch[]> = {
  Chest: [
    { group: "Chest", name: "Doorway Pec Stretch",   duration: 30, perSide: true,  cue: "Forearm on doorframe, step through, feel the chest open." },
    { group: "Chest", name: "Floor Pec Opener",       duration: 30, perSide: true,  cue: "Lie face down, arm out to side at 90°, roll body away." },
  ],
  Back: [
    { group: "Back", name: "Child's Pose",            duration: 45, perSide: false, cue: "Sit back on heels, arms reach long, breathe into the lats." },
    { group: "Back", name: "Cat–Cow",                 duration: 30, perSide: false, cue: "On all fours, alternate arching and rounding the spine." },
    { group: "Back", name: "Lat Hang",                duration: 30, perSide: true,  cue: "Hold a sturdy rail, lean away to lengthen one lat." },
  ],
  Shoulders: [
    { group: "Shoulders", name: "Cross-Body Shoulder Stretch", duration: 30, perSide: true, cue: "Pull arm across chest with the opposite hand." },
    { group: "Shoulders", name: "Sleeper Stretch",             duration: 30, perSide: true, cue: "Lying on side, internally rotate the top arm gently." },
  ],
  Biceps: [
    { group: "Biceps", name: "Wall Bicep Stretch",    duration: 30, perSide: true, cue: "Palm on wall behind you, rotate body away." },
  ],
  Triceps: [
    { group: "Triceps", name: "Overhead Tricep Stretch", duration: 30, perSide: true, cue: "Reach behind head, gently press elbow with other hand." },
  ],
  Arms: [
    { group: "Arms", name: "Wrist Flexor Stretch",   duration: 20, perSide: true, cue: "Arm out, palm up, gently pull fingers down with other hand." },
    { group: "Arms", name: "Wrist Extensor Stretch", duration: 20, perSide: true, cue: "Arm out, palm down, gently pull fingers down with other hand." },
  ],
  Grip: [
    { group: "Grip", name: "Prayer Stretch",         duration: 30, perSide: false, cue: "Palms together at chest, lower hands to feel the forearms open." },
    { group: "Grip", name: "Finger Extension Pull",  duration: 20, perSide: true,  cue: "Pull each finger gently back, opening the palm and grip muscles." },
  ],
  Neck: [
    { group: "Neck", name: "Lateral Neck Stretch",   duration: 25, perSide: true, cue: "Tilt ear toward shoulder, gently weight the head with one hand." },
    { group: "Neck", name: "Chin Tuck + Hold",       duration: 20, perSide: false, cue: "Pull chin straight back (no tilt), hold to lengthen the back of neck." },
    { group: "Neck", name: "Levator Scapulae Stretch", duration: 25, perSide: true, cue: "Look toward your armpit, gently guide head with same-side hand." },
  ],
  Core: [
    { group: "Core", name: "Cobra Stretch",          duration: 30, perSide: false, cue: "Lie on stomach, press up onto hands, lengthen the abs." },
    { group: "Core", name: "Standing Side Bend",     duration: 25, perSide: true,  cue: "Reach one arm overhead, bend sideways, feel the obliques open." },
  ],
  Quads: [
    { group: "Quads", name: "Standing Quad Stretch", duration: 30, perSide: true, cue: "Pull heel to glute, knees together, hips slightly forward." },
    { group: "Quads", name: "Couch Stretch",         duration: 45, perSide: true, cue: "Back foot up on bench, kneel, hips forward. Heavy stretch." },
  ],
  Hamstrings: [
    { group: "Hamstrings", name: "Seated Forward Fold", duration: 45, perSide: false, cue: "Legs straight, hinge at hips, reach toward toes." },
    { group: "Hamstrings", name: "Single-Leg Hamstring Stretch", duration: 30, perSide: true, cue: "Foot up on a low bench, hinge forward over the leg." },
  ],
  Glutes: [
    { group: "Glutes", name: "Pigeon Pose",          duration: 45, perSide: true, cue: "Front shin across mat, hips square, sink forward." },
    { group: "Glutes", name: "Figure-4 Stretch",     duration: 30, perSide: true, cue: "Lying on back, ankle on opposite knee, pull thigh toward chest." },
  ],
  Calves: [
    { group: "Calves", name: "Wall Calf Stretch",    duration: 30, perSide: true, cue: "Hands on wall, back leg straight, heel down. Gastroc stretch." },
    { group: "Calves", name: "Bent-Knee Wall Calf",  duration: 30, perSide: true, cue: "Same setup but bend the back knee. Targets the soleus." },
  ],
  Legs: [
    { group: "Legs", name: "Adductor Stretch",       duration: 30, perSide: true, cue: "Wide stance, shift weight to one side, sit into the hip." },
    { group: "Legs", name: "Frog Stretch",           duration: 45, perSide: false, cue: "On all fours, knees wide, sit hips back gently." },
  ],
};

/**
 * Pick stretches covering all muscle groups hit during a workout.
 * Returns one stretch per group (the first in the library), then a second
 * pass of any remaining alternates to reach a reasonable session length.
 */
export function pickStretches(groups: Set<string>, maxStretches = 8): Stretch[] {
  const ordered: Stretch[] = [];
  // First pass: one stretch per worked group
  for (const g of groups) {
    const lib = STRETCH_LIB[g];
    if (lib && lib.length) ordered.push(lib[0]);
  }
  // Second pass: pad with alternates for variety
  let i = 1;
  while (ordered.length < maxStretches) {
    let added = false;
    for (const g of groups) {
      const lib = STRETCH_LIB[g];
      if (lib && lib[i]) { ordered.push(lib[i]); added = true; }
      if (ordered.length >= maxStretches) break;
    }
    if (!added) break;
    i++;
  }
  return ordered;
}
