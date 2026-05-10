# Body Map SVG — Overview

## Source Files

| File | Role |
|------|------|
| `frontend/src/data/bodymap.ts` | Raw SVG geometry — silhouettes, muscle shapes, detail lines |
| `frontend/src/components/BodyMap.tsx` | React renderer — applies colour/opacity/glow based on state |
| `frontend/src/data/muscles.ts` | `MI` registry — `mid` → `{ n: display name, g: group }` |
| `frontend/src/data/exercises.ts` | `EM` map — exercise id → `{ p: primary mids[], s: secondary mids[] }` |

## Sub-documents

| File | Contents |
|------|----------|
| [`bodymap-silhouette.md`](bodymap-silhouette.md) | Body outline paths, annotated segment-by-segment, proportion reference, edit guide |
| [`bodymap-muscles.md`](bodymap-muscles.md) | All muscle shapes (FM / BM), full mid registry, add/edit guide |

---

## Coordinate System

All shapes share `viewBox="0 0 100 180"`. The SVG renders at 90×162 px but all coordinates are viewBox units.

```
 (0,0) ──────────────── (100,0)
   │  head: circle cy=13 r=12  │
   │  shoulders  y ≈ 28–38     │
   │  chest      y ≈ 38–55     │
   │  abs        y ≈ 55–77     │
   │  hips       y ≈ 70–96     │
   │  thighs     y ≈ 86–136    │
   │  calves     y ≈ 136–160   │
   │  feet       y ≈ 160–175   │
 (0,180) ──────────────(100,180)
```

- **Centre:** x = 50
- Figure's anatomical left → screen right (x > 50); anatomical right → screen left (x < 50)
- The head is rendered as a separate `<circle cx="50" cy="13" r="12"/>` in the component

---

## Rendering Pipeline

`BodyMap.tsx` receives four props:

| Prop | Type | Meaning |
|------|------|---------|
| `active` | `ActiveMuscles` | `{ [mid]: "primary" \| "secondary" }` — live workout |
| `preview` | `ActiveMuscles` | Hover-preview of a not-yet-added exercise |
| `focusMuscles` | `ActiveMuscles \| undefined` | Focus-day emphasis (WizardFocus step) |
| `onHoverMuscle` | `(mid \| null) => void` | Mouse-over callback |

### Visual state matrix

| State | fill | fillOpacity | stroke | strokeOpacity | strokeWidth |
|-------|------|-------------|--------|---------------|-------------|
| preview | `--green` | 0.82 | `--green` | 0.95 | 1.1 |
| primary | `--accent` | 0.86 | `--accent` | 1.0 | 1.1 |
| secondary | `--accent` | 0.36 | `--accent` | 0.60 | 0.8 |
| hover | white | 0.06 | white | 0.38 | 0.7 |
| focus match | `#E8981E` | 0.22 | `#E8981E` | 0.45 | 0.55 |
| focus non-match | white | 0.04 | white | 0.10 | 0.45 |
| default | none | 1 | white | 0.15 | 0.45 |

Active shapes (`primary` or `preview`) get a `feGaussianBlur(stdDeviation=3)` glow filter.  
All muscle shapes are clipped to the body outline via `<clipPath>` (head circle + body path).

### Z-order

Shapes are sorted before render: inactive (0) → secondary (1) → primary (2) → preview (3).

---

## Quick Preview Snippet

To test any path shape in isolation:

```html
<svg viewBox="0 0 100 180" width="270" height="540" style="background:#222">
  <path d="PASTE_PATH_HERE" fill="rgba(255,100,0,0.5)" stroke="white" stroke-width="0.5"/>
</svg>
```

Or use https://yqnn.github.io/svg-path-editor/
