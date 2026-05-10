# Body Map — Silhouette Paths

Two outline variants live in `frontend/src/data/bodymap.ts`.
`BODY_PATH` is a legacy alias for `MALE_BODY_PATH`.
`BodyMap.tsx` currently always uses `BODY_PATH` (male only — switching to female is wired up but not yet exposed in the UI).

Both silhouettes were redrawn 2026-05-10 for a softer, more realistic look:
C1-continuous arm/leg curves, lower knees (y=146), lower wrists (y=104),
proper hip/waist transition, tapered feet.

---

## Proportion Reference

The viewBox is 180 units tall. The head circle spans y≈1–25 (diameter ≈ 24 units).
**1 head = 24 units.** Standard 7.5-head figure:

| Landmark | Heads from crown | y in viewBox |
|----------|-----------------|--------------|
| Crown | 0 | 1 |
| Chin | 1 | 25 |
| Shoulders (acromion) | 1.4 | 36 |
| Nipple / lower pec | 2 | 49 |
| Elbow | 3 | 73 |
| Navel | 3 | 73 |
| Crotch / groin | 4 | 93 |
| Wrist | 4.25 | 104 |
| Knee | 6 | 146 |
| Ankle | 7.25 | 170 |
| Sole | 7.5 | 178 |

**Horizontal (male)** shoulder-width ≈ 2.7 heads = 64 units → acromion at x ≈ 18 / 82.
Hips ≈ 1.75 heads = 42 units wide → hip outer at x ≈ 29 / 71.

**Horizontal (female)** shoulder-width ≈ 2.3 heads = 56 units → acromion at x ≈ 22 / 78.
Hip flare ≈ 2.3 heads = 56 units → hip outer at x ≈ 22 / 78. Waist nipped at x ≈ 37 / 63.

---

## Annotated Male Path (`MALE_BODY_PATH`)

Tracing direction: **counter-clockwise** starting at the L side of the neck.
"L" = figure's left = screen left (x < 50). "R" = figure's right = screen right (x > 50).
Curves are C1-continuous through the deltoid-arm-wrist chain and at every leg joint.

```
M 43,22                           ← start: L neck base
C 38,25 26,29 18,36               ← L trapezius slope → acromion
C 13,38 11,43 11,50               ← L deltoid cap (shoulder rounding)
C 11,60 12,71 13,82               ← L upper arm outer
C 13,92 13,99 13,104              ← L forearm outer (taper)
C 11,114 13,120 16,120            ← L hand outer side → fingertip
C 19,120 21,114 19,104            ← L hand inner side → wrist inner
C 19,98 19,90 20,82               ← L forearm inner
C 21,72 22,62 24,52               ← L upper arm inner / armpit start
C 25,57 30,64 34,72               ← L armpit → waist (smooth S into ribcage)
C 33,80 30,86 29,91               ← L waist → hip widest
C 28,98 28,108 28,118             ← L outer thigh upper
C 28,128 29,138 30,146            ← L outer thigh → knee
C 29,154 27,162 28,170            ← L outer calf bulge → ankle
L 28,176                          ← L heel back
C 31,178 37,178 41,176            ← L sole (slight concave dip)
L 41,170                          ← L inner ankle
C 42,160 43,148 43,138            ← L inner calf
C 44,128 45,118 45,108            ← L inner thigh lower
C 45,102 45,98 44,93              ← L inner thigh upper / groin
L 56,93                           ← crotch bridge →
C 55,98 55,102 55,108             ← R inner thigh upper
C 55,118 56,128 57,138            ← R inner thigh lower
C 57,148 58,160 59,170            ← R inner calf
L 59,176                          ← R inner foot bottom
C 63,178 69,178 72,176            ← R sole
L 72,170                          ← R outer ankle
C 73,162 71,154 70,146            ← R outer calf → knee
C 71,138 72,128 72,118            ← R outer thigh lower
C 72,108 72,98 71,91              ← R outer thigh upper → hip
C 70,86 67,80 66,72               ← R hip → waist
C 70,64 75,57 76,52               ← R waist → armpit
C 78,62 79,72 80,82               ← R upper arm inner
C 81,90 81,98 81,104              ← R forearm inner
C 79,114 81,120 84,120            ← R hand inner side → fingertip
C 87,120 89,114 87,104            ← R hand outer side → wrist outer
C 87,99 87,92 87,82               ← R forearm outer
C 88,71 89,60 89,50               ← R upper arm outer
C 89,43 87,38 82,36               ← R deltoid cap
C 74,29 62,25 57,22               ← R trapezius slope → R neck base
Z
```

---

## Annotated Female Path (`FEMALE_BODY_PATH`)

Same tracing direction. Female differences vs male: narrower shoulders/arms,
high nipped waist (y=67), pronounced hip flare (x=22 widest), wider crotch
bridge (18u vs male 12u).

```
M 44,22                           ← start: L neck base
C 39,25 28,30 22,36               ← L trapezius slope → acromion (narrower)
C 18,38 15,43 15,50               ← L deltoid cap (slimmer)
C 15,60 15,71 15,82               ← L upper arm outer (slimmer)
C 15,92 15,99 15,104              ← L forearm outer
C 13,114 15,120 18,120            ← L hand outer → fingertip
C 21,120 23,114 21,104            ← L hand inner → wrist inner
C 21,98 21,90 22,82               ← L forearm inner
C 23,72 24,62 27,52               ← L upper arm inner / armpit
C 28,57 33,61 37,67               ← L armpit → high narrow waist
C 35,75 28,84 23,92               ← L waist → hip flare (pronounced sweep)
C 22,98 22,108 22,118             ← L outer thigh upper
C 22,128 23,138 24,146            ← L outer thigh → knee
C 23,154 22,162 24,170            ← L outer calf → ankle
L 23,176                          ← L heel
C 26,178 33,178 39,176            ← L sole
L 39,170                          ← L inner ankle
C 40,160 41,148 41,138            ← L inner calf
C 42,128 42,118 42,108            ← L inner thigh lower
C 42,102 42,98 41,93              ← L inner thigh upper
L 59,93                           ← crotch bridge (wider 18u pelvis) →
C 58,98 58,102 58,108             ← R inner thigh upper
C 58,118 58,128 59,138            ← R inner thigh lower
C 59,148 60,160 61,170            ← R inner calf
L 61,176                          ← R inner foot bottom
C 67,178 74,178 77,176            ← R sole
L 76,170                          ← R outer ankle
C 78,162 77,154 76,146            ← R outer calf → knee
C 77,138 78,128 78,118            ← R outer thigh lower
C 78,108 78,98 77,92              ← R outer thigh → hip flare
C 72,84 65,75 63,67               ← R hip → waist
C 67,61 72,57 73,52               ← R waist → armpit
C 76,62 77,72 78,82               ← R upper arm inner
C 79,90 79,98 79,104              ← R forearm inner
C 77,114 79,120 82,120            ← R hand inner → fingertip
C 85,120 87,114 85,104            ← R hand outer → wrist outer
C 85,99 85,92 85,82               ← R forearm outer
C 85,71 85,60 85,50               ← R upper arm outer
C 85,43 82,38 78,36               ← R deltoid cap
C 72,30 61,25 56,22               ← R trapezius slope → R neck base
Z
```

---

## Key Joint Coordinates (current)

| Joint | Male x | Male y | Female x | Female y |
|-------|--------|--------|----------|----------|
| Neck base (L) | 43 | 22 | 44 | 22 |
| Acromion (L) | 18 | 36 | 22 | 36 |
| Outer arm widest (L) | 11 | 50 | 15 | 50 |
| Elbow region (L) | 13 | 82 | 15 | 82 |
| Wrist outer (L) | 13 | 104 | 15 | 104 |
| Wrist inner (L) | 19 | 104 | 21 | 104 |
| Armpit (inner arm end, L) | 24 | 52 | 27 | 52 |
| Waist narrowest (L) | 34 | 72 | 37 | 67 |
| Hip widest (L) | 29 | 91 | 23 | 92 |
| Crotch bridge | 44–56 | 93 | 41–59 | 93 |
| Knee outer (L) | 30 | 146 | 24 | 146 |
| Outer calf widest (L) | 27 | 162 | 22 | 162 |
| Ankle outer (L) | 28 | 170 | 24 | 170 |
| Heel | 28 | 176 | 23 | 176 |
| Toe / sole inner | 41 | 176 | 39 | 176 |

---

## How to Edit a Specific Body Region

Find the annotated segment(s) above, then change the **endpoint** of the relevant `C` or `L` command.
The two control points of a cubic bezier (`C cp1x,cp1y cp2x,cp2y ex,ey`) control the tangent at entry and exit; move `cp2` to adjust the exit curve shape.

**For C1-continuous joints**, when you move an endpoint you should also adjust adjacent control points so tangents stay aligned. In the male outer arm chain `C 11,60 12,71 13,82 / C 13,92 13,99 13,104`, both segments approach (13,82) along the same vertical-ish tangent — keep that alignment if you re-shape.

### To widen/narrow shoulders
Change the acromion endpoint x:
Male L: `C 38,25 26,29 18,36` — `18,36` is the acromion (mirror R: `82,36`).
Decrease x to widen, increase to narrow.

### To raise/lower the knees
Shift y of the knee inflexion point (currently y=146) and adjacent thigh/calf segments proportionally. The full leg chain spans `y=91 (hip) → y=170 (ankle)`.

### To adjust waist
Male: change `34,72` in `C 25,57 30,64 34,72` (mirror `66,72` in `C 70,64 75,57 76,52`).
Female: change `37,67` in `C 28,57 33,61 37,67` (mirror `63,67`).

### To reshape the female hip flare
`C 35,75 28,84 23,92` — `23,92` is the widest hip point. Move x left for wider flare; move y up to raise the curve.

---

## Anatomical Detail Lines

`FRONT_LINES` and `BACK_LINES` in `bodymap.ts` are thin decorative strokes:

```
fill="none"  stroke="rgba(255,255,255,1)"  strokeOpacity=0.10  strokeWidth=0.28
```

Front lines: clavicles, sternum/linea alba, lower pec crease, ab segmentation, quad ridges, kneecaps.
Back lines: spine, glute crease, hamstring separation, gastroc head split.
These carry no `mid` and are not interactive.
