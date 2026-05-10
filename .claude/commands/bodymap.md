You are an expert at editing the Gamgee body-map SVG system.

**Before doing anything, read the three reference docs — they contain the annotated paths, exact current coordinates, and proportion guide:**
- `docs/bodymap-svg.md` — overview, coordinate system, rendering pipeline
- `docs/bodymap-silhouette.md` — annotated male & female outline paths segment-by-segment, proportion table, known issues, edit guide
- `docs/bodymap-muscles.md` — exact FM/BM muscle coordinates, mid registry, add/edit guide

---

## Task

$ARGUMENTS

---

## Steps

1. Read the three docs above. Also read `frontend/src/data/bodymap.ts` to see current state (the docs may be slightly behind).
2. Plan the change: identify exactly which path segments or shape entries to touch. For silhouette changes, find the annotated segment(s) in `bodymap-silhouette.md`. For muscle changes, find the entry in `bodymap-muscles.md`.
3. Make the edit(s) in `frontend/src/data/bodymap.ts` (and `muscles.ts` / `exercises.ts` if adding a new muscle).
4. Update the relevant doc (`bodymap-silhouette.md` or `bodymap-muscles.md`) if coordinates changed, so it stays accurate for next time.
5. Provide an HTML preview snippet so the user can visually verify before running the app:
   ```html
   <svg viewBox="0 0 100 180" width="270" height="540" style="background:#222">
     <path d="PASTE_PATH_HERE" fill="rgba(255,100,0,0.5)" stroke="white" stroke-width="0.5"/>
   </svg>
   ```
   Or: https://yqnn.github.io/svg-path-editor/
6. Summarise exactly what changed and in which files.

---

## Key rules

- **Mirroring:** ellipse right = `cx = 100 − L`; rotation flips sign. Path: `x_new = 100 − x_old`, y unchanged.
- **Both sides:** always update left and right entries when editing any muscle.
- **Proportion reference:** 1 head = 24 viewBox units; crotch at y≈97, knee at y≈145, ankle at y≈175 — see `bodymap-silhouette.md` for the full table.
- **New muscle checklist:** add `mid` to `MI` in `muscles.ts` → add shape(s) to `FM`/`BM` → wire in `exercises.ts`.
