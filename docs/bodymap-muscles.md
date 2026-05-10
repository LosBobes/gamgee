# Body Map — Muscle Shapes

All shapes live in `frontend/src/data/bodymap.ts` as `FM` (front) and `BM` (back) arrays.
Every `mid` must also be registered in `MI` in `frontend/src/data/muscles.ts`.

Last refit: 2026-05-10 — coordinates updated to fit the redrawn (softer / 7.5-head) silhouette.
Key joints are now: shoulder y≈42, elbow y≈72, wrist y≈104, waist y≈70, knee y≈146, ankle y≈170.

---

## Shape Types

```ts
// Ellipse
{ mid: "quad_rf", cx: 38, cy: 108, rx: 4, ry: 20 }
{ mid: "oblique", cx: 30, cy: 65, rx: 6, ry: 11, rotate: -22 }  // optional rotation

// Path
{ mid: "upper_pec", d: "M 48,30 C 41,28 28,32 22,38 C 21,41 22,45 25,46 C 33,45 41,43 48,40 Z" }
```

Renderer detects type with `"d" in shape`.

### Mirroring rule

| Shape | Left (x < 50) | Right (x > 50) |
|-------|--------------|----------------|
| Ellipse | `cx = L` | `cx = 100 − L` |
| Rotation | `rotate = −angle` | `rotate = +angle` |
| Path | original x | `x_new = 100 − x_old` (y unchanged) |

---

## Front Muscles (`FM`)

| mid | shape | cx L / R | cy | rx | ry | rotate |
|-----|-------|----------|-----|-----|-----|--------|
| `neck` | ellipse ×1 | 50 | 26 | 5 | 3 | — |
| `front_delt` | ellipse ×2 | 22 / 78 | 42 | 7 | 7 | — |
| `side_delt` | ellipse ×2 | 14 / 86 | 44 | 4 | 6 | — |
| `upper_pec` | path ×2 | — | — | — | — | — |
| `lower_pec` | path ×2 | — | — | — | — | — |
| `bicep_long` | ellipse ×2 | 15 / 85 | 58 | 4 | 10 | — |
| `bicep_short` | ellipse ×2 | 18 / 82 | 64 | 3 | 8 | — |
| `brachialis` | ellipse ×2 | 14 / 86 | 74 | 3 | 6 | — |
| `forearm` | ellipse ×2 | 15 / 85 | 92 | 3 | 12 | — |
| `grip` | ellipse ×2 | 16 / 84 | 112 | 4 | 6 | — |
| `upper_abs` | ellipse ×1 | 50 | 58 | 9 | 7 | — |
| `lower_abs` | ellipse ×1 | 50 | 70 | 8 | 7 | — |
| `oblique` | ellipse ×2 | 30 / 70 | 65 | 6 | 11 | ∓22° |
| `quad_vl` | ellipse ×2 | 33 / 67 | 110 | 5 | 18 | — |
| `quad_rf` | ellipse ×2 | 38 / 62 | 108 | 4 | 20 | — |
| `quad_vmo` | ellipse ×2 | 40 / 60 | 134 | 4 | 7 | — |
| `adductor` | ellipse ×2 | 43 / 57 | 110 | 3 | 16 | — |
| `gastroc` | ellipse ×2 | 33 / 67 | 156 | 5 | 9 | — |

### Front pec paths (exact, for reference when editing)

```
upper_pec L: M 48,30 C 41,28 28,32 22,38 C 21,41 22,45 25,46 C 33,45 41,43 48,40 Z
upper_pec R: M 52,30 C 59,28 72,32 78,38 C 79,41 78,45 75,46 C 67,45 59,43 52,40 Z
lower_pec L: M 48,40 C 41,43 33,45 25,46 C 22,48 21,52 23,54 C 32,57 42,55 48,53 Z
lower_pec R: M 52,40 C 59,43 67,45 75,46 C 78,48 79,52 77,54 C 68,57 58,55 52,53 Z
```

---

## Back Muscles (`BM`)

| mid | shape | cx L / R | cy | rx | ry | rotate |
|-----|-------|----------|-----|-----|-----|--------|
| `neck` | ellipse ×1 | 50 | 26 | 5 | 3 | — |
| `upper_trap` | path ×2 | — | — | — | — | — |
| `lower_trap` | path ×2 | — | — | — | — | — |
| `rear_delt` | ellipse ×2 | 22 / 78 | 40 | 6 | 7 | — |
| `side_delt` | ellipse ×2 | 14 / 86 | 42 | 4 | 6 | — |
| `rhomboid` | ellipse ×2 | 43 / 57 | 42 | 6 | 7 | — |
| `upper_lat` | path ×2 | — | — | — | — | — |
| `lower_lat` | path ×2 | — | — | — | — | — |
| `teres_major` | ellipse ×2 | 23 / 77 | 44 | 5 | 6 | ∓15° |
| `erector` | ellipse ×2 | 45 / 55 | 60 | 4 | 14 | — |
| `tricep_long` | ellipse ×2 | 16 / 84 | 56 | 4 | 10 | — |
| `tricep_lat` | ellipse ×2 | 14 / 86 | 66 | 3 | 8 | — |
| `tricep_med` | ellipse ×2 | 13 / 87 | 75 | 3 | 6 | — |
| `glute_max` | path ×2 | — | — | — | — | — |
| `glute_med` | ellipse ×2 | 28 / 72 | 78 | 7 | 7 | ∓10° |
| `ham_bf` | ellipse ×2 | 33 / 67 | 116 | 6 | 18 | — |
| `ham_semi` | ellipse ×2 | 41 / 59 | 118 | 4 | 16 | — |
| `gastroc` | ellipse ×2 | 34 / 66 | 154 | 6 | 9 | — |
| `soleus` | ellipse ×2 | 34 / 66 | 166 | 4 | 5 | — |
| `grip` | ellipse ×2 | 16 / 84 | 112 | 4 | 6 | — |

### Back path shapes (exact, for reference when editing)

```
upper_trap L: M 50,24 C 44,26 32,30 22,36 L 21,40 C 26,43 35,45 43,46 C 47,45 50,42 50,38 Z
upper_trap R: M 50,24 C 56,26 68,30 78,36 L 79,40 C 74,43 65,45 57,46 C 53,45 50,42 50,38 Z

lower_trap L: M 50,38 C 48,42 45,46 40,48 C 34,50 28,54 30,60 C 34,64 40,64 45,60 C 48,56 50,50 50,42 Z
lower_trap R: M 50,38 C 52,42 55,46 60,48 C 66,50 72,54 70,60 C 66,64 60,64 55,60 C 52,56 50,50 50,42 Z

upper_lat L: M 50,48 C 44,48 33,50 25,56 C 21,62 21,68 23,74 L 28,74 C 31,68 35,62 41,58 C 45,54 49,52 50,50 Z
upper_lat R: M 50,48 C 56,48 67,50 75,56 C 79,62 79,68 77,74 L 72,74 C 69,68 65,62 59,58 C 55,54 51,52 50,50 Z

lower_lat L: M 30,72 C 26,74 24,78 26,82 C 28,85 33,85 35,81 C 35,77 33,73 30,72 Z
lower_lat R: M 70,72 C 74,74 76,78 74,82 C 72,85 67,85 65,81 C 65,77 67,73 70,72 Z

glute_max L: M 48,72 C 40,70 28,73 26,82 C 24,90 28,96 36,98 C 42,98 46,95 48,90 L 48,76 Z
glute_max R: M 52,72 C 60,70 72,73 74,82 C 76,90 72,96 64,98 C 58,98 54,95 52,90 L 52,76 Z
```

---

## Muscle ID Registry (`MI` in `muscles.ts`)

Full list of registered `mid` values (all must exist before shapes are added):

```
neck          grip
upper_pec     lower_pec
front_delt    side_delt     rear_delt
upper_trap    lower_trap    rhomboid
upper_lat     lower_lat     teres_major    erector
bicep_long    bicep_short   brachialis
tricep_long   tricep_lat    tricep_med
forearm
upper_abs     lower_abs     oblique
glute_max     glute_med
quad_rf       quad_vl       quad_vmo       adductor
ham_bf        ham_semi
gastroc       soleus
```

---

## How to Add a New Muscle

1. **Pick a `mid`** — lowercase snake_case, e.g. `serratus`.
2. **Register in `MI`** (`muscles.ts`):
   ```ts
   serratus: { n: "Serratus Anterior", g: "Chest" },
   ```
3. **Add shape(s) to `FM` or `BM`** (`bodymap.ts`):
   ```ts
   { mid: "serratus", cx: 26, cy: 56, rx: 4, ry: 8 },              // ellipse
   { mid: "serratus", cx: 74, cy: 56, rx: 4, ry: 8 },              // mirrored
   // or path:
   { mid: "serratus", d: "M 26,52 C …" },
   { mid: "serratus", d: "M 74,52 C …" },                          // x mirrored
   ```
4. **Wire exercises** (`exercises.ts`): add `serratus` to the `p` or `s` arrays of relevant entries in `EM`.

---

## How to Edit an Existing Muscle

Both the left and right entries share the same `mid` — always update both.

| Goal | Ellipse | Path |
|------|---------|------|
| Move | change `cx`/`cy` | shift all coordinates |
| Resize | change `rx`/`ry` | scale around centroid |
| Rotate | add/change `rotate` (deg, clockwise) | — |
| Reshape | replace with `d` path | edit bezier control points |
