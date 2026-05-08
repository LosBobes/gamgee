"""
Seed exercise fixtures into the exercises table.
Run with:  python -m app.seed  (from the backend/ directory)
"""

from .database import SessionLocal
from . import models

EXERCISES = [
    # Push
    {"id": "bench",       "name": "Bench Press",           "category": "Push",      "type": "strength", "primary_muscles": ["lower_pec", "upper_pec"],                              "secondary_muscles": ["front_delt", "tricep_lat", "tricep_med"]},
    {"id": "incline_db",  "name": "Incline DB Press",       "category": "Push",      "type": "strength", "primary_muscles": ["upper_pec", "front_delt"],                             "secondary_muscles": ["tricep_lat", "tricep_med"]},
    {"id": "incline_bar", "name": "Incline Bar Press",      "category": "Push",      "type": "strength", "primary_muscles": ["upper_pec", "front_delt"],                             "secondary_muscles": ["tricep_lat", "tricep_med"]},
    {"id": "decline",     "name": "Decline Press",          "category": "Push",      "type": "strength", "primary_muscles": ["lower_pec"],                                           "secondary_muscles": ["tricep_lat", "front_delt"]},
    {"id": "cable_fly",   "name": "Cable Fly",              "category": "Push",      "type": "strength", "primary_muscles": ["lower_pec", "upper_pec"],                              "secondary_muscles": ["front_delt"]},
    {"id": "pec_deck",    "name": "Pec Deck",               "category": "Push",      "type": "strength", "primary_muscles": ["lower_pec", "upper_pec"],                              "secondary_muscles": ["front_delt"]},
    {"id": "dips",        "name": "Dips",                   "category": "Push",      "type": "strength", "primary_muscles": ["lower_pec", "tricep_long"],                            "secondary_muscles": ["front_delt", "tricep_lat"]},
    {"id": "skull",       "name": "Skull Crushers",         "category": "Push",      "type": "strength", "primary_muscles": ["tricep_long", "tricep_lat"],                           "secondary_muscles": ["tricep_med"]},
    {"id": "cgbench",     "name": "Close-Grip Bench",       "category": "Push",      "type": "strength", "primary_muscles": ["tricep_lat", "tricep_med"],                            "secondary_muscles": ["lower_pec", "front_delt"]},
    {"id": "tri_push",    "name": "Tricep Pushdown",        "category": "Push",      "type": "strength", "primary_muscles": ["tricep_lat", "tricep_med"],                            "secondary_muscles": ["tricep_long"]},
    {"id": "tri_oh",      "name": "Overhead Tricep Ext.",   "category": "Push",      "type": "strength", "primary_muscles": ["tricep_long"],                                         "secondary_muscles": ["tricep_lat", "tricep_med"]},
    {"id": "ohp",         "name": "Overhead Press",         "category": "Push",      "type": "strength", "primary_muscles": ["front_delt", "side_delt"],                             "secondary_muscles": ["upper_pec", "tricep_lat", "tricep_med", "upper_trap"]},
    {"id": "db_press",    "name": "DB Shoulder Press",      "category": "Push",      "type": "strength", "primary_muscles": ["front_delt", "upper_pec"],                             "secondary_muscles": ["tricep_lat", "tricep_med"]},
    {"id": "arnold",      "name": "Arnold Press",           "category": "Push",      "type": "strength", "primary_muscles": ["front_delt", "side_delt"],                             "secondary_muscles": ["upper_pec", "tricep_lat"]},
    # Pull
    {"id": "lat_pd",       "name": "Lat Pulldown",          "category": "Pull",      "type": "strength", "primary_muscles": ["upper_lat", "lower_lat"],                              "secondary_muscles": ["teres_major", "bicep_long", "bicep_short", "rear_delt"]},
    {"id": "lat_pd_wide",  "name": "Wide-Grip Pulldown",    "category": "Pull",      "type": "strength", "primary_muscles": ["upper_lat"],                                           "secondary_muscles": ["lower_lat", "teres_major", "rear_delt"]},
    {"id": "lat_pd_close", "name": "Close-Grip Pulldown",   "category": "Pull",      "type": "strength", "primary_muscles": ["lower_lat", "teres_major"],                            "secondary_muscles": ["upper_lat", "bicep_long"]},
    {"id": "pullups",      "name": "Pull-ups",              "category": "Pull",      "type": "strength", "primary_muscles": ["upper_lat", "lower_lat"],                              "secondary_muscles": ["teres_major", "bicep_long", "rear_delt"]},
    {"id": "sa_pulldown",  "name": "Single-Arm Pulldown",   "category": "Pull",      "type": "strength", "primary_muscles": ["upper_lat", "teres_major"],                            "secondary_muscles": ["lower_lat", "bicep_long"]},
    {"id": "tbar",         "name": "T-Bar Row",             "category": "Pull",      "type": "strength", "primary_muscles": ["lower_lat", "rhomboid"],                               "secondary_muscles": ["upper_lat", "teres_major", "bicep_short", "rear_delt"]},
    {"id": "bb_row",       "name": "Barbell Row",           "category": "Pull",      "type": "strength", "primary_muscles": ["lower_lat", "rhomboid", "lower_trap"],                 "secondary_muscles": ["upper_lat", "teres_major", "bicep_long", "rear_delt", "erector"]},
    {"id": "db_row",       "name": "DB Row",                "category": "Pull",      "type": "strength", "primary_muscles": ["lower_lat", "teres_major"],                            "secondary_muscles": ["rhomboid", "upper_lat", "bicep_long", "rear_delt"]},
    {"id": "meadows",      "name": "Meadows Row",           "category": "Pull",      "type": "strength", "primary_muscles": ["lower_lat", "teres_major"],                            "secondary_muscles": ["rhomboid", "upper_lat", "bicep_long"]},
    {"id": "cs_row",       "name": "Cable Seated Row",      "category": "Pull",      "type": "strength", "primary_muscles": ["rhomboid", "lower_trap"],                              "secondary_muscles": ["lower_lat", "rear_delt", "bicep_short"]},
    {"id": "cable_row",    "name": "Cable Row",             "category": "Pull",      "type": "strength", "primary_muscles": ["lower_lat", "rhomboid"],                               "secondary_muscles": ["lower_trap", "bicep_long", "rear_delt"]},
    {"id": "face_pull",    "name": "Face Pull",             "category": "Pull",      "type": "strength", "primary_muscles": ["rear_delt", "lower_trap"],                             "secondary_muscles": ["rhomboid", "side_delt"]},
    {"id": "rev_fly",      "name": "Reverse Fly",           "category": "Pull",      "type": "strength", "primary_muscles": ["rear_delt", "rhomboid"],                               "secondary_muscles": ["lower_trap", "side_delt"]},
    {"id": "bb_curl",      "name": "Barbell Curl",          "category": "Pull",      "type": "strength", "primary_muscles": ["bicep_long", "bicep_short"],                           "secondary_muscles": ["brachialis", "forearm"]},
    {"id": "db_curl",      "name": "DB Curl",               "category": "Pull",      "type": "strength", "primary_muscles": ["bicep_long", "bicep_short"],                           "secondary_muscles": ["brachialis", "forearm"]},
    {"id": "hammer",       "name": "Hammer Curl",           "category": "Pull",      "type": "strength", "primary_muscles": ["brachialis", "bicep_long"],                            "secondary_muscles": ["forearm"]},
    {"id": "preacher",     "name": "Preacher Curl",         "category": "Pull",      "type": "strength", "primary_muscles": ["bicep_short", "bicep_long"],                           "secondary_muscles": ["brachialis"]},
    {"id": "incline_curl", "name": "Incline DB Curl",       "category": "Pull",      "type": "strength", "primary_muscles": ["bicep_long"],                                          "secondary_muscles": ["bicep_short", "brachialis"]},
    # Shoulders
    {"id": "lat_raise",   "name": "Lateral Raise",          "category": "Shoulders", "type": "strength", "primary_muscles": ["side_delt"],                                           "secondary_muscles": ["upper_trap", "front_delt"]},
    {"id": "cable_lat",   "name": "Cable Lateral Raise",    "category": "Shoulders", "type": "strength", "primary_muscles": ["side_delt"],                                           "secondary_muscles": ["upper_trap"]},
    {"id": "front_raise", "name": "Front Raise",            "category": "Shoulders", "type": "strength", "primary_muscles": ["front_delt"],                                          "secondary_muscles": ["side_delt", "upper_pec"]},
    {"id": "upright_row", "name": "Upright Row",            "category": "Shoulders", "type": "strength", "primary_muscles": ["side_delt", "upper_trap"],                             "secondary_muscles": ["front_delt", "bicep_long"]},
    {"id": "shrug",       "name": "Barbell Shrug",          "category": "Shoulders", "type": "strength", "primary_muscles": ["upper_trap"],                                          "secondary_muscles": ["lower_trap"]},
    {"id": "db_shrug",    "name": "DB Shrug",               "category": "Shoulders", "type": "strength", "primary_muscles": ["upper_trap"],                                          "secondary_muscles": ["lower_trap"]},
    # Legs
    {"id": "squat",       "name": "Back Squat",             "category": "Legs",      "type": "strength", "primary_muscles": ["quad_rf", "quad_vl", "quad_vmo", "glute_max"],         "secondary_muscles": ["ham_bf", "ham_semi", "adductor", "erector"]},
    {"id": "front_sq",    "name": "Front Squat",            "category": "Legs",      "type": "strength", "primary_muscles": ["quad_rf", "quad_vmo"],                                 "secondary_muscles": ["quad_vl", "glute_max", "erector"]},
    {"id": "hack_sq",     "name": "Hack Squat",             "category": "Legs",      "type": "strength", "primary_muscles": ["quad_rf", "quad_vl", "quad_vmo"],                     "secondary_muscles": ["glute_max", "ham_bf"]},
    {"id": "leg_press",   "name": "Leg Press",              "category": "Legs",      "type": "strength", "primary_muscles": ["quad_vl", "quad_rf", "glute_max"],                    "secondary_muscles": ["quad_vmo", "ham_bf", "adductor"]},
    {"id": "leg_press_1", "name": "High-Foot Leg Press",    "category": "Legs",      "type": "strength", "primary_muscles": ["quad_vmo", "quad_rf"],                                 "secondary_muscles": ["quad_vl", "glute_max"]},
    {"id": "bulg_split",  "name": "Bulgarian Split Squat",  "category": "Legs",      "type": "strength", "primary_muscles": ["quad_rf", "glute_max"],                               "secondary_muscles": ["quad_vl", "quad_vmo", "ham_bf", "adductor"]},
    {"id": "lunges",      "name": "Lunges",                 "category": "Legs",      "type": "strength", "primary_muscles": ["quad_rf", "glute_max"],                               "secondary_muscles": ["quad_vl", "ham_bf", "adductor"]},
    {"id": "step_up",     "name": "Step-Up",                "category": "Legs",      "type": "strength", "primary_muscles": ["quad_rf", "glute_max"],                               "secondary_muscles": ["quad_vl", "ham_bf"]},
    {"id": "rdl",         "name": "Romanian Deadlift",      "category": "Legs",      "type": "strength", "primary_muscles": ["ham_bf", "ham_semi", "glute_max"],                    "secondary_muscles": ["erector", "adductor", "gastroc"]},
    {"id": "dead",        "name": "Deadlift",               "category": "Legs",      "type": "strength", "primary_muscles": ["ham_bf", "ham_semi", "glute_max", "erector"],         "secondary_muscles": ["quad_vl", "adductor", "upper_trap", "lower_lat"]},
    {"id": "sdl",         "name": "Stiff-Leg Deadlift",     "category": "Legs",      "type": "strength", "primary_muscles": ["ham_bf", "ham_semi"],                                  "secondary_muscles": ["glute_max", "erector"]},
    {"id": "good_morn",   "name": "Good Morning",           "category": "Legs",      "type": "strength", "primary_muscles": ["ham_bf", "erector"],                                   "secondary_muscles": ["glute_max", "ham_semi"]},
    {"id": "hip_thrust",  "name": "Hip Thrust",             "category": "Legs",      "type": "strength", "primary_muscles": ["glute_max", "glute_med"],                              "secondary_muscles": ["ham_bf", "ham_semi", "adductor"]},
    {"id": "leg_curl",    "name": "Lying Leg Curl",         "category": "Legs",      "type": "strength", "primary_muscles": ["ham_bf", "ham_semi"],                                  "secondary_muscles": ["gastroc"]},
    {"id": "leg_curl_s",  "name": "Seated Leg Curl",        "category": "Legs",      "type": "strength", "primary_muscles": ["ham_semi", "ham_bf"],                                  "secondary_muscles": ["gastroc"]},
    {"id": "leg_ext",     "name": "Leg Extension",          "category": "Legs",      "type": "strength", "primary_muscles": ["quad_rf", "quad_vl", "quad_vmo"],                     "secondary_muscles": []},
    {"id": "calf_raise",  "name": "Standing Calf Raise",    "category": "Legs",      "type": "strength", "primary_muscles": ["gastroc"],                                             "secondary_muscles": ["soleus"]},
    {"id": "calf_seat",   "name": "Seated Calf Raise",      "category": "Legs",      "type": "strength", "primary_muscles": ["soleus"],                                              "secondary_muscles": ["gastroc"]},
    # Core
    {"id": "w_situp",      "name": "Weighted Sit-up",       "category": "Core",      "type": "strength", "primary_muscles": ["upper_abs", "lower_abs"],                              "secondary_muscles": ["oblique"]},
    {"id": "roman",        "name": "Back Extension",        "category": "Core",      "type": "strength", "primary_muscles": ["erector"],                                             "secondary_muscles": ["glute_max", "ham_bf"]},
    {"id": "w_roman",      "name": "Oblique Ext.",          "category": "Core",      "type": "strength", "primary_muscles": ["erector", "oblique"],                                  "secondary_muscles": ["glute_max"]},
    {"id": "cable_crunch", "name": "Cable Crunch",          "category": "Core",      "type": "strength", "primary_muscles": ["upper_abs", "lower_abs"],                              "secondary_muscles": ["oblique"]},
    {"id": "ab_wheel",     "name": "Ab Wheel",              "category": "Core",      "type": "strength", "primary_muscles": ["upper_abs", "lower_abs"],                              "secondary_muscles": ["oblique", "erector"]},
    {"id": "hanging_lr",   "name": "Hanging Leg Raise",     "category": "Core",      "type": "strength", "primary_muscles": ["lower_abs", "oblique"],                               "secondary_muscles": ["upper_abs"]},
    {"id": "dragon",       "name": "Dragon Flag",           "category": "Core",      "type": "strength", "primary_muscles": ["upper_abs", "lower_abs", "oblique"],                  "secondary_muscles": ["erector"]},
    {"id": "pallof",       "name": "Pallof Press",          "category": "Core",      "type": "strength", "primary_muscles": ["oblique"],                                             "secondary_muscles": ["upper_abs", "lower_abs"]},
    {"id": "ghd",          "name": "GHD Sit-up",            "category": "Core",      "type": "strength", "primary_muscles": ["erector", "glute_max"],                               "secondary_muscles": ["ham_bf", "upper_abs"]},
    {"id": "plank",        "name": "Plank",                 "category": "Core",      "type": "timed",    "primary_muscles": ["upper_abs", "lower_abs"],                              "secondary_muscles": ["oblique", "erector"]},
    {"id": "side_plank",   "name": "Side Plank",            "category": "Core",      "type": "timed",    "primary_muscles": ["oblique"],                                             "secondary_muscles": ["upper_abs", "lower_abs"]},
    # Cardio
    {"id": "run",         "name": "Running",                "category": "Cardio",    "type": "cardio",   "primary_muscles": ["gastroc", "quad_rf"],                                  "secondary_muscles": ["ham_bf", "glute_max", "soleus"]},
    {"id": "cycle",       "name": "Cycling",                "category": "Cardio",    "type": "cardio",   "primary_muscles": ["quad_rf", "quad_vl"],                                  "secondary_muscles": ["ham_bf", "gastroc", "glute_max"]},
    {"id": "row_erg",     "name": "Rowing Erg",             "category": "Cardio",    "type": "cardio",   "primary_muscles": ["lower_lat", "rhomboid"],                               "secondary_muscles": ["quad_rf", "ham_bf", "erector", "bicep_long"]},
    {"id": "jump_rope",   "name": "Jump Rope",              "category": "Cardio",    "type": "cardio",   "primary_muscles": ["gastroc", "soleus"],                                   "secondary_muscles": ["quad_rf", "ham_bf"]},
    {"id": "stair",       "name": "Stair Climber",          "category": "Cardio",    "type": "cardio",   "primary_muscles": ["quad_rf", "glute_max"],                               "secondary_muscles": ["ham_bf", "gastroc"]},
    {"id": "assault",     "name": "Assault Bike",           "category": "Cardio",    "type": "cardio",   "primary_muscles": ["gastroc", "quad_rf"],                                  "secondary_muscles": ["ham_bf", "glute_max"]},
    {"id": "swim",        "name": "Swimming",               "category": "Cardio",    "type": "cardio",   "primary_muscles": ["upper_lat", "front_delt"],                             "secondary_muscles": ["teres_major", "tricep_long", "rear_delt"]},
    {"id": "sled_push",   "name": "Sled Push",              "category": "Cardio",    "type": "cardio",   "primary_muscles": ["quad_rf", "glute_max"],                               "secondary_muscles": ["ham_bf", "gastroc", "erector"]},
    {"id": "battle_rope", "name": "Battle Ropes",           "category": "Cardio",    "type": "cardio",   "primary_muscles": ["front_delt", "side_delt"],                             "secondary_muscles": ["upper_abs", "lower_abs", "oblique"]},
    {"id": "hiit",        "name": "HIIT",                   "category": "Cardio",    "type": "cardio",   "primary_muscles": ["quad_rf", "gastroc"],                                  "secondary_muscles": ["ham_bf", "glute_max", "upper_abs"]},
]


def seed(db=None):
    own_session = db is None
    if own_session:
        db = SessionLocal()
    try:
        for ex_data in EXERCISES:
            existing = db.query(models.Exercise).filter(models.Exercise.id == ex_data["id"]).first()
            if existing is None:
                db.add(models.Exercise(**ex_data))
        db.commit()
        print(f"Seeded {len(EXERCISES)} exercises.")
    finally:
        if own_session:
            db.close()


if __name__ == "__main__":
    seed()
