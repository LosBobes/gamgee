# Gamgee User Guide

Welcome to **Gamgee** — your pocket-sized workout tracker, coach, and training buddy. This guide walks through every feature of the app, from your first login to advanced trainer workflows.

If you're a developer or operator looking for setup or deployment instructions, see the project [README](../README.md) and [`docs/deployment.md`](deployment.md) instead.

---

## Table of contents

1. [Getting started](#getting-started)
2. [The main tabs](#the-main-tabs)
3. [Logging a workout](#logging-a-workout)
4. [Personal records (PRs)](#personal-records-prs)
5. [History & calendar](#history--calendar)
6. [Coach tab — progression analysis](#coach-tab--progression-analysis)
7. [Health metrics](#health-metrics)
8. [Profile & stats](#profile--stats)
9. [Buddies & scoreboard](#buddies--scoreboard)
10. [Chat](#chat)
11. [Live co-workouts](#live-co-workouts)
12. [Trainers & trainees](#trainers--trainees)
13. [Weekly plan & regimes](#weekly-plan--regimes)
14. [Notifications](#notifications)
15. [Settings](#settings)
16. [Installing as a PWA](#installing-as-a-pwa)
17. [Troubleshooting](#troubleshooting)
18. [Glossary](#glossary)

---

## Getting started

### Creating an account

1. Open the app in your browser.
2. On the auth screen, choose **Register**.
3. Provide:
   - **Username** — unique, used to log in.
   - **Email** — required for password reset and email verification.
   - **Password** — must be 12–128 characters with mixed case, a digit, and a symbol. Common passwords and strings similar to your username are blocked.
   - **Name** and **Gender** are optional.
4. Submit. You'll receive a verification email — click the link to confirm your address. Until then, some notification flows may be limited.

> **Becoming a trainer?** Choose **Register as Trainer** on the auth screen instead. You'll be prompted for a short bio, specialties, certifications, and years of experience.

### Logging in

- The login form accepts either your **username or email** (case-insensitive).
- Sessions last 7 days. If your token expires, the app silently logs you out and returns you to the auth screen.

### Forgot your password?

1. Click **Forgot password?** on the login screen.
2. Enter your email. You'll always get a "request submitted" message, whether or not the address is registered (to protect privacy).
3. If the email exists, you'll receive a reset link. Open it on the same device, choose a new password, and you're back in.

---

## The main tabs

Gamgee organises every feature into top-level tabs:

| Tab           | What it's for                                                              |
|---------------|----------------------------------------------------------------------------|
| **Workout**   | Start, build, and complete a workout session.                              |
| **History**   | Browse past sessions as a list or calendar.                                |
| **PRs**       | Your personal records, with estimated 1RMs.                                |
| **Buddies**   | Friends, friend requests, weekly/monthly scoreboards.                      |
| **Chat**      | Direct messages and trainer↔trainee coaching channels.                     |
| **Regimes**   | Weekly plan editor and trainer-assigned regimes you accepted.              |
| **Coaching**  | (Trainees) Your assigned trainers and their advice.                        |
| **Trainees**  | (Trainers only) Your trainee roster and their progress.                    |
| **Health**    | Time-series body metrics (weight, body fat, resting HR, …).                |
| **Coach**     | Per-exercise progression analysis and next-session recommendations.        |
| **Exercises** | Browse the exercise library; add custom exercises.                         |
| **Notifications** | Inbox of buddy pings, PR celebrations, trainer requests, etc.          |
| **Profile**   | Aggregate stats, activity heatmap, public profile.                         |
| **Settings**  | Appearance, tone, notification preferences, account, about.                |

On desktop the most-used tabs are visible directly under the header; the rest live in the **hamburger menu** (top right). On mobile everything lives in the hamburger menu, grouped into **Progress**, **Social**, and **Coaching & Plans**.

The hamburger menu also exposes a **Help & Tour** button — it relaunches the onboarding overlay that walks you through the wizard flow.

---

## Logging a workout

The **Workout** tab is wizard-driven. Each step adds context until you're ready to lift.

### 1. Start screen

Shows your last session's summary plus a motivational quote. Tap **Start a workout** to begin.

### 2. Pick a mode

Choose how to build the session:

- **From weekly plan** — uses today's plan from your recurring 7-day schedule.
- **By focus** — pick a focus group (push, pull, legs, upper, lower, full body, core) and we suggest exercises.
- **Custom build** — start from a blank slate.

### 3. Build the session

- Search exercises by name or muscle.
- Tap to add. The **body map** preview highlights which muscles are getting hit, so you can see coverage in real time.
- Re-order, edit set/rep targets, or remove anything you don't want.

### 4. Optional cardio

Add a warm-up or cool-down cardio slot — useful for tracking treadmill, rowing, or cycling time/distance.

### 5. Active workout

This is the live screen during your session:

- A running timer shows elapsed time.
- For each set: enter weight and reps, mark the set done. The app detects new PRs and shows a badge instantly.
- Add a new exercise mid-session via the **+** button — no need to restart.
- If you have a **Live session** active (see below), every set you log is broadcast to your buddies in real time.

### 6. Complete

When you're done, tap **Finish workout**. You'll see:

- Session summary (total volume, duration, set count).
- Any new PRs.
- A **Share** button that posts a notification to your buddies (respects their notification preferences).

Sessions are saved with a **client-generated UUID** — if you lose connectivity during a workout, the data is still there when you come back online.

---

## Personal records (PRs)

The **PRs** tab lists every exercise you've set a personal record on.

- Each card shows the **weight × reps** of your best set and an **estimated one-rep max** (Epley formula: `weight × (1 + reps / 30)`).
- **Cardio exercises** are tracked separately — the PR is the best value (e.g., longest run distance, longest plank hold).
- PRs are detected automatically when you finish a workout. You can also **delete** a PR if it was logged in error.
- The PR card colour follows your accent — change it in Settings.

---

## History & calendar

The **History** tab has two views:

- **List** — sessions in reverse-chronological order. Tap a card to expand the full exercise/set breakdown.
- **Calendar** — month grid with workout days highlighted. Tap a day to expand its session.

You can **edit** or **delete** any past session — useful if you forgot to log a set or want to fix a typo. Edits update PRs automatically.

---

## Coach tab — progression analysis

The **Coach** tab is where Gamgee turns your history into actionable advice.

For each exercise you've logged, it computes a **status** and a **recommended next session**:

| Status            | Meaning                                                            |
|-------------------|--------------------------------------------------------------------|
| `NEW`             | Not enough data yet. Just keep logging.                            |
| `PROGRESSING`     | Consistently adding weight or reps. Stay the course.               |
| `BUILDING REPS`   | Holding the weight but adding reps — building work capacity.       |
| `READY TO JUMP`   | You've hit the top of your rep range — time to add weight.         |
| `STALLED`         | No progression for a few sessions. Consider deload or form check.  |
| `PLATEAU`         | Long-term stall. Programme change recommended.                     |
| `DELOAD`          | Suggested deload: drop weight by ~10% and rebuild.                 |

Each card also shows a **next target** (weight × reps) with a one-line explanation. Sorted by exercises that need attention first.

---

## Health metrics

The **Health** tab tracks body metrics over time:

- Weight, body fat %, resting heart rate, sleep hours, blood pressure, and any custom metric defined in admin.
- Filter by metric type and date range.
- Log a new value with the **+** button.
- Each metric gets a chart showing trend over your chosen window.

Use this in concert with the Coach tab to correlate progression with sleep, weight changes, or recovery.

---

## Profile & stats

The **Profile** tab is your at-a-glance summary:

- **Aggregate stats**: total workouts, volume lifted (kg×reps), total time, total sets.
- **16-week activity heatmap** — GitHub-style grid showing which days you trained.
- **Top 5 most-logged exercises** and a **muscle group frequency bar** chart.
- **Public profile** — buddies can view a read-only version of this page.

---

## Buddies & scoreboard

The **Buddies** tab is your social hub.

### Adding a buddy

1. Tap **Find buddies** and search by username.
2. Send a friend request. They'll see it in **Notifications**.
3. Once accepted, you're both on each other's buddy list.

### Per-buddy notification toggles

For each buddy, you can independently mute:
- Workout completions
- PR notifications
- Motivation pings
- Live session alerts

Master switches in **Settings → Notifications** override these globally.

### Scoreboard

Tabs at the top of Buddies switch between **weekly** and **monthly** views. The scoreboard ranks you and your buddies by workouts logged, total volume, and PR count — friendly competition fuel.

### Motivate

Tap **Motivate** on any buddy's card to send them a cheering ping. They get a notification (if their `notify_motivate` is on).

---

## Chat

The **Chat** tab is the in-app messenger:

- **Direct messages** with any buddy.
- **Coaching channels** with each connected trainer / trainee (separate from DMs).
- Real-time delivery via WebSocket — messages appear instantly and an unread badge bumps the tab header.
- Tap a conversation to open it; messages are paginated.
- Read state is per-user: when you open a conversation, your messages are marked read on the server.

If you lose connection, messages queue and replay on reconnect.

---

## Live co-workouts

Want a buddy or trainer to watch you lift in real time? Use **Live sessions**.

### Starting a live session

1. Begin a normal workout from the Workout tab.
2. Tap the **Go Live** toggle in the active workout header. A live session row is created (`status: active`).
3. Your buddies (and accepted trainers) see a "Live now" indicator.

### What viewers see

- Current exercise, set number, and the latest weight/reps you logged.
- Progress vs. total planned exercises/sets.
- For trainers: the full **set-by-set timeline** for the session — every set you complete is appended.

### Ending

Finish your workout normally. The live session is marked `ended` and viewers see a final summary.

---

## Trainers & trainees

Gamgee supports an asymmetric trainer relationship: one trainer can have many trainees and vice versa.

### Connecting

1. Open the **Trainers** directory (in the hamburger menu under Coaching & Plans).
2. Browse profiles — each shows bio, specialties, certifications, years of experience.
3. Tap **Request link**. The trainer gets a notification and can accept or decline.
4. Once accepted, you'll see them under **Coaching** (trainees) or **Trainees** (trainers).

### Trainer abilities

- View each trainee's profile, recent workouts, PRs, and live session timelines.
- Send **assignments** — push a regime to a trainee with a personal note.
- Open a dedicated **coaching chat channel** with each trainee.

### Trainee abilities

- View advice and assignments from each connected trainer.
- Accept an assigned regime to apply it to your **weekly plan**.
- Chat with your trainer in a coaching channel.

---

## Weekly plan & regimes

Gamgee turns "I'll do legs on Monday" into a structured plan.

### Editing your weekly plan

1. Open **Regimes** → **Weekly plan**.
2. For each day of the week, set the **focus** (rest, push, pull, legs, upper, lower, full body, core).
3. Tap into any day to **add specific exercises** with target sets/reps.
4. Save. The workout wizard uses this plan when you choose **From weekly plan**.

### Regime questionnaire

If you don't know where to start, tap **Generate a regime**:

- Goal (strength, hypertrophy, endurance, general fitness)
- Experience (beginner, intermediate, advanced)
- Days/week (3–6)
- Focus muscles + muscles to avoid
- Available equipment

The rule-based generator outputs a complete 7-day plan you can preview and apply.

### Saved regimes

Save any plan as a named regime to revisit later or **assign to a trainee** (if you're a trainer).

---

## Notifications

The **Notifications** tab is your in-app inbox. Notifications come from:

- Buddy actions (request, accept, workout done, PR, motivate, live started/joined/ended)
- Trainer link requests and acceptances
- New regime assignments
- Chat messages (if web push is enabled)

For each item you can:
- **Mark read** (tapping opens the relevant tab and clears the badge).
- **Delete** to remove it from the inbox.

### Realtime delivery

- **In-app**: SSE keeps your tab badges and notification list live without polling.
- **Background**: Web Push (see Settings) delivers messages even when the app is closed. Tapping a push notification deep-links to the right tab.

---

## Settings

The **Settings** tab gathers everything that doesn't fit elsewhere.

### Profile

Edit your display name, email, and gender. Changing email triggers a fresh verification flow.

### Appearance

- **Tone** — switch the app's voice between **Professional**, **BroScience**, and **Grl Pwr**. Coaching tips, quotes, and copy adapt.
- **Accent colour** — pick from 8 swatches or a custom hex. The whole UI (buttons, highlights, PR cards, logo) updates instantly. Choice is synced to your account so other devices match.

### Notifications

- **Master switches** — globally turn off workout, PR, motivate, or live pings.
- **Web push** — enable browser-level push notifications. Requires HTTPS or `localhost` and a supported browser.

### Guidance

Restart the onboarding tour or open the help overlay.

### Account

Change your password. The new password must satisfy the same policy as registration.

### About

Shows the current **App version** and **API version** for diagnostics. If you're reporting a bug, please include both.

---

## Installing as a PWA

Gamgee is a Progressive Web App — install it for an app-like experience.

- **Desktop (Chrome/Edge)** — click the install icon in the address bar.
- **iOS Safari** — Share → **Add to Home Screen**.
- **Android Chrome** — three-dot menu → **Install app**.

Installed, you get:
- Full-screen standalone window (no browser chrome)
- Home-screen icon
- Background **Web Push** notifications
- Offline shell — the app loads even with no connection (cached API responses are reused when available)

---

## Troubleshooting

### "I can't log in"

- Username and email are case-insensitive — typos in either still work.
- If the password reset email never arrives, check spam and verify you used the registered email. (The app deliberately doesn't tell you whether the email exists.)
- A locked-out admin can reset your password directly via the database — see the [README](../README.md).

### "My workout didn't save"

- Sessions use client-generated UUIDs, so an offline save and a later sync will not duplicate. Open the workout again — if it's listed in History, it saved.
- If it's missing, check **History** with a refresh; the service worker may have served a cached empty list.

### "I see stale data"

The PWA caches `/api/*` responses with a NetworkFirst strategy. In dev or after a deployment:
1. Hard reload (Ctrl/Cmd + Shift + R).
2. Or unregister the service worker via your browser's devtools → Application → Service Workers.

### "Push notifications aren't arriving"

- Confirm Web Push is enabled in **Settings → Notifications**.
- Confirm your global and per-buddy/global toggles haven't muted that kind.
- Check OS-level notification permission for your browser.
- Some browsers silently drop push when battery saver is on.

### "Live session viewers see nothing"

- The buddy must have `notify_live` enabled and be an accepted buddy or accepted trainer.
- The session must show `status: active`. If you finished the workout, the session ends automatically.

### "I forgot to log a workout"

History entries can be **edited or deleted**. Open the session, tap edit, fix the data, save. PRs recompute.

---

## Glossary

- **PR (Personal Record)** — your best set on an exercise. Tracked per exercise, not per workout.
- **1RM** — one-rep max, estimated via Epley formula.
- **Focus** — a category of muscle groups (push, pull, legs, etc.) used by the wizard.
- **Regime** — a saved 7-day workout plan, optionally assigned by a trainer.
- **Live session** — a workout broadcast in real time to buddies/trainers.
- **Buddy** — a confirmed friend in the app; relationship is symmetric.
- **Trainer link** — an asymmetric trainer↔trainee connection.
- **Tone** — the app's writing voice (Pro / Bro / Grl Pwr); affects coaching copy.
- **Web Push** — browser background notifications; requires VAPID configuration on the server.

---

## Need more help?

- **Bug report or feature request** — use **Send Feedback** from the hamburger menu.
- **Operator/dev questions** — see [`README.md`](../README.md), [`docs/deployment.md`](deployment.md), and [`CLAUDE.md`](../CLAUDE.md).
- **Trainer onboarding** — register a new account with **Register as Trainer**, then fill out your profile in Settings.

Happy lifting!
