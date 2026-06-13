"""Seed content tables from the legacy frontend data files.

`seed_if_empty()` runs on app startup and fills every content table that is
currently empty. Tables that already have rows are left alone so admin edits
are preserved across container restarts.

Run manually with: `python -m app.content_seed`
"""
from __future__ import annotations

from .database import SessionLocal
from . import models
from .seed import EXERCISES as _EXERCISES

# ── Quotes ───────────────────────────────────────────────────────────────────

BRO_QUOTES = [
    "AAaaAAaRGGGh - Arnold Schwarzenegger's secret to lifting 16 plates",
    "The Swoly Bible says: thou shalt not skip leg day.",
    "Welcome to the Church of Iron. Reps are the sermon.",
    "Disciples of the Swoly Bible do not skip leg day. Ever.",
    "The Swoly Bible, Chapter 1: thou art not too tired. Thou art just getting started.",
    "Chickens evolved from dinosaurs, and they were huge, bro. So eat lots of chicken.",
    "I only eat whale. It has three letters in common with swole.",
    "You don't need to train legs. Nobody can see them in the club!",
    "Don't eat sandwiches. The bread blocks the protein.",
    "If you eat sugar, it cancels out the protein.",
    "Sprints release HGH and HGH makes you taller. Expecting 2-3 inches by summer.",
    "Wendy's formulated the Baconator to give sick gains directly to the shoulders.",
    "Whey protein goes around your body zapping fat. That's just how it works.",
    "Bitches can smell squat on you. Always squat before a date.",
    "Every workout is Arm Day. It's always Arm Day.",
    "I don't do cardio because it interferes with my nap time.",
    "You can't spell 'legendary' without 'leg day.' Coincidence? I think not.",
    "The squat rack is my sanctuary. It's where I go to pray for bigger quads.",
    "There's no such thing as overtraining. Just under-consuming protein shakes.",
    "Why drink protein shakes when you can just eat a whole chicken? It's nature's shaker bottle.",
    "Why do yoga when you can lift weights and scream at them? Namaste gains, bro.",
    "Abs are made in the gym, but pizza is made in heaven.",
    "You don't get a pump from doing curls. You get a pump from flexing in the mirror while doing curls.",
    "Sweat is just my muscles crying tears of joy.",
    "The secret to a great physique? 10% genetics, 90% gym selfies.",
    "I don't need pre-workout. I just sniff the chalk and let the gains flow through me.",
    "Cardio? I prefer to call it heart gains.",
    "The iron never lies.",
    "Your comfort zone has zero PRs.",
    "Sweat now, flex later. It's a whole thing.",
    "The only bad workout is the one that didn't happen.",
    "Somewhere out there, someone is warming up with your max.",
    "Pain is weakness leaving the body. Allegedly.",
    "Do you even lift, bro? (This is your sign to lift.)",
    "Every rep is a vote for a bigger, swole-er you. Voter fraud encouraged.",
    "The bar has no memory. It doesn't know you failed last time. Use this against it.",
    "Gainz don't care about your excuses.",
    "Sore today, strong tomorrow, swole eventually.",
    "Your future self is watching. He's absolutely jacked and deeply disappointed.",
    "The gym is the one place you pay to suffer and then beg for more.",
    "Sleep is the original pre-workout.",
    "If it doesn't make you question your life choices, add more weight.",
    "You could be sleeping right now. You chose this instead. Respect.",
    "Progress, not perfection. But also, more plates.",
    "Today's max is next month's warm-up. Terrifying. Beautiful. Let's go.",
    "The only person you're competing with is last week's you. Last week's you was a weakling.",
    "Eat. Lift. Sleep. Repeat. Live forever. (Results may vary.)",
    "Champions train. Everyone else is on Reddit asking if their program is optimal.",
    "Show up ugly, leave sweaty, come back stronger.",
    "You didn't drive to the gym, find parking, and change just to do three sets and leave.",
    "Motivation is unreliable. Discipline is boring. Gains are forever.",
    "Leave nothing in the tank. The tank is the enemy.",
]

PRO_QUOTES = [
    ("Arnold Schwarzenegger", "The last three or four reps is what makes the muscle grow. This area of pain divides the champion from someone who is not a champion."),
    ("Arnold Schwarzenegger", "The mind is the limit. As long as the mind can envision the fact that you can do something, you can do it."),
    ("Arnold Schwarzenegger", "Strength does not come from winning. Your struggles develop your strengths. When you go through hardships and decide not to surrender, that is strength."),
    ("Arnold Schwarzenegger", "You can have results or excuses. Not both."),
    ("Arnold Schwarzenegger", "Pain makes me grow. Growing is what I want. Therefore, for me pain is pleasure."),
    ("Arnold Schwarzenegger", "The day I stop training is the day I die."),
    ("Arnold Schwarzenegger", "The worst thing I can be is the same as everybody else."),
    ("Arnold Schwarzenegger", "Milk is for babies. When you grow up you have to drink beer."),
    ("Arnold Schwarzenegger", "For me, life is continuously being hungry. The meaning of life is not simply to exist, but to move ahead, to achieve, to conquer."),
    ("Arnold Schwarzenegger", "Everybody pities the weak. Jealousy you have to earn."),
    ("Ronnie Coleman", "Everybody wants to be a bodybuilder, but nobody wants to lift no heavy-ass weights."),
    ("Ronnie Coleman", "Ain't nothin' but a peanut."),
    ("Ronnie Coleman", "Light weight, baby! Light weight!"),
    ("Ronnie Coleman", "Yeah, buddy! Lightweight! Nothing to it but to do it."),
    ("Lee Haney", "Exercise to stimulate, not to annihilate. The world wasn't formed in a day, and neither were we. Set small goals and achieve them daily."),
    ("Lee Haney", "Stimulate, don't annihilate."),
    ("Dorian Yates", "A lot of people are afraid of the pain. But pain is your friend. Pain is how the body communicates to the mind that it needs to change."),
    ("Dorian Yates", "The more I train, the more I realize how much I don't know."),
    ("Dorian Yates", "Blood and guts. That's the only way."),
    ("Tom Platz", "The squat is the king of all exercises. Squat deep and squat often."),
    ("Tom Platz", "When the legs get tired, run with your heart."),
    ("Tom Platz", "You have to be willing to be uncomfortable. Only then will you grow."),
    ("Kai Greene", "Thoughts become things. If you see it in your mind, you will hold it in your hand."),
    ("Kai Greene", "Don't count days. Make the days count."),
    ("Kai Greene", "The body achieves what the mind believes."),
    ("Frank Zane", "The body is the costume of the soul."),
    ("Frank Zane", "Think of what you want to look like, then become it."),
    ("Reg Park", "There are no shortcuts. Everything is reps, reps, reps."),
    ("Reg Park", "If you want to be a champion, you must train like one."),
    ("Ed Coan", "You have to believe you can do it. If you believe it, then you can achieve it."),
    ("Ed Coan", "Hard work and consistency will always beat talent."),
    ("Lou Ferrigno", "The competition is not with others. It's with yourself."),
]

GRL_QUOTES = [
    "Girl math: every PR cancels out the previous one, so I'm always at zero.",
    "Girl math: pre-workout was free because I paid in cash three weeks ago.",
    "Girl math: every set under 5 reps is basically a warm-up, so I owe myself more.",
    "Girl math: if the protein shake has fewer calories than the workout burned, it's negative calories.",
    "Girl math: I lifted heavy yesterday so today's heavy is medium, which means today is a deload.",
    "Girl math: the bar weighs 20kg but I'm tired, so emotionally it's 80kg.",
    "Girl math: every gym day is a rest day for someone who didn't go.",
    "Girl math: a Stanley cup of water counts as one set because the lid is heavy.",
    "Girl math: if the gym is on the way to coffee, the coffee is the workout reward AND a pre-workout.",
    "Girl math: 9 reps means 10. The bar can't count.",
    "Girlbossing too close to the sun: pulled up to leg day in heels and a green juice.",
    "Girlbossing too close to the sun: PR'd the squat then cried in the parking lot. Worth it.",
    "Girlbossing too close to the sun: deadlifted my body weight, also forgot to eat breakfast.",
    "Girlbossing too close to the sun: told my therapist about my squat numbers, unprompted.",
    "Girlbossing too close to the sun: scheduled my workout, my journaling, AND my 8-hour sleep — all between 6 and 7am.",
    "Girlbossing too close to the sun: tried to bench press, manifest, and cry — at the same time.",
    "Girlbossing too close to the sun: hit a PR, posted nothing about it, and let the algorithm starve.",
    "Girlbossing too close to the sun: drove 45 minutes for a 12-minute deadlift session. No notes.",
    "Girlbossing too close to the sun: I scheduled rest day on my calendar and color-coded it.",
    "She's not 'just lifting.' She's funding her future self.",
    "You didn't roll out of bed at 6am to do bad sets. Pull yourself together, bestie.",
    "Last week's you didn't think you'd be here. Look at her now.",
    "Every rep is a love letter to the woman you're becoming.",
    "Discipline is the loudest form of self-love. Lift quietly. Glow obnoxiously.",
    "The bar is heavy but so is the weight of underestimating yourself. Pick the lighter one.",
    "Confidence is just lifting heavy things and refusing to apologize for it.",
    "Cardio is great, but spite is better fuel.",
    "Rest is also girlbossing. The recovery is the strategy.",
    "She's soft. She's strong. She's also benching her bodyweight. The duality is iconic.",
    "Glow up loading… patience, bestie.",
    "Slay the set, snack, slay another set. The cycle is the magic.",
    "Manifesting heavier weights and lighter days.",
    "Plot twist: she was the protagonist all along.",
    "Out-train the algorithm. It can't recommend self-respect, but the gym can.",
    "Cute fits, heavy lifts, no notes.",
    "Make the bar your accessory.",
    "Eras change. The dedication doesn't.",
    "If she can lift it, she will. If she can't, she's about to.",
    "She's not lifting heavy things. She's putting her doubts down.",
    "Romanticize the reps. Glamorize the grind.",
    "Power is quiet. So are heavy singles done correctly.",
    "Soft launch the comeback. Hard launch the PR.",
    "She didn't drive to the gym in traffic to half-rep. Full range or full retreat.",
    "Hot girls hydrate. Hot girls also deadlift. The Venn diagram is a circle.",
    "Self-care is a 6am squat session and a vanilla latte after.",
    "Your aura is on the leaderboard, bestie. Earn it.",
    "Hype woman of your own life. Loud at every rep.",
    "She's not a 'gym girl.' She's a woman with goals and a barbell.",
    "Strong women aren't born. They're forged. With chalk on their hands.",
    "Outwork the doubt. Out-lift the excuses.",
    "Champions and main characters both train hard. You can be both, bestie.",
    "Today's max is next month's warm-up. The math is mathing.",
    "Sleep is the original glow serum. Get yours.",
    "Discipline is unsexy. Results are not. Trade accepted.",
    "Show up ugly, leave glowing, come back stronger.",
    "Every rep is a vote for the woman you're becoming. Vote often.",
]

HERO_CALLS_BRO = [
    ("LET'S", "WORK"), ("LET'S", "GO"), ("LET'S", "CRUSH IT"),
    ("TIME TO", "GRIND"), ("TIME TO", "TRAIN"), ("GET", "AFTER IT"),
    ("NO DAYS", "OFF"), ("EARN IT", "TODAY"), ("SHOW", "UP"),
    ("LET'S CRUSH", "SOME PRs"), ("MAKE IT", "COUNT"), ("PUT IN", "THE WORK"),
    ("FEEL THE", "GAINS"), ("SWOLE", "SEASON"), ("THE IRON", "AWAITS"),
    ("HOLY", "GAINZ"), ("CHAPEL", "OF IRON"), ("WITNESS", "ME"),
    ("SEND", "IT"), ("TODAY WE", "FEAST"), ("GLORY", "AWAITS"),
    ("WE DO NOT", "SKIP"), ("IRON", "NEVER LIES"), ("NOTHING BUT", "A PEANUT"),
    ("LIGHT", "WEIGHT"), ("YEAH", "BUDDY"),
]

HERO_CALLS_GRL = [
    ("LET'S GO", "BESTIE"), ("TIME TO", "SLAY"), ("GLOW", "UP"),
    ("MAIN", "CHARACTER"), ("SOFT", "LAUNCH"), ("MANIFEST", "IT"),
    ("HEAVY", "ERA"), ("VILLAIN", "ORIGIN"), ("GIRL", "BOSS"),
    ("EAT", "THAT"), ("HYPE", "WOMAN"), ("LIFT", "PRETTY"),
    ("SHOW", "OUT"), ("IT GIRL", "ERA"), ("RUN", "THE WORLD"),
    ("NO BAD", "SETS"), ("ATE", "AND LEFT"), ("BUILT", "DIFFERENT"),
    ("IRON", "GLOW"), ("POWER", "MOVES"),
]


# ── Tips ─────────────────────────────────────────────────────────────────────

TIPS = [
    {"id": "rest", "icon": "Timer", "title": "Rest Between Sets",
     "body": "Compounds: 2–4 min. Isolation: 60–90 sec. More rest = more output per set.",
     "body_bro": "Compounds: 2–4 min. Isolation: 60–90 sec. Yes, that long. More rest = more output per set. Scrolling counts.",
     "body_grl": "Compounds: 2–4 min. Isolation: 60–90 sec. Rest is also girlbossing. Scroll, hydrate, lift."},
    {"id": "overload", "icon": "TrendingUp", "title": "Progressive Overload",
     "body": "Add weight only when you hit the top of your rep range across all sets. Reps first, then weight.",
     "body_bro": "Only add weight when you've owned the top of your rep range across all sets. Reps first, then weight. There are no shortcuts, only plates.",
     "body_grl": "Add weight only when you've owned every rep in your range. Reps first, then weight. No shortcuts, only glow-ups."},
    {"id": "protein", "icon": "Beef", "title": "Protein Intake",
     "body": "1.6–2.2g per kg bodyweight daily. Spread across meals, ~30–50g per sitting for best uptake.",
     "body_bro": "1.6–2.2g per kg bodyweight daily. Spread it across meals, ~30–50g per sitting. Chicken, eggs, protein shakes. Repeat forever. The Swoly Bible demands it.",
     "body_grl": "1.6–2.2g per kg bodyweight daily. Spread across meals, ~30–50g per sitting. Protein girl-dinner is still a girl-dinner. Hit the number, bestie."},
    {"id": "sleep", "icon": "Moon", "title": "Sleep",
     "body": "7–9 hours non-negotiable. Growth hormone peaks in deep sleep. No training trick compensates for sleep debt.",
     "body_bro": "7–9 hours. Non-negotiable. Growth hormone peaks in deep sleep. No supplement, no training hack, nothing compensates for sleeping like a corpse.",
     "body_grl": "7–9 hours. Non-negotiable. Sleep is the original glow serum and growth hormone peaks while you're in it. No serum, no supplement compares."},
    {"id": "deload", "icon": "RefreshCw", "title": "Deload Weeks",
     "body": "Every 4–8 weeks, drop to 60–70% intensity for one week. You come back stronger, not weaker.",
     "body_bro": "Every 4–8 weeks, drop to 60–70% intensity for one week. Feels like cheating. You'll come back and absolutely smash it. Trust the process.",
     "body_grl": "Every 4–8 weeks, drop to 60–70% intensity for a week. Feels like cheating. You'll come back glowing. The deload is the strategy."},
    {"id": "hydration", "icon": "Droplets", "title": "Hydration",
     "body": "2% dehydration = ~6% strength loss. Drink before and during training, especially on cardio days.",
     "body_bro": "Just 2% dehydration = ~6% strength drop. Drink before and during training. Water is literally free gains. Stop sleeping on it.",
     "body_grl": "Just 2% dehydration = ~6% strength drop. Hot girls hydrate. The Stanley is your training partner. No excuses."},
    {"id": "form", "icon": "Target", "title": "Form > Weight",
     "body": "Slow the eccentric, feel the target muscle, full range of motion. Every single rep.",
     "body_bro": "Slow the eccentric, feel the target muscle, full range of motion. Every. Single. Rep. Ego lifting is how you become a cautionary tale.",
     "body_grl": "Slow the eccentric, feel the target muscle, full range of motion. Every. Single. Rep. Ego lifting is not the move, bestie."},
    {"id": "cardio", "icon": "HeartPulse", "title": "Cardio + Strength",
     "body": "2–3 sessions/week under 30–40 min improves recovery and work capacity without eating muscle.",
     "body_bro": "2–3 sessions/week under 30–40 min improves recovery and work capacity without eating your gains. Your heart is a muscle too, bro.",
     "body_grl": "2–3 sessions/week under 30–40 min builds recovery and stamina without nuking your gains. Hot girl walks count too."},
]


# ── Focuses ──────────────────────────────────────────────────────────────────

FOCUSES = [
    {"id": "push", "name": "Push Day", "icon": "Dumbbell", "description": "Chest · Shoulders · Triceps",
     "exercise_ids": ["bench", "incline_db", "incline_bar", "decline", "smith_bench", "machine_chest", "floor_press", "larsen_press",
                      "cable_fly", "pec_deck", "db_pullover", "svend_press", "dips", "push_up", "decline_pushup", "diamond_pushup", "archer_pushup",
                      "ohp", "db_press", "arnold", "viking_press", "landmine_press", "behind_neck",
                      "lat_raise", "cable_lat", "mach_lat", "lean_lat", "front_raise", "plate_front", "upright_row",
                      "skull", "cgbench", "tate_press", "jm_press", "tri_push", "rope_pushdown", "sa_pushdown", "tri_oh", "kickback"]},
    {"id": "pull", "name": "Pull Day", "icon": "ArrowDown", "description": "Back · Rear Delts · Biceps",
     "exercise_ids": ["lat_pd", "lat_pd_wide", "lat_pd_close", "machine_pd", "sa_pulldown", "straight_arm",
                      "pullups", "chinups", "neutral_pullup", "weighted_pull",
                      "tbar", "bb_row", "pendlay_row", "db_row", "kroc_row", "meadows", "seal_row",
                      "cs_row", "cable_row", "machine_row", "inverted_row",
                      "face_pull", "rev_fly", "y_raise", "cuban_press", "rack_pull", "shrug", "db_shrug",
                      "bb_curl", "ez_curl", "db_curl", "cable_curl", "hammer", "preacher", "incline_curl",
                      "spider_curl", "conc_curl", "drag_curl", "zottman"]},
    {"id": "legs", "name": "Leg Day", "icon": "PersonStanding", "description": "Quads · Hamstrings · Glutes",
     "exercise_ids": ["squat", "front_sq", "goblet_sq", "zercher_sq", "box_sq", "pause_sq", "safety_sq",
                      "hack_sq", "pendulum_sq", "sissy_sq", "leg_press", "leg_press_1",
                      "bulg_split", "lunges", "walking_lunge", "reverse_lunge", "curtsy_lunge", "step_up",
                      "rdl", "single_rdl", "dead", "sumo_dl", "trap_bar_dl", "sdl", "good_morn",
                      "hip_thrust", "glute_bridge", "frog_pump", "glute_kickback", "pull_through", "kb_swing",
                      "leg_curl", "leg_curl_s", "nordic_curl", "leg_ext", "abductor_m", "adductor_m",
                      "calf_raise", "calf_seat", "donkey_calf"]},
    {"id": "upper", "name": "Upper Body", "icon": "ChevronsUp", "description": "Full upper push & pull",
     "exercise_ids": ["bench", "incline_db", "machine_chest", "cable_fly", "dips", "push_up",
                      "ohp", "db_press", "arnold", "landmine_press",
                      "lat_raise", "front_raise", "upright_row", "shrug",
                      "lat_pd", "pullups", "chinups", "tbar", "bb_row", "db_row", "cable_row", "face_pull", "rev_fly",
                      "skull", "cgbench", "tri_push", "tri_oh",
                      "bb_curl", "ez_curl", "db_curl", "hammer", "preacher"]},
    {"id": "lower", "name": "Lower Body", "icon": "ChevronsDown", "description": "Full lower compound work",
     "exercise_ids": ["squat", "front_sq", "goblet_sq", "hack_sq", "pause_sq", "leg_press", "bulg_split", "lunges", "walking_lunge", "step_up",
                      "rdl", "single_rdl", "dead", "sumo_dl", "trap_bar_dl", "sdl", "good_morn",
                      "hip_thrust", "glute_bridge", "glute_kickback", "pull_through", "kb_swing",
                      "leg_curl", "leg_curl_s", "nordic_curl", "leg_ext", "abductor_m", "adductor_m",
                      "calf_raise", "calf_seat", "donkey_calf", "roman"]},
    {"id": "full", "name": "Full Body", "icon": "Zap", "description": "Hit everything in one session",
     "exercise_ids": ["bench", "incline_db", "ohp", "dips", "push_up",
                      "lat_pd", "pullups", "bb_row", "face_pull",
                      "squat", "rdl", "dead", "hip_thrust", "bulg_split",
                      "lat_raise", "bb_curl", "hammer", "skull", "tri_push",
                      "plank", "hanging_lr", "ab_wheel", "farmers", "kb_swing", "burpees"]},
    {"id": "core", "name": "Core Focus", "icon": "Flame", "description": "Abs · Lower back · Stability",
     "exercise_ids": ["w_situp", "cable_crunch", "ab_wheel", "v_up", "bicycle", "russian_twist",
                      "hanging_lr", "knee_raise", "dragon", "l_sit", "hollow_hold",
                      "woodchop", "pallof", "ghd", "dead_bug", "bird_dog", "mtn_climber",
                      "copenhagen", "suitcase_carry", "plank", "side_plank",
                      "roman", "w_roman"]},
]


# ── Muscles ──────────────────────────────────────────────────────────────────

MUSCLES = [
    ("neck", "Neck", "Neck"), ("grip", "Hand / Grip", "Grip"),
    ("upper_pec", "Upper Chest", "Chest"), ("lower_pec", "Lower Chest", "Chest"),
    ("front_delt", "Front Delt", "Shoulders"), ("side_delt", "Side Delt", "Shoulders"),
    ("rear_delt", "Rear Delt", "Shoulders"),
    ("upper_trap", "Upper Traps", "Back"), ("lower_trap", "Lower Traps", "Back"),
    ("rhomboid", "Rhomboids", "Back"), ("upper_lat", "Upper Lats", "Back"),
    ("lower_lat", "Lower Lats", "Back"), ("teres_major", "Teres Major", "Back"),
    ("erector", "Erectors", "Back"),
    ("bicep_long", "Biceps (Outer)", "Biceps"), ("bicep_short", "Biceps (Inner)", "Biceps"),
    ("brachialis", "Brachialis", "Biceps"),
    ("tricep_long", "Triceps (Long)", "Triceps"), ("tricep_lat", "Triceps (Lat.)", "Triceps"),
    ("tricep_med", "Triceps (Med.)", "Triceps"),
    ("forearm", "Forearms", "Arms"),
    ("upper_abs", "Upper Abs", "Core"), ("lower_abs", "Lower Abs", "Core"),
    ("oblique", "Obliques", "Core"),
    ("glute_max", "Glute Max", "Glutes"), ("glute_med", "Glute Med", "Glutes"),
    ("quad_rf", "Rectus Femoris", "Quads"), ("quad_vl", "Vastus Lateralis", "Quads"),
    ("quad_vmo", "VMO", "Quads"),
    ("adductor", "Adductors", "Legs"),
    ("ham_bf", "Biceps Femoris", "Hamstrings"), ("ham_semi", "Semitendinosus", "Hamstrings"),
    ("gastroc", "Gastrocnemius", "Calves"), ("soleus", "Soleus", "Calves"),
]


# ── Stretches ────────────────────────────────────────────────────────────────

STRETCHES = [
    ("Chest", "Doorway Pec Stretch", 30, True, "Forearm on doorframe, step through, feel the chest open."),
    ("Chest", "Floor Pec Opener", 30, True, "Lie face down, arm out to side at 90°, roll body away."),
    ("Back", "Child's Pose", 45, False, "Sit back on heels, arms reach long, breathe into the lats."),
    ("Back", "Cat–Cow", 30, False, "On all fours, alternate arching and rounding the spine."),
    ("Back", "Lat Hang", 30, True, "Hold a sturdy rail, lean away to lengthen one lat."),
    ("Shoulders", "Cross-Body Shoulder Stretch", 30, True, "Pull arm across chest with the opposite hand."),
    ("Shoulders", "Sleeper Stretch", 30, True, "Lying on side, internally rotate the top arm gently."),
    ("Biceps", "Wall Bicep Stretch", 30, True, "Palm on wall behind you, rotate body away."),
    ("Triceps", "Overhead Tricep Stretch", 30, True, "Reach behind head, gently press elbow with other hand."),
    ("Arms", "Wrist Flexor Stretch", 20, True, "Arm out, palm up, gently pull fingers down with other hand."),
    ("Arms", "Wrist Extensor Stretch", 20, True, "Arm out, palm down, gently pull fingers down with other hand."),
    ("Grip", "Prayer Stretch", 30, False, "Palms together at chest, lower hands to feel the forearms open."),
    ("Grip", "Finger Extension Pull", 20, True, "Pull each finger gently back, opening the palm and grip muscles."),
    ("Neck", "Lateral Neck Stretch", 25, True, "Tilt ear toward shoulder, gently weight the head with one hand."),
    ("Neck", "Chin Tuck + Hold", 20, False, "Pull chin straight back (no tilt), hold to lengthen the back of neck."),
    ("Neck", "Levator Scapulae Stretch", 25, True, "Look toward your armpit, gently guide head with same-side hand."),
    ("Core", "Cobra Stretch", 30, False, "Lie on stomach, press up onto hands, lengthen the abs."),
    ("Core", "Standing Side Bend", 25, True, "Reach one arm overhead, bend sideways, feel the obliques open."),
    ("Quads", "Standing Quad Stretch", 30, True, "Pull heel to glute, knees together, hips slightly forward."),
    ("Quads", "Couch Stretch", 45, True, "Back foot up on bench, kneel, hips forward. Heavy stretch."),
    ("Hamstrings", "Seated Forward Fold", 45, False, "Legs straight, hinge at hips, reach toward toes."),
    ("Hamstrings", "Single-Leg Hamstring Stretch", 30, True, "Foot up on a low bench, hinge forward over the leg."),
    ("Glutes", "Pigeon Pose", 45, True, "Front shin across mat, hips square, sink forward."),
    ("Glutes", "Figure-4 Stretch", 30, True, "Lying on back, ankle on opposite knee, pull thigh toward chest."),
    ("Calves", "Wall Calf Stretch", 30, True, "Hands on wall, back leg straight, heel down. Gastroc stretch."),
    ("Calves", "Bent-Knee Wall Calf", 30, True, "Same setup but bend the back knee. Targets the soleus."),
    ("Legs", "Adductor Stretch", 30, True, "Wide stance, shift weight to one side, sit into the hip."),
    ("Legs", "Frog Stretch", 45, False, "On all fours, knees wide, sit hips back gently."),
]


# ── Exercise info ────────────────────────────────────────────────────────────

EXERCISE_INFO = {
    "bench":        ("Flat bench, eyes under the bar, grip slightly wider than shoulders.", "Lower bar to mid-chest with control, drive feet down and press up.", "Wrists stacked over elbows. Shoulder blades pinned."),
    "incline_db":   ("Bench at ~30°, dumbbells at shoulder height, palms forward.", "Press up and slightly together until almost locked out.", "Don't flare elbows past 75° from torso."),
    "incline_bar":  ("Bench at 30–45°, grip slightly wider than shoulders.", "Lower bar to upper chest, press straight up.", "Tuck elbows on the descent, it protects the shoulders."),
    "decline":      ("Decline bench, secure feet, grip standard width.", "Lower bar to lower chest, press up and slightly back.", "Stay tight against the bench."),
    "cable_fly":    ("Cables at shoulder height, soft bend in the elbows.", "Sweep handles together in front of chest, squeeze.", "Move the handles, not your shoulders. No shrug."),
    "pec_deck":     ("Sit upright, forearms or elbows pinned to pads.", "Drive pads together in an arc, pause at the peak.", "Initiate from the chest, not the arms."),
    "dips":         ("Parallel bars, lean torso forward ~30° for chest emphasis.", "Lower until shoulders drop below elbows, press up.", "No bouncing at the bottom."),
    "assisted_dips":("Assisted-dip machine, knees on the pad, hands on parallel bars.", "Lower under control until shoulders pass elbows, then press up.", "Less assist over time — the goal is unassisted dips."),
    "skull":        ("Lie back on bench, EZ-bar held over the face.", "Hinge at the elbows to lower bar to forehead, extend back up.", "Upper arms stay locked vertical."),
    "cgbench":      ("Flat bench, hands shoulder-width on the bar.", "Lower bar to lower chest with elbows tucked, press up.", "Elbows in. This is a tricep-focused press."),
    "tri_push":     ("Cable bar or rope at top of stack, elbows pinned to ribs.", "Push down to lockout, control back to the top.", "Only the forearms move. Upper arms stay still."),
    "tri_oh":       ("Cable rope or DB overhead, elbows pointing up.", "Lower behind your head, then press straight back up.", "Keep elbows close, don't let them flare."),
    "ohp":          ("Bar racked at upper chest, feet shoulder-width, brace hard.", "Press bar straight overhead, push head through at the top.", "Squeeze glutes, ribs down. Bar over mid-foot."),
    "db_press":     ("Seated with back support, DBs at shoulder height, palms forward.", "Press up and slightly together, stop just shy of lockout.", "Wrists stacked, elbows under the dumbbells."),
    "arnold":       ("Seated, DBs in front of shoulders, palms facing you.", "Press up while rotating, finishing with palms forward overhead.", "Smooth continuous rotation, no jerking."),
    "lat_pd":       ("Knees pinned, slight torso lean, full grip on bar.", "Pull bar to upper chest, drive elbows down and back.", "Lead with elbows. Squeeze lats at the bottom."),
    "lat_pd_wide":  ("Hands very wide, thumbs over the bar.", "Pull to upper chest with elbows flared wide.", "Imagine pulling the bar apart."),
    "lat_pd_close": ("V-handle, neutral close grip.", "Pull to mid-chest, drive elbows behind your back.", "Long stretch at the top. Full extension."),
    "pullups":      ("Hang from bar, hands ~shoulder-width, full extension.", "Pull until chin clears the bar, lower with control.", "No kipping. Own the descent."),
    "assisted_pullups": ("Assisted-pull machine, knees on the pad, overhand grip on the bar.", "Pull chin over the bar, lower with control to full hang.", "Drop the assist gradually — that's the progression."),
    "assisted_chinups": ("Assisted-pull machine, knees on the pad, supinated (palms-toward-you) grip.", "Pull chin over the bar, biceps driving, lower with control.", "Squeeze the biceps at the top. Less assist each block."),
    "sa_pulldown":  ("Single handle, kneel under cable, opposite hand on knee.", "Pull handle to side waist, rotating slightly.", "Get a full stretch overhead before each rep."),
    "tbar":         ("Straddle bar, neutral grip, hinge to ~45°.", "Row to lower chest, squeeze shoulder blades together.", "Flat back. Hips drive the load."),
    "bb_row":       ("Hinge to 45°, bar over mid-foot, grip just outside knees.", "Row bar to lower chest, drive elbows back.", "Brace hard. Spine doesn't round."),
    "db_row":       ("One knee and hand on bench, DB hanging in opposite hand.", "Row DB to hip, elbow tracking back along ribs.", "Pause and squeeze at the top."),
    "meadows":      ("Landmine setup, stand perpendicular, neutral grip.", "Row one-handed to hip with a slight torso twist.", "Twist for peak contraction at the top."),
    "cs_row":       ("Seated, knees soft, V-handle in both hands.", "Pull handle to lower abs, chest tall, blades pinched.", "Don't lean back to cheat the row."),
    "cable_row":    ("Seated, grip your handle, lats engaged.", "Pull elbows past your torso, lengthen on the return.", "Full stretch each rep, let the lats load."),
    "face_pull":    ("Rope on cable at face height, neutral grip.", "Pull rope to face, pinkies back and out.", "Elbows lead. Squeeze rear delts."),
    "rev_fly":      ("Hinge at hips, DBs hanging straight down.", "Raise DBs out to your sides with a soft elbow bend.", "Squeeze rear delts, don't shrug."),
    "bb_curl":      ("Stand tall, bar at thighs, shoulder-width grip.", "Curl up, elbows pinned to your sides, lower with control.", "No swinging. Biceps do the work."),
    "db_curl":      ("Stand or sit, DBs at sides, palms forward.", "Curl up while supinating, squeeze at the top.", "Slow tempo on the way down."),
    "hammer":       ("DBs at sides, neutral grip (palms facing in).", "Curl up keeping palms inward throughout.", "Targets brachialis and forearm."),
    "preacher":     ("Arms locked over preacher pad, bar in hands.", "Curl up, then control the negative. Don't slam down.", "Don't fully extend at the bottom."),
    "incline_curl": ("Lie back on incline bench, DBs hanging straight down.", "Curl with arms hanging behind the body.", "Maximum stretch on the long head."),
    "lat_raise":    ("Stand tall, DBs at sides, soft bend in elbows.", "Raise DBs to shoulder height with pinky slightly up.", "Lead with the elbows, not the hands."),
    "cable_lat":    ("Cable across body, low pulley, opposite hand grip.", "Raise to shoulder height in an arc.", "Constant tension throughout the ROM."),
    "front_raise":  ("DB or plate held in front of thighs.", "Raise to shoulder height with arms straight.", "No swinging. Pause briefly at top."),
    "upright_row":  ("Bar at thighs, shoulder-width grip.", "Pull bar to upper chest, leading with the elbows.", "Stop if shoulders click and switch to a high-pull."),
    "shrug":        ("Bar at thighs, shoulders relaxed downward.", "Shrug shoulders straight up, hold briefly.", "Don't roll the shoulders."),
    "db_shrug":     ("Heavy DBs at sides, tall posture.", "Shrug straight up, hold for a count.", "Slow tempo, full ROM."),
    "squat":        ("Bar on traps, feet shoulder-width, toes slightly out.", "Sit down between hips, drive up through mid-foot.", "Knees track over toes. Chest up."),
    "front_sq":     ("Bar in front rack, elbows high, vertical torso.", "Squat down, drive up while staying tall.", "Elbows up, don't let the bar drop."),
    "hack_sq":      ("In machine, shoulders pinned, feet low and tight.", "Squat down deep, drive up through the heels.", "Knees forward. Heavy quad emphasis."),
    "leg_press":    ("Feet shoulder-width on plate, mid-foot.", "Lower until knees ~90°, press through full foot.", "Don't lock out fully, protect those knees."),
    "leg_press_1":  ("Feet placed high on the plate, wider stance.", "Same press, but more glute and hamstring.", "Knees push out, not in."),
    "bulg_split":   ("Back foot on bench, front leg long, torso upright.", "Lower into front leg, drive up through the heel.", "Stay tall. Don't push off the back foot."),
    "lunges":       ("Standing tall, take a long step forward.", "Lower back knee to floor, push back to start.", "Control the descent, no knee crash."),
    "step_up":      ("Box at knee height, plant whole foot on top.", "Drive through the front heel up to standing.", "Don't push off the trailing foot."),
    "rdl":          ("Bar at thighs, soft bend in knees.", "Hinge back, bar slides down legs to mid-shin.", "Stop where the hamstring stretch peaks."),
    "dead":         ("Bar over mid-foot, hinge to grip outside the knees.", "Drive the floor away, lock out hips at top.", "Bar stays glued to the body."),
    "sdl":          ("Like an RDL but stricter knee lock.", "Hinge with straighter legs, deep ham stretch.", "Back stays flat. Protect the lumbar."),
    "good_morn":    ("Bar on traps, feet shoulder-width, soft knees.", "Hinge forward keeping back flat, return tall.", "Light weights only. Form first."),
    "hip_thrust":   ("Upper back on bench, bar across hips, feet flat.", "Drive hips up to full extension, squeeze glutes.", "Chin tucked. Ribs stay down."),
    "leg_curl":     ("Lying face down, ankles under pad.", "Curl heels to glutes, squeeze at the top.", "Slow eccentric, own the negative."),
    "leg_curl_s":   ("Seated, pad on lower shins, thighs locked.", "Curl heels under, squeeze hamstrings.", "Don't let weight slam back down."),
    "leg_ext":      ("Seated, pad on lower shins, knees aligned with pivot.", "Extend knees fully, squeeze quads at top.", "Slow controlled tempo."),
    "calf_raise":   ("Balls of feet on edge, heels hanging.", "Rise up high, lower into deep stretch.", "Full ROM beats heavy weight."),
    "calf_seat":    ("Seated, knees at 90°, pads on knees.", "Press through forefoot to full extension.", "Targets the soleus. Use lighter weight."),
    "w_situp":      ("Knees bent, feet anchored, weight at chest.", "Sit up keeping back relatively straight.", "Don't pull on the neck."),
    "roman":        ("Hips pinned in roman chair, body straight.", "Lower torso to ~90°, raise back to parallel.", "Squeeze glutes, no hyperextension."),
    "w_roman":      ("Hold a plate at the chest, slight rotation.", "Side bend to engage obliques on each side.", "Slow controlled tempo."),
    "cable_crunch": ("Kneel facing cable, rope behind the head.", "Crunch chest toward thighs, round the spine.", "Hips stay still, abs do the work."),
    "ab_wheel":     ("Knees on floor, grip the wheel under shoulders.", "Roll out as far as you can control, roll back.", "Hips and core tight, no sag."),
    "hanging_lr":   ("Hang from a bar, brace your core.", "Raise legs to parallel or higher, lower with control.", "No swinging. Strict form only."),
    "dragon":       ("Lying on bench, body straight, gripping behind head.", "Lower with full control, raise back to start.", "Advanced movement. Strict form only."),
    "pallof":       ("Cable at chest height, perpendicular stance.", "Press handle straight out, resist the rotation.", "Hips stay square. Brace hard."),
    "ghd":          ("Hips pinned on pad, feet anchored.", "Lower torso, raise back to parallel.", "Brace the abs. Don't snap up."),
    "plank":        ("Forearms under shoulders, body in a straight line.", "Hold the position, breathing steadily.", "Squeeze glutes. No hip sag."),
    "side_plank":   ("On side, elbow under shoulder, feet stacked.", "Lift hips, hold body straight.", "Don't let hips sag toward the floor."),
    "run":          ("Comfortable shoes, dynamic warm-up done.", "Steady pace, mid-foot strike, relaxed shoulders.", "Breathe rhythmically. Short strides."),
    "cycle":        ("Seat at hip height, slight knee bend at bottom of stroke.", "Pedal smooth full circles, vary cadence.", "Engage glutes, not just quads."),
    "row_erg":      ("Strapped in, knees bent, blade flat.", "Drive: legs, back, arms. Recover: arms, back, legs.", "Smooth 1:2 ratio (drive:recovery)."),
    "jump_rope":    ("Rope sized to armpits, stand tall.", "Wrists turn the rope, bounce on balls of feet.", "Stay light. Soft landings."),
    "stair":        ("Steady pace, full foot on each step.", "Drive through heels, don't lean on rails.", "Engage glutes, not just calves."),
    "assault":      ("Adjust seat, grip handles, brace core.", "Push and pull arms while pedaling.", "Brief intervals work best. Go hard then rest."),
    "swim":         ("Streamlined position, hips at the surface.", "Long strokes, rotate hips, breathe to one side.", "Kick from the hips, not the knees."),
    "sled_push":    ("Low body angle, hands on the high handles.", "Drive through feet with short powerful steps.", "Head down. Don't shrug."),
    "battle_rope":  ("Athletic stance, slight bend in knees.", "Whip ropes: alternating, waves, or slams.", "Stay loose. Power from the hips."),
    "hiit":         ("Pick a movement, set work/rest intervals.", "Max effort during work, brief recovery.", "Cool down properly. Nail the form first."),
    "farmers":      ("Heavy DBs or trap bar, stand tall.", "Walk steady, controlled steps, shoulders back.", "Don't shrug. Let the traps load passively."),
    "dead_hang":    ("Hang from a pull-up bar, full extension.", "Engage shoulders subtly, hold for time.", "Builds grip endurance fast."),
    "plate_pinch":  ("Pinch two plates together, smooth side out.", "Hold for time. Walk while holding for added challenge.", "Thumb does most of the work."),
    "wrist_curl":   ("Forearms on bench, bar in hands, palms up.", "Let bar roll to fingertips, curl back up using wrist.", "Slow and controlled, small ROM."),
    "rev_curl":     ("Bar at thighs, palms-down (overhand) grip.", "Curl bar to chest using wrist extensors and brachioradialis.", "Elbows pinned. Lighter than a bicep curl."),
    "fat_grip":     ("Add fat-grip attachment to DBs or bar.", "Hold or carry for time. Every grip muscle works overtime.", "Dramatic grip builder. Use lighter weight."),
    "neck_curl":    ("Lying face up on bench, plate on forehead with towel.", "Curl head up, chin toward chest, then lower with control.", "Light weight. Slow tempo."),
    "neck_ext":     ("Lying face down, plate on the back of the head.", "Extend the head back through full ROM.", "Light weight. Build slowly over weeks."),
    "neck_harness": ("Strap harness around the head, weight hanging in front.", "Move head through full forward/back ROM.", "Start very light. Build neck slowly."),
    "neck_lat":     ("Side-lying on bench, plate held against side of head.", "Tilt head against gravity, both sides.", "Light weight, full but pain-free ROM."),
    "neck_bridge":  ("Bridge with crown on a soft pad, body straight.", "Hold the position. Advanced wrestlers' move.", "Stop instantly if you feel any pinching."),
}


# ── Metric defs ──────────────────────────────────────────────────────────────

METRIC_DEFS = [
    ("weight", "Body Weight", "kg", "#6366f1", 0.1, 30, 300),
    ("body_fat", "Body Fat", "%", "#f59e0b", 0.1, 3, 60),
    ("waist", "Waist", "cm", "#10b981", 0.5, 50, 200),
    ("chest", "Chest", "cm", "#3b82f6", 0.5, 50, 200),
    ("hips", "Hips", "cm", "#ec4899", 0.5, 50, 200),
    ("bicep", "Bicep", "cm", "#8b5cf6", 0.5, 20, 70),
    ("thigh", "Thigh", "cm", "#f97316", 0.5, 30, 100),
    ("resting_hr", "Resting HR", "bpm", "#ef4444", 1, 30, 120),
    ("zinc", "Zinc Intake", "mg", "#71717a", 0.5, 0, 100),
]


# ── Week days ────────────────────────────────────────────────────────────────

WEEK_DAYS = [
    ("mon", "Monday", "MON"), ("tue", "Tuesday", "TUE"),
    ("wed", "Wednesday", "WED"), ("thu", "Thursday", "THU"),
    ("fri", "Friday", "FRI"), ("sat", "Saturday", "SAT"),
    ("sun", "Sunday", "SUN"),
]


# ── Body-map shapes ──────────────────────────────────────────────────────────
# We store the male/female silhouettes and the front/back muscle ellipse maps
# as one JSON blob each so admins can edit a whole layer in one shot.

MALE_BODY_PATH = (
    "M 43,22 C 38,25 26,29 18,36 C 13,38 11,43 11,50 C 11,60 12,71 13,82 "
    "C 13,92 13,99 13,104 C 11,114 13,120 16,120 C 19,120 21,114 19,104 "
    "C 19,98 19,90 20,82 C 21,72 22,62 24,52 C 25,57 30,64 34,72 "
    "C 33,80 30,86 29,91 C 28,98 28,108 28,118 C 28,128 29,138 30,146 "
    "C 29,154 27,162 28,170 L 28,176 C 31,178 37,178 41,176 L 41,170 "
    "C 42,160 43,148 43,138 C 44,128 45,118 45,108 C 45,102 45,98 44,93 "
    "L 56,93 C 55,98 55,102 55,108 C 55,118 56,128 57,138 C 57,148 58,160 59,170 "
    "L 59,176 C 63,178 69,178 72,176 L 72,170 C 73,162 71,154 70,146 "
    "C 71,138 72,128 72,118 C 72,108 72,98 71,91 C 70,86 67,80 66,72 "
    "C 70,64 75,57 76,52 C 78,62 79,72 80,82 C 81,90 81,98 81,104 "
    "C 79,114 81,120 84,120 C 87,120 89,114 87,104 C 87,99 87,92 87,82 "
    "C 88,71 89,60 89,50 C 89,43 87,38 82,36 C 74,29 62,25 57,22 Z"
)

FEMALE_BODY_PATH = (
    "M 44,22 C 39,25 28,30 22,36 C 18,38 15,43 15,50 C 15,60 15,71 15,82 "
    "C 15,92 15,99 15,104 C 13,114 15,120 18,120 C 21,120 23,114 21,104 "
    "C 21,98 21,90 22,82 C 23,72 24,62 27,52 C 28,57 33,61 37,67 "
    "C 35,75 28,84 23,92 C 22,98 22,108 22,118 C 22,128 23,138 24,146 "
    "C 23,154 22,162 24,170 L 23,176 C 26,178 33,178 39,176 L 39,170 "
    "C 40,160 41,148 41,138 C 42,128 42,118 42,108 C 42,102 42,98 41,93 "
    "L 59,93 C 58,98 58,102 58,108 C 58,118 58,128 59,138 C 59,148 60,160 61,170 "
    "L 61,176 C 67,178 74,178 77,176 L 76,170 C 78,162 77,154 76,146 "
    "C 77,138 78,128 78,118 C 78,108 78,98 77,92 C 72,84 65,75 63,67 "
    "C 67,61 72,57 73,52 C 76,62 77,72 78,82 C 79,90 79,98 79,104 "
    "C 77,114 79,120 82,120 C 85,120 87,114 85,104 C 85,99 85,92 85,82 "
    "C 85,71 85,60 85,50 C 85,43 82,38 78,36 C 72,30 61,25 56,22 Z"
)

# Front and back muscle ellipses live as plain JSON dicts. We keep the same
# shape that `MuscleShape` uses in the TS types (mid, cx/cy/rx/ry or d, rotate).
FRONT_MUSCLE_SHAPES = [
    {"mid": "neck", "cx": 50, "cy": 26, "rx": 5, "ry": 3},
    {"mid": "front_delt", "cx": 22, "cy": 42, "rx": 7, "ry": 7},
    {"mid": "front_delt", "cx": 78, "cy": 42, "rx": 7, "ry": 7},
    {"mid": "side_delt",  "cx": 14, "cy": 44, "rx": 4, "ry": 6},
    {"mid": "side_delt",  "cx": 86, "cy": 44, "rx": 4, "ry": 6},
    {"mid": "upper_pec", "d": "M 48,30 C 41,28 28,32 22,38 C 21,41 22,45 25,46 C 33,45 41,43 48,40 Z"},
    {"mid": "upper_pec", "d": "M 52,30 C 59,28 72,32 78,38 C 79,41 78,45 75,46 C 67,45 59,43 52,40 Z"},
    {"mid": "lower_pec", "d": "M 48,40 C 41,43 33,45 25,46 C 22,48 21,52 23,54 C 32,57 42,55 48,53 Z"},
    {"mid": "lower_pec", "d": "M 52,40 C 59,43 67,45 75,46 C 78,48 79,52 77,54 C 68,57 58,55 52,53 Z"},
    {"mid": "bicep_long",  "cx": 15, "cy": 58, "rx": 4, "ry": 10},
    {"mid": "bicep_long",  "cx": 85, "cy": 58, "rx": 4, "ry": 10},
    {"mid": "bicep_short", "cx": 18, "cy": 64, "rx": 3, "ry": 8},
    {"mid": "bicep_short", "cx": 82, "cy": 64, "rx": 3, "ry": 8},
    {"mid": "brachialis",  "cx": 14, "cy": 74, "rx": 3, "ry": 6},
    {"mid": "brachialis",  "cx": 86, "cy": 74, "rx": 3, "ry": 6},
    {"mid": "forearm", "cx": 15, "cy": 92, "rx": 3, "ry": 12},
    {"mid": "forearm", "cx": 85, "cy": 92, "rx": 3, "ry": 12},
    {"mid": "grip", "cx": 16, "cy": 112, "rx": 4, "ry": 6},
    {"mid": "grip", "cx": 84, "cy": 112, "rx": 4, "ry": 6},
    {"mid": "upper_abs", "cx": 50, "cy": 58, "rx": 9, "ry": 7},
    {"mid": "lower_abs", "cx": 50, "cy": 70, "rx": 8, "ry": 7},
    {"mid": "oblique", "cx": 30, "cy": 65, "rx": 6, "ry": 11, "rotate": -22},
    {"mid": "oblique", "cx": 70, "cy": 65, "rx": 6, "ry": 11, "rotate": 22},
    {"mid": "quad_vl",  "cx": 33, "cy": 110, "rx": 5, "ry": 18},
    {"mid": "quad_vl",  "cx": 67, "cy": 110, "rx": 5, "ry": 18},
    {"mid": "quad_rf",  "cx": 38, "cy": 108, "rx": 4, "ry": 20},
    {"mid": "quad_rf",  "cx": 62, "cy": 108, "rx": 4, "ry": 20},
    {"mid": "quad_vmo", "cx": 40, "cy": 134, "rx": 4, "ry": 7},
    {"mid": "quad_vmo", "cx": 60, "cy": 134, "rx": 4, "ry": 7},
    {"mid": "adductor", "cx": 43, "cy": 110, "rx": 3, "ry": 16},
    {"mid": "adductor", "cx": 57, "cy": 110, "rx": 3, "ry": 16},
    {"mid": "gastroc",  "cx": 33, "cy": 156, "rx": 5, "ry": 9},
    {"mid": "gastroc",  "cx": 67, "cy": 156, "rx": 5, "ry": 9},
]

BACK_MUSCLE_SHAPES = [
    {"mid": "neck", "cx": 50, "cy": 26, "rx": 5, "ry": 3},
    {"mid": "upper_trap", "d": "M 50,24 C 44,26 32,30 22,36 L 21,40 C 26,43 35,45 43,46 C 47,45 50,42 50,38 Z"},
    {"mid": "upper_trap", "d": "M 50,24 C 56,26 68,30 78,36 L 79,40 C 74,43 65,45 57,46 C 53,45 50,42 50,38 Z"},
    {"mid": "lower_trap", "d": "M 50,38 C 48,42 45,46 40,48 C 34,50 28,54 30,60 C 34,64 40,64 45,60 C 48,56 50,50 50,42 Z"},
    {"mid": "lower_trap", "d": "M 50,38 C 52,42 55,46 60,48 C 66,50 72,54 70,60 C 66,64 60,64 55,60 C 52,56 50,50 50,42 Z"},
    {"mid": "rear_delt", "cx": 22, "cy": 40, "rx": 6, "ry": 7},
    {"mid": "rear_delt", "cx": 78, "cy": 40, "rx": 6, "ry": 7},
    {"mid": "side_delt", "cx": 14, "cy": 42, "rx": 4, "ry": 6},
    {"mid": "side_delt", "cx": 86, "cy": 42, "rx": 4, "ry": 6},
    {"mid": "rhomboid", "cx": 43, "cy": 42, "rx": 6, "ry": 7},
    {"mid": "rhomboid", "cx": 57, "cy": 42, "rx": 6, "ry": 7},
    {"mid": "upper_lat", "d": "M 50,48 C 44,48 33,50 25,56 C 21,62 21,68 23,74 L 28,74 C 31,68 35,62 41,58 C 45,54 49,52 50,50 Z"},
    {"mid": "upper_lat", "d": "M 50,48 C 56,48 67,50 75,56 C 79,62 79,68 77,74 L 72,74 C 69,68 65,62 59,58 C 55,54 51,52 50,50 Z"},
    {"mid": "lower_lat", "d": "M 30,72 C 26,74 24,78 26,82 C 28,85 33,85 35,81 C 35,77 33,73 30,72 Z"},
    {"mid": "lower_lat", "d": "M 70,72 C 74,74 76,78 74,82 C 72,85 67,85 65,81 C 65,77 67,73 70,72 Z"},
    {"mid": "teres_major", "cx": 23, "cy": 44, "rx": 5, "ry": 6, "rotate": -15},
    {"mid": "teres_major", "cx": 77, "cy": 44, "rx": 5, "ry": 6, "rotate": 15},
    {"mid": "erector", "cx": 45, "cy": 60, "rx": 4, "ry": 14},
    {"mid": "erector", "cx": 55, "cy": 60, "rx": 4, "ry": 14},
    {"mid": "tricep_long", "cx": 16, "cy": 56, "rx": 4, "ry": 10},
    {"mid": "tricep_long", "cx": 84, "cy": 56, "rx": 4, "ry": 10},
    {"mid": "tricep_lat",  "cx": 14, "cy": 66, "rx": 3, "ry": 8},
    {"mid": "tricep_lat",  "cx": 86, "cy": 66, "rx": 3, "ry": 8},
    {"mid": "tricep_med",  "cx": 13, "cy": 75, "rx": 3, "ry": 6},
    {"mid": "tricep_med",  "cx": 87, "cy": 75, "rx": 3, "ry": 6},
    {"mid": "glute_max", "d": "M 48,72 C 40,70 28,73 26,82 C 24,90 28,96 36,98 C 42,98 46,95 48,90 L 48,76 Z"},
    {"mid": "glute_max", "d": "M 52,72 C 60,70 72,73 74,82 C 76,90 72,96 64,98 C 58,98 54,95 52,90 L 52,76 Z"},
    {"mid": "glute_med", "cx": 28, "cy": 78, "rx": 7, "ry": 7, "rotate": -10},
    {"mid": "glute_med", "cx": 72, "cy": 78, "rx": 7, "ry": 7, "rotate": 10},
    {"mid": "ham_bf",   "cx": 33, "cy": 116, "rx": 6, "ry": 18},
    {"mid": "ham_bf",   "cx": 67, "cy": 116, "rx": 6, "ry": 18},
    {"mid": "ham_semi", "cx": 41, "cy": 118, "rx": 4, "ry": 16},
    {"mid": "ham_semi", "cx": 59, "cy": 118, "rx": 4, "ry": 16},
    {"mid": "gastroc", "cx": 34, "cy": 154, "rx": 6, "ry": 9},
    {"mid": "gastroc", "cx": 66, "cy": 154, "rx": 6, "ry": 9},
    {"mid": "soleus",  "cx": 34, "cy": 166, "rx": 4, "ry": 5},
    {"mid": "soleus",  "cx": 66, "cy": 166, "rx": 4, "ry": 5},
    {"mid": "grip", "cx": 16, "cy": 112, "rx": 4, "ry": 6},
    {"mid": "grip", "cx": 84, "cy": 112, "rx": 4, "ry": 6},
]

FRONT_LINES = [
    "M 46,28 C 38,30 28,33 22,37",
    "M 54,28 C 62,30 72,33 78,37",
    "M 50,30 L 50,57",
    "M 50,57 L 50,80",
    "M 26,46 C 33,52 41,54 48,54",
    "M 74,46 C 67,52 59,54 52,54",
    "M 43,62 Q 50,64 57,62",
    "M 43,68 Q 50,70 57,68",
    "M 38,108 C 37,120 35,135 34,143",
    "M 62,108 C 63,120 65,135 66,143",
    "M 34,144 C 32,148 32,152 35,153 C 38,154 42,153 43,151 C 44,148 43,144 40,143",
    "M 66,144 C 68,148 68,152 65,153 C 62,154 58,153 57,151 C 56,148 57,144 60,143",
]

BACK_LINES = [
    "M 50,30 C 50,46 50,60 50,72",
    "M 28,92 C 36,96 44,98 50,99 C 56,98 64,96 72,92",
    "M 41,100 L 39,140",
    "M 59,100 L 61,140",
    "M 33,148 C 31,156 30,162 30,166",
    "M 67,148 C 69,156 70,162 70,166",
]

BODYMAP_SHAPES = [
    ("male_silhouette",   {"path": MALE_BODY_PATH}),
    ("female_silhouette", {"path": FEMALE_BODY_PATH}),
    ("front_muscles",     {"shapes": FRONT_MUSCLE_SHAPES}),
    ("back_muscles",      {"shapes": BACK_MUSCLE_SHAPES}),
    ("front_lines",       {"paths": FRONT_LINES}),
    ("back_lines",        {"paths": BACK_LINES}),
]


# ── Exercise motions ─────────────────────────────────────────────────────────
# Each motion is a Python dict that JSON-serialises directly into the
# ExerciseMotion.frames JSONB column. The renderer ignores any unknown keys,
# so the new `rig` config + per-frame `parts` extension are forward-compatible.

STAND = {
    "head":     [50, 20], "neck":     [50, 30], "shoulder": [50, 35],
    "elbow":    [50, 60], "hand":     [50, 85],
    "hip":      [50, 85], "knee":     [50, 115], "ankle":    [50, 140], "toe": [60, 140],
}


def _pose(**over) -> dict:
    p = dict(STAND); p.update(over); return p


# Each motion: (exercise_id, name, category, duration, bench, floor, rig, frames)
# `rig` controls the new rig features. Defaults:
#   {"feet": "oval", "arm2": "mirror", "leg2": "mirror"}  for symmetric stances
#   {"feet": "oval", "arm2": "none",   "leg2": "none"}    for single-side / lying
MOTIONS = [
    ("squat", "Back squat", "Legs", 3000, False, True,
     {"feet": "oval", "arm2": "mirror", "leg2": "mirror"}, [
        {"t": 0.0,  "pose": _pose(elbow=[56, 50], hand=[54, 35]), "bar": [50, 30]},
        {"t": 0.25, "pose": {"head":[46,32],"neck":[47,41],"shoulder":[48,49],"elbow":[55,64],"hand":[52,50],"hip":[44,98],"knee":[56,116],"ankle":[50,140],"toe":[60,140]}, "bar": [48, 44]},
        {"t": 0.5,  "pose": {"head":[40,48],"neck":[43,56],"shoulder":[46,64],"elbow":[54,78],"hand":[50,65],"hip":[34,112],"knee":[60,117],"ankle":[50,140],"toe":[60,140]}, "bar": [47, 59]},
        {"t": 0.75, "pose": {"head":[46,32],"neck":[47,41],"shoulder":[48,49],"elbow":[55,64],"hand":[52,50],"hip":[44,98],"knee":[56,116],"ankle":[50,140],"toe":[60,140]}, "bar": [48, 44]},
        {"t": 1.0,  "pose": _pose(elbow=[56, 50], hand=[54, 35]), "bar": [50, 30]},
     ]),
    ("bb_curl", "Barbell curl", "Pull", 1800, False, True,
     {"feet": "oval", "arm2": "mirror", "leg2": "mirror"}, [
        {"t": 0.0, "pose": _pose(elbow=[50,60], hand=[53,85]), "bar": [53, 85]},
        {"t": 0.5, "pose": _pose(shoulder=[49,36], elbow=[49,60], hand=[61,38]), "bar": [61, 38]},
        {"t": 1.0, "pose": _pose(elbow=[50,60], hand=[53,85]), "bar": [53, 85]},
     ]),
    ("bench", "Bench press", "Push", 2200, True, False,
     {"feet": "oval", "arm2": "mirror", "leg2": "mirror"}, [
        {"t": 0.0, "pose": {"head":[80,78],"neck":[73,81],"shoulder":[68,83],"elbow":[68,59],"hand":[68,35],"hip":[42,86],"knee":[27,104],"ankle":[27,138],"toe":[16,138]}, "bar": [68, 35]},
        {"t": 0.5, "pose": {"head":[80,80],"neck":[73,81],"shoulder":[68,83],"elbow":[50,62],"hand":[62,78],"hip":[42,86],"knee":[27,104],"ankle":[27,138],"toe":[16,138]}, "bar": [62, 78]},
        {"t": 1.0, "pose": {"head":[80,78],"neck":[73,81],"shoulder":[68,83],"elbow":[68,59],"hand":[68,35],"hip":[42,86],"knee":[27,104],"ankle":[27,138],"toe":[16,138]}, "bar": [68, 35]},
     ]),
    ("ohp", "Overhead press", "Push", 2000, False, True,
     {"feet": "oval", "arm2": "mirror", "leg2": "mirror"}, [
        {"t": 0.0, "pose": _pose(elbow=[44,46], hand=[50,35]), "bar": [50, 35]},
        {"t": 0.5, "pose": _pose(shoulder=[50,36], elbow=[50,22], hand=[50,6]), "bar": [50, 6]},
        {"t": 1.0, "pose": _pose(elbow=[44,46], hand=[50,35]), "bar": [50, 35]},
     ]),
    ("push_up", "Push-up", "Push", 1800, False, True,
     {"feet": "oval", "arm2": "mirror", "leg2": "mirror"}, [
        {"t": 0.0, "pose": {"head":[82,96],"neck":[74,99],"shoulder":[68,102],"elbow":[70,119],"hand":[70,138],"hip":[40,104],"knee":[18,108],"ankle":[-2,112],"toe":[-2,120]}},
        {"t": 0.5, "pose": {"head":[82,128],"neck":[74,129],"shoulder":[68,130],"elbow":[56,132],"hand":[70,138],"hip":[40,130],"knee":[18,132],"ankle":[-2,134],"toe":[-2,120]}},
        {"t": 1.0, "pose": {"head":[82,96],"neck":[74,99],"shoulder":[68,102],"elbow":[70,119],"hand":[70,138],"hip":[40,104],"knee":[18,108],"ankle":[-2,112],"toe":[-2,120]}},
     ]),
    ("dips", "Dips", "Push", 2200, False, False,
     {"feet": "oval", "arm2": "mirror", "leg2": "mirror"}, [
        {"t": 0.0, "pose": {"head":[55,35],"neck":[54,45],"shoulder":[53,53],"elbow":[62,65],"hand":[60,90],"hip":[46,95],"knee":[50,120],"ankle":[42,138],"toe":[52,138]}},
        {"t": 0.5, "pose": {"head":[55,60],"neck":[54,70],"shoulder":[53,78],"elbow":[42,88],"hand":[60,90],"hip":[46,116],"knee":[50,140],"ankle":[42,156],"toe":[52,156]}},
        {"t": 1.0, "pose": {"head":[55,35],"neck":[54,45],"shoulder":[53,53],"elbow":[62,65],"hand":[60,90],"hip":[46,95],"knee":[50,120],"ankle":[42,138],"toe":[52,138]}},
     ]),
    ("tri_push", "Tricep pushdown", "Push", 1600, False, True,
     {"feet": "oval", "arm2": "mirror", "leg2": "mirror"}, [
        {"t": 0.0, "pose": _pose(elbow=[50,60], hand=[60,50])},
        {"t": 0.5, "pose": _pose(elbow=[50,60], hand=[54,85])},
        {"t": 1.0, "pose": _pose(elbow=[50,60], hand=[60,50])},
     ]),
    ("pullups", "Pull-up", "Pull", 2400, False, False,
     {"feet": "oval", "arm2": "mirror", "leg2": "mirror"}, [
        {"t": 0.0, "pose": {"head":[50,50],"neck":[50,60],"shoulder":[50,67],"elbow":[54,47],"hand":[56,24],"hip":[50,115],"knee":[55,138],"ankle":[55,156],"toe":[62,156]}},
        {"t": 0.5, "pose": {"head":[50,30],"neck":[50,40],"shoulder":[50,48],"elbow":[40,36],"hand":[56,24],"hip":[50,96],"knee":[55,120],"ankle":[55,140],"toe":[62,140]}},
        {"t": 1.0, "pose": {"head":[50,50],"neck":[50,60],"shoulder":[50,67],"elbow":[54,47],"hand":[56,24],"hip":[50,115],"knee":[55,138],"ankle":[55,156],"toe":[62,156]}},
     ]),
    ("bb_row", "Bent-over row", "Pull", 2000, False, True,
     {"feet": "oval", "arm2": "mirror", "leg2": "mirror"}, [
        {"t": 0.0, "pose": {"head":[70,60],"neck":[64,65],"shoulder":[58,70],"elbow":[56,95],"hand":[58,118],"hip":[38,80],"knee":[46,110],"ankle":[50,140],"toe":[60,140]}, "bar": [58, 118]},
        {"t": 0.5, "pose": {"head":[70,60],"neck":[64,65],"shoulder":[58,70],"elbow":[44,80],"hand":[56,92],"hip":[38,80],"knee":[46,110],"ankle":[50,140],"toe":[60,140]}, "bar": [56, 92]},
        {"t": 1.0, "pose": {"head":[70,60],"neck":[64,65],"shoulder":[58,70],"elbow":[56,95],"hand":[58,118],"hip":[38,80],"knee":[46,110],"ankle":[50,140],"toe":[60,140]}, "bar": [58, 118]},
     ]),
    ("lat_pd", "Lat pulldown", "Pull", 2000, False, False,
     {"feet": "oval", "arm2": "mirror", "leg2": "mirror"}, [
        {"t": 0.0, "pose": {"head":[50,50],"neck":[50,60],"shoulder":[50,67],"elbow":[56,46],"hand":[58,22],"hip":[50,117],"knee":[62,130],"ankle":[72,144],"toe":[82,144]}, "bar": [58, 22]},
        {"t": 0.5, "pose": {"head":[50,50],"neck":[50,60],"shoulder":[50,65],"elbow":[40,76],"hand":[54,60],"hip":[50,117],"knee":[62,130],"ankle":[72,144],"toe":[82,144]}, "bar": [54, 60]},
        {"t": 1.0, "pose": {"head":[50,50],"neck":[50,60],"shoulder":[50,67],"elbow":[56,46],"hand":[58,22],"hip":[50,117],"knee":[62,130],"ankle":[72,144],"toe":[82,144]}, "bar": [58, 22]},
     ]),
    ("shrug", "Shrug", "Pull", 1600, False, True,
     {"feet": "oval", "arm2": "mirror", "leg2": "mirror"}, [
        {"t": 0.0, "pose": _pose(shoulder=[50,38], elbow=[50,63], hand=[52,88]), "bar": [52, 88]},
        {"t": 0.5, "pose": _pose(neck=[50,26], shoulder=[50,30], elbow=[50,55], hand=[52,80]), "bar": [52, 80]},
        {"t": 1.0, "pose": _pose(shoulder=[50,38], elbow=[50,63], hand=[52,88]), "bar": [52, 88]},
     ]),
    ("lat_raise", "Lateral raise", "Shoulders", 1800, False, True,
     {"feet": "oval", "arm2": "mirror", "leg2": "mirror"}, [
        {"t": 0.0, "pose": _pose(elbow=[50,60], hand=[50,85])},
        {"t": 0.5, "pose": _pose(elbow=[50,36], hand=[50,12])},
        {"t": 1.0, "pose": _pose(elbow=[50,60], hand=[50,85])},
     ]),
    ("front_raise", "Front raise", "Shoulders", 1800, False, True,
     {"feet": "oval", "arm2": "mirror", "leg2": "mirror"}, [
        {"t": 0.0, "pose": _pose(elbow=[54,60], hand=[58,85])},
        {"t": 0.5, "pose": _pose(shoulder=[50,36], elbow=[65,40], hand=[82,36])},
        {"t": 1.0, "pose": _pose(elbow=[54,60], hand=[58,85])},
     ]),
    ("dead", "Deadlift", "Legs", 2800, False, True,
     {"feet": "oval", "arm2": "mirror", "leg2": "mirror"}, [
        {"t": 0.0, "pose": {"head":[62,55],"neck":[58,62],"shoulder":[54,70],"elbow":[52,95],"hand":[50,120],"hip":[40,90],"knee":[48,112],"ankle":[50,140],"toe":[60,140]}, "bar": [50, 122]},
        {"t": 0.5, "pose": _pose(elbow=[52,70], hand=[52,90]), "bar": [52, 90]},
        {"t": 1.0, "pose": {"head":[62,55],"neck":[58,62],"shoulder":[54,70],"elbow":[52,95],"hand":[50,120],"hip":[40,90],"knee":[48,112],"ankle":[50,140],"toe":[60,140]}, "bar": [50, 122]},
     ]),
    ("rdl", "Romanian deadlift", "Legs", 2600, False, True,
     {"feet": "oval", "arm2": "mirror", "leg2": "mirror"}, [
        {"t": 0.0, "pose": _pose(elbow=[52,70], hand=[52,90]), "bar": [52, 90]},
        {"t": 0.5, "pose": {"head":[70,58],"neck":[64,64],"shoulder":[58,70],"elbow":[54,92],"hand":[52,116],"hip":[38,84],"knee":[46,112],"ankle":[50,140],"toe":[60,140]}, "bar": [52, 116]},
        {"t": 1.0, "pose": _pose(elbow=[52,70], hand=[52,90]), "bar": [52, 90]},
     ]),
    ("lunges", "Lunge", "Legs", 2400, False, True,
     {"feet": "oval", "arm2": "mirror", "leg2": "independent"}, [
        {"t": 0.0, "pose": {"head":[50,22],"neck":[50,32],"shoulder":[50,37],"elbow":[50,62],"hand":[50,87],"hip":[50,87],"knee":[60,116],"ankle":[68,140],"toe":[78,140]}},
        {"t": 0.5, "pose": {"head":[50,38],"neck":[50,48],"shoulder":[50,53],"elbow":[50,78],"hand":[50,103],"hip":[50,103],"knee":[76,122],"ankle":[78,140],"toe":[88,140]}},
        {"t": 1.0, "pose": {"head":[50,22],"neck":[50,32],"shoulder":[50,37],"elbow":[50,62],"hand":[50,87],"hip":[50,87],"knee":[60,116],"ankle":[68,140],"toe":[78,140]}},
     ]),
    ("calf_raise", "Calf raise", "Legs", 1400, False, True,
     {"feet": "oval", "arm2": "mirror", "leg2": "mirror"}, [
        {"t": 0.0, "pose": _pose()},
        {"t": 0.5, "pose": {"head":[50,14],"neck":[50,24],"shoulder":[50,29],"elbow":[50,54],"hand":[50,79],"hip":[50,79],"knee":[50,109],"ankle":[50,130],"toe":[60,140]}},
        {"t": 1.0, "pose": _pose()},
     ]),
    ("leg_curl", "Lying leg curl", "Legs", 1800, False, False,
     {"feet": "oval", "arm2": "none", "leg2": "mirror"}, [
        {"t": 0.0, "pose": {"head":[12,92],"neck":[20,90],"shoulder":[28,88],"elbow":[22,96],"hand":[16,102],"hip":[60,88],"knee":[78,88],"ankle":[96,88],"toe":[96,96]}},
        {"t": 0.5, "pose": {"head":[12,92],"neck":[20,90],"shoulder":[28,88],"elbow":[22,96],"hand":[16,102],"hip":[60,88],"knee":[78,88],"ankle":[76,64],"toe":[82,56]}},
        {"t": 1.0, "pose": {"head":[12,92],"neck":[20,90],"shoulder":[28,88],"elbow":[22,96],"hand":[16,102],"hip":[60,88],"knee":[78,88],"ankle":[96,88],"toe":[96,96]}},
     ]),
    ("leg_ext", "Leg extension", "Legs", 1800, False, False,
     {"feet": "oval", "arm2": "none", "leg2": "mirror"}, [
        {"t": 0.0, "pose": {"head":[22,50],"neck":[22,60],"shoulder":[22,65],"elbow":[22,88],"hand":[22,110],"hip":[40,88],"knee":[60,88],"ankle":[60,116],"toe":[68,120]}},
        {"t": 0.5, "pose": {"head":[22,50],"neck":[22,60],"shoulder":[22,65],"elbow":[22,88],"hand":[22,110],"hip":[40,88],"knee":[60,88],"ankle":[92,88],"toe":[96,96]}},
        {"t": 1.0, "pose": {"head":[22,50],"neck":[22,60],"shoulder":[22,65],"elbow":[22,88],"hand":[22,110],"hip":[40,88],"knee":[60,88],"ankle":[60,116],"toe":[68,120]}},
     ]),
    ("hip_thrust", "Hip thrust", "Legs", 2200, False, False,
     {"feet": "oval", "arm2": "mirror", "leg2": "mirror"}, [
        {"t": 0.0, "pose": {"head":[22,80],"neck":[30,82],"shoulder":[38,84],"elbow":[42,100],"hand":[44,118],"hip":[62,120],"knee":[80,114],"ankle":[88,138],"toe":[96,138]}},
        {"t": 0.5, "pose": {"head":[22,80],"neck":[30,82],"shoulder":[38,84],"elbow":[42,100],"hand":[44,118],"hip":[60,86],"knee":[80,90],"ankle":[88,138],"toe":[96,138]}},
        {"t": 1.0, "pose": {"head":[22,80],"neck":[30,82],"shoulder":[38,84],"elbow":[42,100],"hand":[44,118],"hip":[62,120],"knee":[80,114],"ankle":[88,138],"toe":[96,138]}},
     ]),
    ("w_situp", "Sit-up", "Core", 2000, False, True,
     {"feet": "oval", "arm2": "mirror", "leg2": "mirror"}, [
        {"t": 0.0, "pose": {"head":[22,116],"neck":[28,118],"shoulder":[34,120],"elbow":[34,124],"hand":[34,130],"hip":[60,122],"knee":[78,100],"ankle":[92,134],"toe":[98,138]}},
        {"t": 0.5, "pose": {"head":[54,76],"neck":[56,86],"shoulder":[58,92],"elbow":[58,110],"hand":[58,122],"hip":[60,122],"knee":[78,100],"ankle":[92,134],"toe":[98,138]}},
        {"t": 1.0, "pose": {"head":[22,116],"neck":[28,118],"shoulder":[34,120],"elbow":[34,124],"hand":[34,130],"hip":[60,122],"knee":[78,100],"ankle":[92,134],"toe":[98,138]}},
     ]),
    ("plank", "Plank", "Core", 2400, False, True,
     {"feet": "oval", "arm2": "mirror", "leg2": "mirror"}, [
        {"t": 0.0, "pose": {"head":[82,100],"neck":[74,102],"shoulder":[66,104],"elbow":[66,122],"hand":[60,138],"hip":[38,106],"knee":[18,110],"ankle":[0,114],"toe":[-2,122]}},
        {"t": 0.5, "pose": {"head":[82,100],"neck":[74,102],"shoulder":[66,106],"elbow":[66,122],"hand":[60,138],"hip":[38,108],"knee":[18,110],"ankle":[0,114],"toe":[-2,122]}},
        {"t": 1.0, "pose": {"head":[82,100],"neck":[74,102],"shoulder":[66,104],"elbow":[66,122],"hand":[60,138],"hip":[38,106],"knee":[18,110],"ankle":[0,114],"toe":[-2,122]}},
     ]),
    ("run", "Running", "Cardio", 600, False, True,
     {"feet": "oval", "arm2": "independent", "leg2": "independent"}, [
        {"t": 0.0, "pose": {"head":[50,22],"neck":[50,32],"shoulder":[50,38],"elbow":[62,50],"hand":[70,64],"hip":[50,86],"knee":[68,100],"ankle":[80,120],"toe":[90,122]}},
        {"t": 0.5, "pose": {"head":[50,22],"neck":[50,32],"shoulder":[50,38],"elbow":[38,50],"hand":[30,64],"hip":[50,86],"knee":[38,116],"ankle":[26,138],"toe":[16,138]}},
        {"t": 1.0, "pose": {"head":[50,22],"neck":[50,32],"shoulder":[50,38],"elbow":[62,50],"hand":[70,64],"hip":[50,86],"knee":[68,100],"ankle":[80,120],"toe":[90,122]}},
     ]),
    ("jump_rope", "Jump rope", "Cardio", 600, False, True,
     {"feet": "oval", "arm2": "mirror", "leg2": "mirror"}, [
        {"t": 0.0, "pose": _pose(knee=[50,118], ankle=[50,142], toe=[60,142])},
        {"t": 0.5, "pose": {"head":[50,14],"neck":[50,24],"shoulder":[50,29],"elbow":[50,54],"hand":[50,79],"hip":[50,79],"knee":[50,108],"ankle":[50,130],"toe":[60,132]}},
        {"t": 1.0, "pose": _pose(knee=[50,118], ankle=[50,142], toe=[60,142])},
     ]),
]


# ── Seed driver ──────────────────────────────────────────────────────────────

def seed_if_empty():
    """Populate every content table that has zero rows.

    Designed to be called every app startup. Tables with existing rows are
    left untouched so admin edits survive container restarts."""
    db = SessionLocal()
    try:
        # The exercise catalog is required by the regime generator and the
        # workout wizards. Seed it before content tables so a fresh DB is
        # immediately usable without running `python -m app.init_db`.
        if db.query(models.Exercise).count() == 0:
            db.add_all([models.Exercise(**ex) for ex in _EXERCISES])
            db.commit()

        if db.query(models.Quote).count() == 0:
            rows: list[models.Quote] = []
            for i, q in enumerate(BRO_QUOTES):
                rows.append(models.Quote(bucket="bro", text=q, source="Dom Mazzetti", sort=i))
            for i, q in enumerate(GRL_QUOTES):
                rows.append(models.Quote(bucket="grl", text=q, sort=i))
            for i, (src, q) in enumerate(PRO_QUOTES):
                rows.append(models.Quote(bucket="pro", text=q, source=src, sort=i))
            for i, (a, b) in enumerate(HERO_CALLS_BRO):
                rows.append(models.Quote(bucket="hero_bro", text=a, line2=b, sort=i))
            for i, (a, b) in enumerate(HERO_CALLS_GRL):
                rows.append(models.Quote(bucket="hero_grl", text=a, line2=b, sort=i))
            db.add_all(rows)
            db.commit()

        if db.query(models.Tip).count() == 0:
            db.add_all([
                models.Tip(id=t["id"], icon=t["icon"], title=t["title"], body=t["body"],
                           body_bro=t["body_bro"], body_grl=t["body_grl"], sort=i)
                for i, t in enumerate(TIPS)
            ])
            db.commit()

        if db.query(models.Focus).count() == 0:
            db.add_all([
                models.Focus(id=f["id"], name=f["name"], icon=f["icon"],
                             description=f["description"], exercise_ids=f["exercise_ids"], sort=i)
                for i, f in enumerate(FOCUSES)
            ])
            db.commit()

        if db.query(models.Muscle).count() == 0:
            db.add_all([
                models.Muscle(id=mid, name=name, muscle_group=group, sort=i)
                for i, (mid, name, group) in enumerate(MUSCLES)
            ])
            db.commit()

        if db.query(models.Stretch).count() == 0:
            db.add_all([
                models.Stretch(muscle_group=g, name=n, duration=d, per_side=ps, cue=c, sort=i)
                for i, (g, n, d, ps, c) in enumerate(STRETCHES)
            ])
            db.commit()

        if db.query(models.ExerciseInfo).count() == 0:
            db.add_all([
                models.ExerciseInfo(exercise_id=ex_id, setup=s, execute=e, cue=c)
                for ex_id, (s, e, c) in EXERCISE_INFO.items()
            ])
            db.commit()

        # Insert any metric defs that don't already exist (by id) so existing DBs
        # pick up newly-added metrics without clobbering admin edits to existing rows.
        existing_metric_ids = {m.id for m in db.query(models.MetricDef.id).all()}
        new_metrics = [
            models.MetricDef(id=mid, label=lab, unit=u, color=col, step=st,
                             min_value=mn, max_value=mx, sort=i)
            for i, (mid, lab, u, col, st, mn, mx) in enumerate(METRIC_DEFS)
            if mid not in existing_metric_ids
        ]
        if new_metrics:
            db.add_all(new_metrics)
            db.commit()

        if db.query(models.WeekDay).count() == 0:
            db.add_all([
                models.WeekDay(key=k, label=lab, short=sh, sort=i)
                for i, (k, lab, sh) in enumerate(WEEK_DAYS)
            ])
            db.commit()

        if db.query(models.BodyMapShape).count() == 0:
            db.add_all([
                models.BodyMapShape(id=shape_id, data=data)
                for shape_id, data in BODYMAP_SHAPES
            ])
            db.commit()

        # Motions are upserted by id (insert only when missing) rather than a
        # whole-table seed. That way new entries added to MOTIONS show up on
        # the next restart while admin edits to existing rows are preserved.
        existing_motion_ids = {row[0] for row in db.query(models.ExerciseMotion.exercise_id).all()}
        new_motions = [
            models.ExerciseMotion(
                exercise_id=ex_id, name=name, category=category,
                duration=duration, bench=bench, floor=floor,
                rig=rig, frames=frames,
            )
            for ex_id, name, category, duration, bench, floor, rig, frames in MOTIONS
            if ex_id not in existing_motion_ids
        ]
        if new_motions:
            db.add_all(new_motions)
            db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed_if_empty()
    print("Content seed complete.")
