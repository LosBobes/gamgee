// How-to context for every exercise. Rendered in the eye-icon expand panel.
// Keep entries terse — three short lines max so the animated panel reads cleanly.

export interface ExerciseInfo {
  setup:   string;
  execute: string;
  cue:     string;
}

export const EXERCISE_INFO: Record<string, ExerciseInfo> = {
  // ── Push ─────────────────────────────────────────────────────────────────
  bench:        { setup: "Flat bench, eyes under the bar, grip slightly wider than shoulders.",       execute: "Lower bar to mid-chest with control, drive feet down and press up.",       cue: "Wrists stacked over elbows. Shoulder blades pinned." },
  incline_db:   { setup: "Bench at ~30°, dumbbells at shoulder height, palms forward.",               execute: "Press up and slightly together until almost locked out.",                  cue: "Don't flare elbows past 75° from torso." },
  incline_bar:  { setup: "Bench at 30–45°, grip slightly wider than shoulders.",                      execute: "Lower bar to upper chest, press straight up.",                             cue: "Tuck elbows on the descent — protects shoulders." },
  decline:      { setup: "Decline bench, secure feet, grip standard width.",                          execute: "Lower bar to lower chest, press up and slightly back.",                    cue: "Stay tight against the bench." },
  cable_fly:    { setup: "Cables at shoulder height, soft bend in the elbows.",                       execute: "Sweep handles together in front of chest, squeeze.",                       cue: "Move the handles, not your shoulders. No shrug." },
  pec_deck:     { setup: "Sit upright, forearms or elbows pinned to pads.",                           execute: "Drive pads together in an arc, pause at the peak.",                        cue: "Initiate from the chest, not the arms." },
  dips:         { setup: "Parallel bars, lean torso forward ~30° for chest emphasis.",                execute: "Lower until shoulders drop below elbows, press up.",                       cue: "No bouncing at the bottom." },
  skull:        { setup: "Lie back on bench, EZ-bar held over the face.",                             execute: "Hinge at the elbows to lower bar to forehead, extend back up.",            cue: "Upper arms stay locked vertical." },
  cgbench:      { setup: "Flat bench, hands shoulder-width on the bar.",                              execute: "Lower bar to lower chest with elbows tucked, press up.",                   cue: "Elbows in — this is a tricep focused press." },
  tri_push:     { setup: "Cable bar or rope at top of stack, elbows pinned to ribs.",                 execute: "Push down to lockout, control back to the top.",                           cue: "Only the forearms move — upper arms stay still." },
  tri_oh:       { setup: "Cable rope or DB overhead, elbows pointing up.",                            execute: "Lower behind your head, then press straight back up.",                     cue: "Keep elbows close — don't let them flare." },
  ohp:          { setup: "Bar racked at upper chest, feet shoulder-width, brace hard.",               execute: "Press bar straight overhead, push head through at the top.",               cue: "Squeeze glutes, ribs down. Bar over mid-foot." },
  db_press:     { setup: "Seated with back support, DBs at shoulder height, palms forward.",          execute: "Press up and slightly together, stop just shy of lockout.",                cue: "Wrists stacked, elbows under the dumbbells." },
  arnold:       { setup: "Seated, DBs in front of shoulders, palms facing you.",                      execute: "Press up while rotating, finishing with palms forward overhead.",          cue: "Smooth continuous rotation — no jerk." },

  // ── Pull ─────────────────────────────────────────────────────────────────
  lat_pd:       { setup: "Knees pinned, slight torso lean, full grip on bar.",                        execute: "Pull bar to upper chest, drive elbows down and back.",                     cue: "Lead with elbows. Squeeze lats at the bottom." },
  lat_pd_wide:  { setup: "Hands very wide, thumbs over the bar.",                                     execute: "Pull to upper chest with elbows flared wide.",                             cue: "Imagine pulling the bar apart." },
  lat_pd_close: { setup: "V-handle, neutral close grip.",                                             execute: "Pull to mid-chest, drive elbows behind your back.",                        cue: "Long stretch at the top — full extension." },
  pullups:      { setup: "Hang from bar, hands ~shoulder-width, full extension.",                     execute: "Pull until chin clears the bar, lower with control.",                      cue: "No kipping. Own the descent." },
  sa_pulldown:  { setup: "Single handle, kneel under cable, opposite hand on knee.",                  execute: "Pull handle to side waist, rotating slightly.",                            cue: "Get a full stretch overhead before each rep." },
  tbar:         { setup: "Straddle bar, neutral grip, hinge to ~45°.",                                execute: "Row to lower chest, squeeze shoulder blades together.",                    cue: "Flat back. Hips drive the load." },
  bb_row:       { setup: "Hinge to 45°, bar over mid-foot, grip just outside knees.",                 execute: "Row bar to lower chest, drive elbows back.",                               cue: "Brace hard. Spine doesn't round." },
  db_row:       { setup: "One knee and hand on bench, DB hanging in opposite hand.",                  execute: "Row DB to hip, elbow tracking back along ribs.",                           cue: "Pause and squeeze at the top." },
  meadows:      { setup: "Landmine setup, stand perpendicular, neutral grip.",                        execute: "Row one-handed to hip with a slight torso twist.",                         cue: "Twist for peak contraction at the top." },
  cs_row:       { setup: "Seated, knees soft, V-handle in both hands.",                               execute: "Pull handle to lower abs, chest tall, blades pinched.",                    cue: "Don't lean back to cheat the row." },
  cable_row:    { setup: "Seated, grip your handle, lats engaged.",                                   execute: "Pull elbows past your torso, lengthen on the return.",                     cue: "Full stretch each rep — let the lats load." },
  face_pull:    { setup: "Rope on cable at face height, neutral grip.",                               execute: "Pull rope to face, pinkies back and out.",                                 cue: "Elbows lead. Squeeze rear delts." },
  rev_fly:      { setup: "Hinge at hips, DBs hanging straight down.",                                 execute: "Raise DBs out to your sides with a soft elbow bend.",                      cue: "Squeeze rear delts — don't shrug." },
  bb_curl:      { setup: "Stand tall, bar at thighs, shoulder-width grip.",                           execute: "Curl up, elbows pinned to your sides, lower with control.",                cue: "No swinging. Biceps do the work." },
  db_curl:      { setup: "Stand or sit, DBs at sides, palms forward.",                                execute: "Curl up while supinating, squeeze at the top.",                            cue: "Slow tempo on the way down." },
  hammer:       { setup: "DBs at sides, neutral grip (palms facing in).",                             execute: "Curl up keeping palms inward throughout.",                                 cue: "Targets brachialis and forearm." },
  preacher:     { setup: "Arms locked over preacher pad, bar in hands.",                              execute: "Curl up, then control the negative — don't slam down.",                    cue: "Don't fully extend at the bottom." },
  incline_curl: { setup: "Lie back on incline bench, DBs hanging straight down.",                     execute: "Curl with arms hanging behind the body.",                                  cue: "Maximum stretch on the long head." },

  // ── Shoulders ────────────────────────────────────────────────────────────
  lat_raise:    { setup: "Stand tall, DBs at sides, soft bend in elbows.",                            execute: "Raise DBs to shoulder height with pinky slightly up.",                     cue: "Lead with the elbows, not the hands." },
  cable_lat:    { setup: "Cable across body, low pulley, opposite hand grip.",                        execute: "Raise to shoulder height in an arc.",                                      cue: "Constant tension throughout the ROM." },
  front_raise:  { setup: "DB or plate held in front of thighs.",                                      execute: "Raise to shoulder height with arms straight.",                             cue: "No swinging. Pause briefly at top." },
  upright_row:  { setup: "Bar at thighs, shoulder-width grip.",                                       execute: "Pull bar to upper chest, leading with the elbows.",                        cue: "Stop if shoulders click — switch to high-pull." },
  shrug:        { setup: "Bar at thighs, shoulders relaxed downward.",                                execute: "Shrug shoulders straight up, hold briefly.",                               cue: "Don't roll the shoulders." },
  db_shrug:     { setup: "Heavy DBs at sides, tall posture.",                                         execute: "Shrug straight up, hold for a count.",                                      cue: "Slow tempo, full ROM." },

  // ── Legs ─────────────────────────────────────────────────────────────────
  squat:        { setup: "Bar on traps, feet shoulder-width, toes slightly out.",                     execute: "Sit down between hips, drive up through mid-foot.",                        cue: "Knees track over toes. Chest up." },
  front_sq:     { setup: "Bar in front rack, elbows high, vertical torso.",                           execute: "Squat down, drive up while staying tall.",                                 cue: "Elbows up — don't let the bar drop." },
  hack_sq:      { setup: "In machine, shoulders pinned, feet low and tight.",                         execute: "Squat down deep, drive up through the heels.",                             cue: "Knees forward — heavy quad emphasis." },
  leg_press:    { setup: "Feet shoulder-width on plate, mid-foot.",                                   execute: "Lower until knees ~90°, press through full foot.",                         cue: "Don't lock out — protect knees." },
  leg_press_1:  { setup: "Feet placed high on the plate, wider stance.",                              execute: "Same press, but more glute and hamstring.",                                cue: "Knees push out, not in." },
  bulg_split:   { setup: "Back foot on bench, front leg long, torso upright.",                        execute: "Lower into front leg, drive up through the heel.",                         cue: "Stay tall. Don't push off the back foot." },
  lunges:       { setup: "Standing tall, take a long step forward.",                                  execute: "Lower back knee to floor, push back to start.",                            cue: "Control the descent — no knee crash." },
  step_up:      { setup: "Box at knee height, plant whole foot on top.",                              execute: "Drive through the front heel up to standing.",                             cue: "Don't push off the trailing foot." },
  rdl:          { setup: "Bar at thighs, soft bend in knees.",                                        execute: "Hinge back, bar slides down legs to mid-shin.",                            cue: "Stop where the hamstring stretch peaks." },
  dead:         { setup: "Bar over mid-foot, hinge to grip outside the knees.",                       execute: "Drive the floor away, lock out hips at top.",                              cue: "Bar stays glued to the body." },
  sdl:          { setup: "Like an RDL but stricter knee lock.",                                       execute: "Hinge with straighter legs, deep ham stretch.",                            cue: "Back stays flat — protect lumbar." },
  good_morn:    { setup: "Bar on traps, feet shoulder-width, soft knees.",                            execute: "Hinge forward keeping back flat, return tall.",                            cue: "Light weights only. Form first." },
  hip_thrust:   { setup: "Upper back on bench, bar across hips, feet flat.",                          execute: "Drive hips up to full extension, squeeze glutes.",                         cue: "Chin tucked. Ribs stay down." },
  leg_curl:     { setup: "Lying face down, ankles under pad.",                                        execute: "Curl heels to glutes, squeeze at the top.",                                cue: "Slow eccentric — own the negative." },
  leg_curl_s:   { setup: "Seated, pad on lower shins, thighs locked.",                                execute: "Curl heels under, squeeze hamstrings.",                                    cue: "Don't let weight slam back down." },
  leg_ext:      { setup: "Seated, pad on lower shins, knees aligned with pivot.",                     execute: "Extend knees fully, squeeze quads at top.",                                cue: "Slow controlled tempo." },
  calf_raise:   { setup: "Balls of feet on edge, heels hanging.",                                     execute: "Rise up high, lower into deep stretch.",                                   cue: "Full ROM beats heavy weight." },
  calf_seat:    { setup: "Seated, knees at 90°, pads on knees.",                                      execute: "Press through forefoot to full extension.",                                cue: "Targets the soleus — use lighter weight." },

  // ── Core ─────────────────────────────────────────────────────────────────
  w_situp:      { setup: "Knees bent, feet anchored, weight at chest.",                               execute: "Sit up keeping back relatively straight.",                                 cue: "Don't pull on the neck." },
  roman:        { setup: "Hips pinned in roman chair, body straight.",                                execute: "Lower torso to ~90°, raise back to parallel.",                             cue: "Squeeze glutes — no hyperextension." },
  w_roman:      { setup: "Hold a plate at the chest, slight rotation.",                               execute: "Side bend to engage obliques on each side.",                               cue: "Slow controlled tempo." },
  cable_crunch: { setup: "Kneel facing cable, rope behind the head.",                                 execute: "Crunch chest toward thighs, round the spine.",                             cue: "Hips stay still — abs do the work." },
  ab_wheel:     { setup: "Knees on floor, grip the wheel under shoulders.",                           execute: "Roll out as far as you can control, roll back.",                           cue: "Hips and core tight — no sag." },
  hanging_lr:   { setup: "Hang from a bar, brace your core.",                                         execute: "Raise legs to parallel or higher, lower with control.",                    cue: "No swinging — strict only." },
  dragon:       { setup: "Lying on bench, body straight, gripping behind head.",                      execute: "Lower with full control, raise back to start.",                            cue: "Advanced — only with strict form." },
  pallof:       { setup: "Cable at chest height, perpendicular stance.",                              execute: "Press handle straight out, resist the rotation.",                          cue: "Hips stay square. Brace hard." },
  ghd:          { setup: "Hips pinned on pad, feet anchored.",                                        execute: "Lower torso, raise back to parallel.",                                     cue: "Brace the abs. Don't snap up." },
  plank:        { setup: "Forearms under shoulders, body in a straight line.",                        execute: "Hold the position, breathing steadily.",                                   cue: "Squeeze glutes. No hip sag." },
  side_plank:   { setup: "On side, elbow under shoulder, feet stacked.",                              execute: "Lift hips, hold body straight.",                                           cue: "Don't let hips sag toward the floor." },

  // ── Cardio ───────────────────────────────────────────────────────────────
  run:          { setup: "Comfortable shoes, dynamic warm-up done.",                                  execute: "Steady pace, mid-foot strike, relaxed shoulders.",                         cue: "Breathe rhythmically. Short strides." },
  cycle:        { setup: "Seat at hip height, slight knee bend at bottom of stroke.",                 execute: "Pedal smooth full circles, vary cadence.",                                 cue: "Engage glutes — not just quads." },
  row_erg:      { setup: "Strapped in, knees bent, blade flat.",                                      execute: "Drive: legs → back → arms. Recover: arms → back → legs.",                   cue: "Smooth 1:2 ratio (drive:recovery)." },
  jump_rope:    { setup: "Rope sized to armpits, stand tall.",                                        execute: "Wrists turn the rope, bounce on balls of feet.",                           cue: "Stay light. Soft landings." },
  stair:        { setup: "Steady pace, full foot on each step.",                                      execute: "Drive through heels, don't lean on rails.",                                cue: "Engage glutes — not just calves." },
  assault:      { setup: "Adjust seat, grip handles, brace core.",                                    execute: "Push and pull arms while pedaling.",                                       cue: "Brief intervals work best — go hard then rest." },
  swim:         { setup: "Streamlined position, hips at the surface.",                                execute: "Long strokes, rotate hips, breathe to one side.",                          cue: "Kick from the hips, not the knees." },
  sled_push:    { setup: "Low body angle, hands on the high handles.",                                execute: "Drive through feet with short powerful steps.",                            cue: "Head down. Don't shrug." },
  battle_rope:  { setup: "Athletic stance, slight bend in knees.",                                    execute: "Whip ropes — alternating, waves, or slams.",                               cue: "Stay loose. Power from the hips." },
  hiit:         { setup: "Pick a movement, set work/rest intervals.",                                 execute: "Max effort during work, brief recovery.",                                  cue: "Cool down properly. Nail the form first." },

  // ── Grip ─────────────────────────────────────────────────────────────────
  farmers:      { setup: "Heavy DBs or trap bar, stand tall.",                                        execute: "Walk steady, controlled steps, shoulders back.",                           cue: "Don't shrug — let the traps load passively." },
  dead_hang:    { setup: "Hang from a pull-up bar, full extension.",                                  execute: "Engage shoulders subtly, hold for time.",                                  cue: "Builds grip endurance fast." },
  plate_pinch:  { setup: "Pinch two plates together, smooth side out.",                               execute: "Hold for time. Walk while holding for added challenge.",                   cue: "Thumb does most of the work." },
  wrist_curl:   { setup: "Forearms on bench, bar in hands, palms up.",                                execute: "Let bar roll to fingertips, curl back up using wrist.",                    cue: "Slow controlled — small ROM." },
  rev_curl:     { setup: "Bar at thighs, palms-down (overhand) grip.",                                execute: "Curl bar to chest using wrist extensors and brachioradialis.",             cue: "Elbows pinned. Lighter than a bicep curl." },
  fat_grip:     { setup: "Add fat-grip attachment to DBs or bar.",                                    execute: "Hold or carry for time — every grip muscle works overtime.",               cue: "Dramatic grip builder. Use lighter weight." },

  // ── Neck ─────────────────────────────────────────────────────────────────
  neck_curl:    { setup: "Lying face up on bench, plate on forehead with towel.",                     execute: "Curl head up, chin toward chest, then lower with control.",                cue: "Light weight. Slow tempo." },
  neck_ext:     { setup: "Lying face down, plate on the back of the head.",                           execute: "Extend the head back through full ROM.",                                   cue: "Light weight. Build slowly over weeks." },
  neck_harness: { setup: "Strap harness around the head, weight hanging in front.",                   execute: "Move head through full forward/back ROM.",                                 cue: "Start very light. Build neck slowly." },
  neck_lat:     { setup: "Side-lying on bench, plate held against side of head.",                     execute: "Tilt head against gravity, both sides.",                                   cue: "Light weight, full but pain-free ROM." },
  neck_bridge:  { setup: "Bridge with crown on a soft pad, body straight.",                           execute: "Hold the position. Advanced wrestlers' move.",                             cue: "Stop instantly if you feel any pinching." },
};
