import type { ExerciseDef, ExerciseType, CustomExerciseDef } from "../types";
import type { LucideIcon } from "lucide-react";
import { Dumbbell, ArrowDown, Crosshair, PersonStanding, Flame, Heart, Hand, User, Wrench } from "lucide-react";

export const EM: Record<string, { p: string[]; s: string[] }> = {
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

  // Added push / chest / triceps
  push_up:        { p: ["lower_pec", "upper_pec"],                            s: ["front_delt", "tricep_lat", "upper_abs"] },
  decline_pushup: { p: ["upper_pec", "front_delt"],                           s: ["tricep_lat", "upper_abs"] },
  diamond_pushup: { p: ["tricep_lat", "tricep_med"],                          s: ["lower_pec", "front_delt"] },
  archer_pushup:  { p: ["lower_pec", "upper_pec"],                            s: ["front_delt", "tricep_lat", "oblique"] },
  machine_chest:  { p: ["lower_pec", "upper_pec"],                            s: ["front_delt", "tricep_lat"] },
  smith_bench:    { p: ["lower_pec", "upper_pec"],                            s: ["front_delt", "tricep_lat"] },
  floor_press:    { p: ["lower_pec", "tricep_lat"],                           s: ["tricep_med", "front_delt"] },
  larsen_press:   { p: ["lower_pec", "upper_pec"],                            s: ["front_delt", "tricep_lat"] },
  db_pullover:    { p: ["upper_lat", "lower_pec"],                            s: ["teres_major", "tricep_long"] },
  svend_press:    { p: ["lower_pec", "upper_pec"],                            s: ["front_delt"] },
  tate_press:     { p: ["tricep_lat", "tricep_med"],                          s: ["tricep_long"] },
  jm_press:       { p: ["tricep_lat", "tricep_med"],                          s: ["tricep_long", "lower_pec"] },
  rope_pushdown:  { p: ["tricep_lat", "tricep_med"],                          s: ["tricep_long"] },
  sa_pushdown:    { p: ["tricep_lat", "tricep_med"],                          s: ["tricep_long"] },
  kickback:       { p: ["tricep_lat", "tricep_long"],                         s: ["tricep_med", "rear_delt"] },

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

  // Added pull / back / biceps
  chinups:        { p: ["upper_lat", "lower_lat", "bicep_short"],             s: ["bicep_long", "rear_delt", "teres_major"] },
  neutral_pullup: { p: ["upper_lat", "lower_lat"],                            s: ["brachialis", "bicep_long", "teres_major"] },
  weighted_pull:  { p: ["upper_lat", "lower_lat"],                            s: ["teres_major", "bicep_long", "rear_delt"] },
  inverted_row:   { p: ["rhomboid", "lower_lat"],                             s: ["rear_delt", "bicep_long", "lower_trap"] },
  pendlay_row:    { p: ["lower_lat", "rhomboid", "lower_trap"],               s: ["upper_lat", "rear_delt", "erector"] },
  seal_row:       { p: ["lower_lat", "rhomboid"],                             s: ["lower_trap", "rear_delt", "bicep_long"] },
  machine_row:    { p: ["lower_lat", "rhomboid"],                             s: ["lower_trap", "bicep_short"] },
  kroc_row:       { p: ["lower_lat", "teres_major"],                          s: ["rhomboid", "upper_trap", "bicep_long", "forearm"] },
  straight_arm:   { p: ["lower_lat", "teres_major"],                          s: ["upper_lat", "tricep_long"] },
  machine_pd:     { p: ["upper_lat", "lower_lat"],                            s: ["teres_major", "bicep_long"] },
  cable_curl:     { p: ["bicep_long", "bicep_short"],                         s: ["brachialis", "forearm"] },
  ez_curl:        { p: ["bicep_long", "bicep_short"],                         s: ["brachialis", "forearm"] },
  spider_curl:    { p: ["bicep_short"],                                       s: ["bicep_long", "brachialis"] },
  conc_curl:      { p: ["bicep_short", "bicep_long"],                         s: ["brachialis"] },
  zottman:        { p: ["bicep_long", "brachialis"],                          s: ["forearm", "bicep_short"] },
  drag_curl:      { p: ["bicep_short", "bicep_long"],                         s: ["brachialis"] },

  lat_raise:    { p: ["side_delt"],                                           s: ["upper_trap", "front_delt"] },
  cable_lat:    { p: ["side_delt"],                                           s: ["upper_trap"] },
  front_raise:  { p: ["front_delt"],                                          s: ["side_delt", "upper_pec"] },
  upright_row:  { p: ["side_delt", "upper_trap"],                             s: ["front_delt", "bicep_long"] },
  shrug:        { p: ["upper_trap"],                                          s: ["lower_trap"] },
  db_shrug:     { p: ["upper_trap"],                                          s: ["lower_trap"] },

  // Added shoulders
  mach_lat:       { p: ["side_delt"],                                         s: ["upper_trap"] },
  lean_lat:       { p: ["side_delt"],                                         s: ["upper_trap", "rear_delt"] },
  y_raise:        { p: ["rear_delt", "lower_trap"],                           s: ["side_delt", "rhomboid"] },
  plate_front:    { p: ["front_delt"],                                        s: ["upper_pec", "side_delt"] },
  viking_press:   { p: ["front_delt", "side_delt"],                           s: ["upper_pec", "tricep_lat"] },
  landmine_press: { p: ["front_delt", "side_delt"],                           s: ["upper_pec", "tricep_lat", "upper_trap"] },
  behind_neck:    { p: ["side_delt", "front_delt"],                           s: ["rear_delt", "tricep_lat", "upper_trap"] },
  cuban_press:    { p: ["side_delt", "rear_delt"],                            s: ["upper_trap", "front_delt"] },
  rack_pull:      { p: ["upper_trap", "erector"],                             s: ["lower_lat", "glute_max", "forearm"] },

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

  // Added legs
  goblet_sq:      { p: ["quad_rf", "glute_max"],                              s: ["quad_vl", "quad_vmo", "adductor", "upper_abs"] },
  zercher_sq:     { p: ["quad_rf", "quad_vmo", "glute_max"],                  s: ["quad_vl", "erector", "upper_abs"] },
  box_sq:         { p: ["quad_rf", "glute_max"],                              s: ["quad_vl", "ham_bf", "erector"] },
  pause_sq:       { p: ["quad_rf", "quad_vl", "quad_vmo", "glute_max"],       s: ["ham_bf", "adductor", "erector"] },
  safety_sq:      { p: ["quad_rf", "quad_vl", "glute_max"],                   s: ["quad_vmo", "ham_bf", "erector"] },
  pendulum_sq:    { p: ["quad_rf", "quad_vl", "quad_vmo"],                    s: ["glute_max", "adductor"] },
  sissy_sq:       { p: ["quad_rf", "quad_vmo"],                               s: ["quad_vl"] },
  walking_lunge:  { p: ["quad_rf", "glute_max"],                              s: ["quad_vl", "quad_vmo", "ham_bf", "adductor"] },
  reverse_lunge:  { p: ["glute_max", "ham_bf"],                               s: ["quad_rf", "adductor", "glute_med"] },
  curtsy_lunge:   { p: ["glute_med", "glute_max"],                            s: ["adductor", "quad_rf"] },
  kb_swing:       { p: ["glute_max", "ham_bf"],                               s: ["ham_semi", "erector", "lower_abs"] },
  pull_through:   { p: ["glute_max", "ham_bf"],                               s: ["ham_semi", "erector"] },
  glute_kickback: { p: ["glute_max"],                                         s: ["glute_med", "ham_bf"] },
  single_rdl:     { p: ["ham_bf", "glute_max"],                               s: ["ham_semi", "glute_med", "erector"] },
  nordic_curl:    { p: ["ham_bf", "ham_semi"],                                s: ["gastroc", "glute_max"] },
  abductor_m:     { p: ["glute_med"],                                         s: ["glute_max"] },
  adductor_m:     { p: ["adductor"],                                          s: ["quad_vmo"] },
  donkey_calf:    { p: ["gastroc"],                                           s: ["soleus"] },
  trap_bar_dl:    { p: ["glute_max", "ham_bf", "quad_rf"],                    s: ["erector", "ham_semi", "upper_trap", "forearm"] },
  snatch_dl:      { p: ["ham_bf", "glute_max", "upper_trap", "lower_lat"],    s: ["erector", "rhomboid", "ham_semi"] },
  deficit_dl:     { p: ["ham_bf", "ham_semi", "glute_max", "erector"],        s: ["quad_vl", "upper_trap"] },
  sumo_dl:        { p: ["glute_max", "adductor", "quad_rf"],                  s: ["ham_bf", "erector", "upper_trap"] },
  glute_bridge:   { p: ["glute_max"],                                         s: ["ham_bf", "glute_med"] },
  frog_pump:      { p: ["glute_max"],                                         s: ["glute_med", "adductor"] },

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

  // Added core
  russian_twist:  { p: ["oblique"],                                           s: ["upper_abs", "lower_abs"] },
  bicycle:        { p: ["upper_abs", "oblique"],                              s: ["lower_abs"] },
  dead_bug:       { p: ["lower_abs", "upper_abs"],                            s: ["oblique"] },
  bird_dog:       { p: ["erector"],                                           s: ["glute_max", "rear_delt"] },
  v_up:           { p: ["upper_abs", "lower_abs"],                            s: ["oblique"] },
  l_sit:          { p: ["lower_abs", "upper_abs"],                            s: ["oblique", "quad_rf"] },
  hollow_hold:    { p: ["upper_abs", "lower_abs"],                            s: ["oblique"] },
  mtn_climber:    { p: ["lower_abs", "upper_abs"],                            s: ["oblique", "front_delt", "quad_rf"] },
  copenhagen:     { p: ["adductor", "oblique"],                               s: ["lower_abs"] },
  suitcase_carry: { p: ["oblique", "grip"],                                   s: ["upper_trap", "forearm"] },
  knee_raise:     { p: ["lower_abs"],                                         s: ["upper_abs", "oblique"] },
  woodchop:       { p: ["oblique"],                                           s: ["upper_abs", "lower_abs"] },

  // Grip
  farmers:      { p: ["grip", "forearm"],                                     s: ["upper_trap", "erector"] },
  dead_hang:    { p: ["grip", "forearm"],                                     s: ["upper_lat", "lower_lat"] },
  plate_pinch:  { p: ["grip", "forearm"],                                     s: [] },
  wrist_curl:   { p: ["forearm", "grip"],                                     s: [] },
  rev_curl:     { p: ["forearm", "brachialis"],                               s: ["grip"] },
  fat_grip:     { p: ["grip", "forearm"],                                     s: ["bicep_long"] },
  captains:     { p: ["grip"],                                                s: ["forearm"] },
  towel_pull:   { p: ["grip", "forearm"],                                     s: ["upper_lat", "bicep_long"] },
  thick_hold:   { p: ["grip", "forearm"],                                     s: ["upper_trap"] },
  kb_bottoms:   { p: ["grip", "forearm"],                                     s: ["front_delt", "side_delt"] },

  // Neck
  neck_curl:    { p: ["neck"],                                                s: [] },
  neck_ext:     { p: ["neck"],                                                s: ["upper_trap"] },
  neck_harness: { p: ["neck"],                                                s: ["upper_trap"] },
  neck_lat:     { p: ["neck"],                                                s: [] },
  neck_bridge:  { p: ["neck", "erector"],                                     s: ["upper_trap"] },
  nm_4way:      { p: ["neck"],                                                s: ["upper_trap"] },

  // Cardio
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
  incline_walk: { p: ["gastroc", "glute_max"],                                s: ["quad_rf", "ham_bf", "soleus"] },
  sprint:       { p: ["ham_bf", "quad_rf"],                                   s: ["glute_max", "gastroc"] },
  elliptical:   { p: ["quad_rf", "glute_max"],                                s: ["ham_bf", "gastroc"] },
  ski_erg:      { p: ["upper_lat", "lower_lat"],                              s: ["tricep_long", "upper_abs", "rear_delt"] },
  burpees:      { p: ["quad_rf", "front_delt"],                               s: ["upper_pec", "upper_abs", "glute_max"] },
  shuttle_run:  { p: ["quad_rf", "gastroc"],                                  s: ["ham_bf", "glute_max"] },
  hill_sprint:  { p: ["quad_rf", "glute_max"],                                s: ["ham_bf", "gastroc"] },
  prowler:      { p: ["quad_rf", "glute_max"],                                s: ["ham_bf", "gastroc", "erector"] },
};

export const EX: Record<string, ExerciseDef[]> = {
  Push: [
    { id: "bench",          name: "Bench Press",            type: "strength" },
    { id: "incline_db",     name: "Incline DB Press",       type: "strength" },
    { id: "incline_bar",    name: "Incline Bar Press",      type: "strength" },
    { id: "decline",        name: "Decline Press",          type: "strength" },
    { id: "smith_bench",    name: "Smith Machine Bench",    type: "strength" },
    { id: "machine_chest",  name: "Chest Press Machine",    type: "strength" },
    { id: "floor_press",    name: "Floor Press",            type: "strength" },
    { id: "larsen_press",   name: "Larsen Press",           type: "strength" },
    { id: "cable_fly",      name: "Cable Fly",              type: "strength" },
    { id: "pec_deck",       name: "Pec Deck",               type: "strength" },
    { id: "db_pullover",    name: "DB Pullover",            type: "strength" },
    { id: "svend_press",    name: "Svend Press",            type: "strength" },
    { id: "dips",           name: "Dips",                   type: "strength" },
    { id: "push_up",        name: "Push-up",                type: "strength" },
    { id: "decline_pushup", name: "Decline Push-up",        type: "strength" },
    { id: "diamond_pushup", name: "Diamond Push-up",        type: "strength" },
    { id: "archer_pushup",  name: "Archer Push-up",         type: "strength" },
    { id: "skull",          name: "Skull Crushers",         type: "strength" },
    { id: "cgbench",        name: "Close-Grip Bench",       type: "strength" },
    { id: "tate_press",     name: "Tate Press",             type: "strength" },
    { id: "jm_press",       name: "JM Press",               type: "strength" },
    { id: "tri_push",       name: "Tricep Pushdown",        type: "strength" },
    { id: "rope_pushdown",  name: "Rope Pushdown",          type: "strength" },
    { id: "sa_pushdown",    name: "Single-Arm Pushdown",    type: "strength" },
    { id: "tri_oh",         name: "Overhead Tricep Ext.",   type: "strength" },
    { id: "kickback",       name: "Tricep Kickback",        type: "strength" },
    { id: "ohp",            name: "Overhead Press",         type: "strength" },
    { id: "db_press",       name: "DB Shoulder Press",      type: "strength" },
    { id: "arnold",         name: "Arnold Press",           type: "strength" },
  ],
  Pull: [
    { id: "lat_pd",         name: "Lat Pulldown",           type: "strength" },
    { id: "lat_pd_wide",    name: "Wide-Grip Pulldown",     type: "strength" },
    { id: "lat_pd_close",   name: "Close-Grip Pulldown",    type: "strength" },
    { id: "machine_pd",     name: "Machine Pulldown",       type: "strength" },
    { id: "sa_pulldown",    name: "Single-Arm Pulldown",    type: "strength" },
    { id: "straight_arm",   name: "Straight-Arm Pulldown",  type: "strength" },
    { id: "pullups",        name: "Pull-ups",               type: "strength" },
    { id: "chinups",        name: "Chin-ups",               type: "strength" },
    { id: "neutral_pullup", name: "Neutral-Grip Pull-ups",  type: "strength" },
    { id: "weighted_pull",  name: "Weighted Pull-ups",      type: "strength" },
    { id: "tbar",           name: "T-Bar Row",              type: "strength" },
    { id: "bb_row",         name: "Barbell Row",            type: "strength" },
    { id: "pendlay_row",    name: "Pendlay Row",            type: "strength" },
    { id: "db_row",         name: "DB Row",                 type: "strength" },
    { id: "kroc_row",       name: "Kroc Row",               type: "strength" },
    { id: "meadows",        name: "Meadows Row",            type: "strength" },
    { id: "seal_row",       name: "Seal Row",               type: "strength" },
    { id: "cs_row",         name: "Cable Seated Row",       type: "strength" },
    { id: "cable_row",      name: "Cable Row",              type: "strength" },
    { id: "machine_row",    name: "Machine Row",            type: "strength" },
    { id: "inverted_row",   name: "Inverted Row",           type: "strength" },
    { id: "face_pull",      name: "Face Pull",              type: "strength" },
    { id: "rev_fly",        name: "Reverse Fly",            type: "strength" },
    { id: "bb_curl",        name: "Barbell Curl",           type: "strength" },
    { id: "ez_curl",        name: "EZ-Bar Curl",            type: "strength" },
    { id: "db_curl",        name: "DB Curl",                type: "strength" },
    { id: "cable_curl",     name: "Cable Curl",             type: "strength" },
    { id: "hammer",         name: "Hammer Curl",            type: "strength" },
    { id: "preacher",       name: "Preacher Curl",          type: "strength" },
    { id: "incline_curl",   name: "Incline DB Curl",        type: "strength" },
    { id: "spider_curl",    name: "Spider Curl",            type: "strength" },
    { id: "conc_curl",      name: "Concentration Curl",     type: "strength" },
    { id: "drag_curl",      name: "Drag Curl",              type: "strength" },
    { id: "zottman",        name: "Zottman Curl",           type: "strength" },
  ],
  Shoulders: [
    { id: "lat_raise",      name: "Lateral Raise",           type: "strength" },
    { id: "cable_lat",      name: "Cable Lateral Raise",     type: "strength" },
    { id: "mach_lat",       name: "Machine Lateral Raise",   type: "strength" },
    { id: "lean_lat",       name: "Leaning Lateral Raise",   type: "strength" },
    { id: "front_raise",    name: "Front Raise",             type: "strength" },
    { id: "plate_front",    name: "Plate Front Raise",       type: "strength" },
    { id: "y_raise",        name: "Y-Raise",                 type: "strength" },
    { id: "upright_row",    name: "Upright Row",             type: "strength" },
    { id: "viking_press",   name: "Viking Press",            type: "strength" },
    { id: "landmine_press", name: "Landmine Press",          type: "strength" },
    { id: "behind_neck",    name: "Behind-the-Neck Press",   type: "strength" },
    { id: "cuban_press",    name: "Cuban Press",             type: "strength" },
    { id: "shrug",          name: "Barbell Shrug",           type: "strength" },
    { id: "db_shrug",       name: "DB Shrug",                type: "strength" },
    { id: "rack_pull",      name: "Rack Pull",               type: "strength" },
  ],
  Legs: [
    { id: "squat",          name: "Back Squat",              type: "strength" },
    { id: "front_sq",       name: "Front Squat",             type: "strength" },
    { id: "goblet_sq",      name: "Goblet Squat",            type: "strength" },
    { id: "zercher_sq",     name: "Zercher Squat",           type: "strength" },
    { id: "box_sq",         name: "Box Squat",               type: "strength" },
    { id: "pause_sq",       name: "Paused Squat",            type: "strength" },
    { id: "safety_sq",      name: "Safety-Bar Squat",        type: "strength" },
    { id: "hack_sq",        name: "Hack Squat",              type: "strength" },
    { id: "pendulum_sq",    name: "Pendulum Squat",          type: "strength" },
    { id: "sissy_sq",       name: "Sissy Squat",             type: "strength" },
    { id: "leg_press",      name: "Leg Press",               type: "strength" },
    { id: "leg_press_1",    name: "High-Foot Leg Press",     type: "strength" },
    { id: "bulg_split",     name: "Bulgarian Split Squat",   type: "strength" },
    { id: "lunges",         name: "Lunges",                  type: "strength" },
    { id: "walking_lunge",  name: "Walking Lunge",           type: "strength" },
    { id: "reverse_lunge",  name: "Reverse Lunge",           type: "strength" },
    { id: "curtsy_lunge",   name: "Curtsy Lunge",            type: "strength" },
    { id: "step_up",        name: "Step-Up",                 type: "strength" },
    { id: "rdl",            name: "Romanian Deadlift",       type: "strength" },
    { id: "single_rdl",     name: "Single-Leg RDL",          type: "strength" },
    { id: "dead",           name: "Deadlift",                type: "strength" },
    { id: "sumo_dl",        name: "Sumo Deadlift",           type: "strength" },
    { id: "trap_bar_dl",    name: "Trap-Bar Deadlift",       type: "strength" },
    { id: "snatch_dl",      name: "Snatch-Grip Deadlift",    type: "strength" },
    { id: "deficit_dl",     name: "Deficit Deadlift",        type: "strength" },
    { id: "sdl",            name: "Stiff-Leg Deadlift",      type: "strength" },
    { id: "good_morn",      name: "Good Morning",            type: "strength" },
    { id: "hip_thrust",     name: "Hip Thrust",              type: "strength" },
    { id: "glute_bridge",   name: "Glute Bridge",            type: "strength" },
    { id: "frog_pump",      name: "Frog Pump",               type: "strength" },
    { id: "glute_kickback", name: "Cable Glute Kickback",    type: "strength" },
    { id: "pull_through",   name: "Cable Pull-Through",      type: "strength" },
    { id: "kb_swing",       name: "Kettlebell Swing",        type: "strength" },
    { id: "leg_curl",       name: "Lying Leg Curl",          type: "strength" },
    { id: "leg_curl_s",     name: "Seated Leg Curl",         type: "strength" },
    { id: "nordic_curl",    name: "Nordic Hamstring Curl",   type: "strength" },
    { id: "leg_ext",        name: "Leg Extension",           type: "strength" },
    { id: "abductor_m",     name: "Hip Abductor Machine",    type: "strength" },
    { id: "adductor_m",     name: "Hip Adductor Machine",    type: "strength" },
    { id: "calf_raise",     name: "Standing Calf Raise",     type: "strength" },
    { id: "calf_seat",      name: "Seated Calf Raise",       type: "strength" },
    { id: "donkey_calf",    name: "Donkey Calf Raise",       type: "strength" },
  ],
  Core: [
    { id: "w_situp",        name: "Weighted Sit-up",        type: "strength" },
    { id: "roman",          name: "Back Extension",         type: "strength" },
    { id: "w_roman",        name: "Oblique Ext.",           type: "strength" },
    { id: "cable_crunch",   name: "Cable Crunch",           type: "strength" },
    { id: "ab_wheel",       name: "Ab Wheel",               type: "strength" },
    { id: "hanging_lr",     name: "Hanging Leg Raise",      type: "strength" },
    { id: "knee_raise",     name: "Hanging Knee Raise",     type: "strength" },
    { id: "dragon",         name: "Dragon Flag",            type: "strength" },
    { id: "v_up",           name: "V-Up",                   type: "strength" },
    { id: "bicycle",        name: "Bicycle Crunch",         type: "strength" },
    { id: "russian_twist",  name: "Russian Twist",          type: "strength" },
    { id: "woodchop",       name: "Cable Woodchop",         type: "strength" },
    { id: "pallof",         name: "Pallof Press",           type: "strength" },
    { id: "ghd",            name: "GHD Sit-up",             type: "strength" },
    { id: "dead_bug",       name: "Dead Bug",               type: "timed"    },
    { id: "bird_dog",       name: "Bird Dog",               type: "timed"    },
    { id: "l_sit",          name: "L-Sit",                  type: "timed"    },
    { id: "hollow_hold",    name: "Hollow Hold",            type: "timed"    },
    { id: "mtn_climber",    name: "Mountain Climber",       type: "timed"    },
    { id: "copenhagen",     name: "Copenhagen Plank",       type: "timed"    },
    { id: "suitcase_carry", name: "Suitcase Carry",         type: "timed"    },
    { id: "plank",          name: "Plank",                  type: "timed"    },
    { id: "side_plank",     name: "Side Plank",             type: "timed"    },
  ],
  Grip: [
    { id: "farmers",     name: "Farmer's Carry",          type: "strength" },
    { id: "dead_hang",   name: "Dead Hang",               type: "timed"    },
    { id: "plate_pinch", name: "Plate Pinch",             type: "timed"    },
    { id: "wrist_curl",  name: "Wrist Curl",              type: "strength" },
    { id: "rev_curl",    name: "Reverse Curl",            type: "strength" },
    { id: "fat_grip",    name: "Fat-Grip Hold",           type: "timed"    },
    { id: "captains",    name: "Captains-of-Crush",       type: "strength" },
    { id: "towel_pull",  name: "Towel Pull-up",           type: "strength" },
    { id: "thick_hold",  name: "Thick-Bar Hold",          type: "timed"    },
    { id: "kb_bottoms",  name: "KB Bottoms-Up Hold",      type: "timed"    },
  ],
  Neck: [
    { id: "neck_curl",    name: "Plate Neck Curl",        type: "strength" },
    { id: "neck_ext",     name: "Plate Neck Extension",   type: "strength" },
    { id: "neck_harness", name: "Neck Harness",           type: "strength" },
    { id: "neck_lat",     name: "Lateral Neck Flex",      type: "strength" },
    { id: "nm_4way",      name: "4-Way Neck Machine",     type: "strength" },
    { id: "neck_bridge",  name: "Neck Bridge",            type: "timed"    },
  ],
  Cardio: [
    { id: "run",          name: "Running",                 type: "cardio" },
    { id: "incline_walk", name: "Incline Treadmill Walk",  type: "cardio" },
    { id: "sprint",       name: "Sprints",                 type: "cardio" },
    { id: "hill_sprint",  name: "Hill Sprints",            type: "cardio" },
    { id: "shuttle_run",  name: "Shuttle Run",             type: "cardio" },
    { id: "cycle",        name: "Cycling",                 type: "cardio" },
    { id: "elliptical",   name: "Elliptical",              type: "cardio" },
    { id: "row_erg",      name: "Rowing Erg",              type: "cardio" },
    { id: "ski_erg",      name: "Ski Erg",                 type: "cardio" },
    { id: "jump_rope",    name: "Jump Rope",               type: "cardio" },
    { id: "stair",        name: "Stair Climber",           type: "cardio" },
    { id: "assault",      name: "Assault Bike",            type: "cardio" },
    { id: "swim",         name: "Swimming",                type: "cardio" },
    { id: "sled_push",    name: "Sled Push",               type: "cardio" },
    { id: "prowler",      name: "Prowler Push",            type: "cardio" },
    { id: "battle_rope",  name: "Battle Ropes",            type: "cardio" },
    { id: "burpees",      name: "Burpees",                 type: "cardio" },
    { id: "hiit",         name: "HIIT",                    type: "cardio" },
  ],
};

export const ALL_EX: ExerciseDef[] = Object.entries(EX).flatMap(([cat, exs]) =>
  exs.map(e => ({ ...e, cat }))
);

export const TYPE_COLOR: Record<ExerciseType, string> = {
  strength: "#E8981E",
  cardio:   "#52B788",
  timed:    "#7B9FE0",
};

export const CAT_ICON: Record<string, LucideIcon> = {
  Push:      Dumbbell,
  Pull:      ArrowDown,
  Shoulders: Crosshair,
  Legs:      PersonStanding,
  Core:      Flame,
  Grip:      Hand,
  Neck:      User,
  Cardio:    Heart,
  Custom:    Wrench,
};

// ────────────────────────────────────────────────────────────────────────────
// Custom user-defined exercises. Stored in localStorage and merged into the
// live EM / EX / ALL_EX tables at module load so the rest of the app (search,
// body map, focus suggestions, weekly plan) treats them like built-in entries.

const CUSTOM_STORAGE_KEY    = "gamgee_custom_exercises";
const CUSTOM_CHANGE_EVENT   = "gamgee:custom-exercises-changed";
export const CUSTOM_CATEGORY = "Custom";
const CUSTOM_ID_PREFIX      = "cx_";

export function makeCustomExerciseId(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 24) || "exercise";
  return `${CUSTOM_ID_PREFIX}${slug}_${Date.now().toString(36)}`;
}

export function isCustomExerciseId(id: string): boolean {
  return id.startsWith(CUSTOM_ID_PREFIX);
}

function readCustomFromStorage(): CustomExerciseDef[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function applyCustomToCatalog(customs: CustomExerciseDef[]): void {
  // Strip out any prior custom entries
  Object.keys(EM).forEach(k => { if (isCustomExerciseId(k)) delete EM[k]; });
  Object.keys(EX).forEach(cat => {
    EX[cat] = EX[cat].filter(e => !isCustomExerciseId(e.id));
  });
  if (EX[CUSTOM_CATEGORY] && EX[CUSTOM_CATEGORY].length === 0) delete EX[CUSTOM_CATEGORY];
  for (let i = ALL_EX.length - 1; i >= 0; i--) {
    if (isCustomExerciseId(ALL_EX[i].id)) ALL_EX.splice(i, 1);
  }
  // Add fresh entries
  customs.forEach(c => {
    EM[c.id] = { p: c.primary, s: c.secondary };
    const cat = c.cat || CUSTOM_CATEGORY;
    if (!EX[cat]) EX[cat] = [];
    EX[cat].push({ id: c.id, name: c.name, type: c.type });
    ALL_EX.push({ id: c.id, name: c.name, type: c.type, cat });
  });
}

// Apply once at module init so first render already sees custom exercises.
applyCustomToCatalog(readCustomFromStorage());

export function getCustomExercises(): CustomExerciseDef[] {
  return readCustomFromStorage();
}

export function saveCustomExercise(def: CustomExerciseDef): void {
  const list = readCustomFromStorage().filter(c => c.id !== def.id);
  list.push(def);
  localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(list));
  applyCustomToCatalog(list);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CUSTOM_CHANGE_EVENT));
}

export function deleteCustomExercise(id: string): void {
  const list = readCustomFromStorage().filter(c => c.id !== id);
  localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(list));
  applyCustomToCatalog(list);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CUSTOM_CHANGE_EVENT));
}

export function subscribeCustomExercises(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CUSTOM_CHANGE_EVENT, cb);
  return () => window.removeEventListener(CUSTOM_CHANGE_EVENT, cb);
}
