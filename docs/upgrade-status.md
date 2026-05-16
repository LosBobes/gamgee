# Upgrade Implementation Status

Status of items from `docs/upgrade-recommendations.md`, after the
multi-feature implementation pass. Cross-reference numbering matches that
document.

Legend: ✅ shipped on this branch · 🟡 partial · ⏭ deferred (needs
external account or SDK that can't be wired up in a self-contained code
patch) · ⛔ skipped intentionally.

## §1 — High-impact user-facing features

| Item | Status | Notes |
|------|:---:|-------|
| 1.1 Rest timer + push | ✅ | `RestTimer` floating widget; per-exercise default in localStorage; Web Audio beep + vibration. Push from server when timer ends is wired through `/coach-ai`/notifications infra but not auto-fired — would be a one-line follow-up in `ExerciseCard.onChangeDefault`. |
| 1.2 Set-level RPE/RIR | 🟡 | Type added (`ExtendedWorkoutSet`); backend JSONB already accepts arbitrary set fields. UI inputs not yet added — gated behind a future setting. |
| 1.3 Exercise substitution | ⛔ | Not yet — pure-frontend swap button on `WizardBuild` / `ActiveWorkout` is straightforward follow-up. |
| 1.4 Progress-photo timeline | ⏭ | Needs object storage (Hetzner / S3) which is an external account. The `ProgressPhoto` model can be added without it but server-side photo storage isn't reasonable in local-only dev. |
| 1.5 Workout templates | ✅ | Full backend CRUD + `SaveTemplateButton` on WorkoutComplete + `TemplatesPickerModal` on WizardStart. |
| 1.6 CSV import | ✅ | Strong / Hevy / JEFIT header detection, /api/import/csv, importer UI in SettingsTab. |
| 1.7 Plate calculator | ✅ | `plate.ts` (greedy per-side loadout) + `PlateCalculatorModal` opens from each strength exercise. 6 unit tests. |
| 1.8 e1RM history chart | ✅ | `e1rmHistory()` in analysis.ts + dependency-free `E1RMChart`. PRsTab shows a chart modal when a PR is tapped. |
| 1.9 Streaks + badges | ✅ | `/api/streaks` computes current/best run with 2-day rest tolerance and awards badges (first_workout, ten_workouts, streak_7/30/100, first_pr, ten_prs). `StreakBadgesCard` on ProfileTab renders them. |
| 1.10 Programmable mesocycles | 🟡 | `Mesocycle` model + idempotent migration added; no router/UI yet. |

## §2 — UX polish and PWA improvements

| Item | Status | Notes |
|------|:---:|-------|
| 2.1 True offline-first workout logging | 🟡 | `useAutoSaveWorkout` persists in-progress workouts to localStorage every 600 ms with a resume-on-mount prompt. Full background-sync queue (failed POSTs replayed when online) is the bigger lift and not done. |
| 2.2 Skeleton states + optimistic | ⛔ | Not addressed. |
| 2.3 Keyboard shortcuts | ✅ | `useWorkoutHotkeys`: Space toggles next set, Arrow Up/Down adjusts reps, Shift+Arrow adjusts weight. Suppressed in inputs. |
| 2.4 AMOLED dark variant | ✅ | `data-theme="amoled"` CSS plus toggle in SettingsTab. |
| 2.5 iOS install nag | ✅ | `InstallNag` detects iOS Safari vs Chromium; dismissible, persisted in localStorage. |
| 2.6 A11y pass | ⛔ | Not addressed. |
| 2.7 i18n scaffolding | ⛔ | Not addressed. |

## §3 — Data, analytics, coaching depth

| Item | Status | Notes |
|------|:---:|-------|
| 3.1 Volume / intensity / frequency dashboards | 🟡 | `volumeByGroup()` helper in analysis.ts (with tests); a richer charts surface in CoachTab not yet built — the helper is wired and tested but no UI consumes it yet. |
| 3.2 Auto-deload suggestions | ⛔ | Existing analyzer already returns `DELOAD` and the UI shows a banner — the *daily* auto-deload nag was not added. |
| 3.3 Soreness check-in | ✅ | Full `/api/soreness` + `SorenessCheckIn` card on HealthTab (sleep / stress / motivation 1-5 plus per-muscle 0-3). |
| 3.4 Body-map heatmap | ⛔ | Bodymap currently shows coverage; a volume-weighted heatmap requires modifying `BodyMap.tsx` to consume the new `volumeByGroup()` data. Plumbing is ready. |
| 3.5 Trainer client dashboard | ⛔ | TraineesTab unchanged. |
| 3.6 Export & data portability | ✅ | Streaming `/api/account/export` returns a full JSON bundle (workouts, PRs, metrics, soreness, notes, templates, badges, chat). Download button in SettingsTab. |

## §4 — Platform / infra

| Item | Status | Notes |
|------|:---:|-------|
| 4.1 Multi-worker Redis pub/sub | ⛔ | Deliberately deferred — non-trivial refactor of `events.py` + `chat_ws.py`. Documented as next step. |
| 4.2 Native wrappers (Capacitor) | ⏭ | Needs Xcode / Android Studio + signing keys. |
| 4.3 OAuth / SSO | ⏭ | Needs provider account registration. |
| 4.4 Alembic migrations | 🟡 | New tables added via the existing in-place `ALTER TABLE ... IF NOT EXISTS` pattern, consistent with the codebase convention. Alembic baseline conversion not done. |
| 4.5 Sentry + Prometheus | ✅ | `observability.init_sentry()` + `init_prometheus(app)`. Both no-op without their respective env vars + optional deps. Documented in .env.example. |
| 4.6 Backups + restore drills | ⛔ | Operational — needs to be added to deploy / cron config. |
| 4.7 Rate limiting | ✅ | `rate_limit.limit(rate)` IP-based dependency on /auth/login (20/min), /auth/register (10/h), /auth/forgot-password (5/h), /auth/refresh (60/min), /auth/2fa/login (20/min), /buddies/{id}/motivate (30/h), /coach-ai/ask (20/h). Disabled in tests. |
| 4.8 CI / dev experience | 🟡 | Dependabot (pip + npm + actions + docker); ruff config + lint job (soft-fail); pip + pnpm cache was already configured. mypy strict + pre-commit + Lighthouse CI not done. |
| 4.9 Playwright WebKit | ⛔ | Not configured. |

## §5 — Security & privacy

| Item | Status | Notes |
|------|:---:|-------|
| 5.1 Refresh tokens | ✅ | `RefreshToken` model + `/api/auth/refresh` rotate-on-use + `/api/auth/logout-all`. The 2FA login flow issues both access + refresh tokens. The legacy `/auth/login` is unchanged for backwards compatibility. |
| 5.2 2FA (TOTP) | ✅ | RFC 6238 implementation in `security_ext.py`. Enroll/verify/disable/status endpoints + `/auth/2fa/login`. Recovery codes (8) hashed at rest. Tested. |
| 5.3 CSP / Trusted Types | ⛔ | Not addressed. |
| 5.4 Audit log | ✅ | `AuditEvent` table + `security_ext.audit()` helper. Used by auth_ext for 2fa/logout-all events. Admin-only read endpoint at `/api/admin/audit`. |
| 5.5 GDPR account deletion | ✅ | `/api/account` DELETE cascades through every owned/relational table; requires both password + `confirm: "DELETE"`. UI button in SettingsTab. |

## §6 — Smaller fast wins

| Item | Status | Notes |
|------|:---:|-------|
| Auto-save active workout | ✅ | `useAutoSaveWorkout`. |
| Copy last session | ✅ | "Repeat last session" button on WizardStart. |
| Search in chat | ⛔ | Not done. |
| Notification preferences UI | ⛔ | Existing PushToggleCard / NotificationTypesCard already cover the basics. |
| PWA badge | ✅ | `useAppBadge` ties unread notifications + chat to the app icon. |
| Share PR via OG-image | ⛔ | Backend image rendering not built. |
| Bulk-edit sets | ⛔ | EditWorkoutModal not extended. |
| Calendar view on HistoryTab | ✅ | **Already in the codebase** — pre-existing. |
| Exercise notes | 🟡 | Backend CRUD shipped (`/api/exercise-notes`). UI surface (a modal accessible from ExerciseCard) not built. |
| Quick weight chips | ⛔ | Not done. |
| Bodyweight-progressive PRs | ⛔ | Comparator unchanged. |

## §7 — Stretch / longer horizon

| Item | Status | Notes |
|------|:---:|-------|
| 7.1 AI coach (Claude API) | ✅ | `/api/coach-ai/ask` proxies the Anthropic SDK with prompt-cached system prompt + recent-set history snippet. Daily per-user cap (default 30). `AICoachPanel` in CoachTab hides itself unless `/api/coach-ai/health.configured` returns true. |
| 7.2 Real-time form-check via video | ⛔ | Major project; not started. |
| 7.3 Wearable integration | ⏭ | Needs native wrappers / device APIs. |
| 7.4 Marketplace for trainers | ⏭ | Needs Stripe Connect + business setup. |
| 7.5 Group challenges / leaderboards | ⛔ | Not started. |

## What CI now sees

- pytest: **79 passed** (was 68 — added 11 across templates, security_ext, streaks, export, account deletion).
- vitest: **46 passed** (was 31 — added 15 across plate calculator + analysis extensions).
- `tsc --noEmit`: **clean**.
- `vite build`: **clean** (no new warnings beyond the existing chunk-size note).

## New environment variables

Documented in `.env.example`:

| Var | Default | Purpose |
|-----|---------|---------|
| `RATE_LIMIT_ENABLED` | `true` | In-process IP rate limit on sensitive endpoints |
| `ANTHROPIC_API_KEY` | _empty_ | Required to enable the AI coach |
| `CLAUDE_COACH_MODEL` | `claude-sonnet-4-6` | Model id for the AI coach |
| `COACH_AI_MAX_PER_DAY` | `30` | Per-user daily cap on AI coach questions |
| `SENTRY_DSN` | _empty_ | Sentry init |
| `SENTRY_ENVIRONMENT` | `production` | Sentry env tag |
| `SENTRY_TRACES_SAMPLE_RATE` | `0.0` | Sentry tracing |
| `SENTRY_RELEASE` | _empty_ | Sentry release tag |
| `PROMETHEUS_ENABLED` | `false` | Expose `/metrics` |
| `CORS_EXTRA_ORIGINS` | _empty_ | Additional allowed CORS origins |
