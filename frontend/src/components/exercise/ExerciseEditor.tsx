import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Copy, FlipHorizontal2, Layers, Pause, Play, Plus, RotateCcw,
  Save, Trash2, Wand2,
} from "lucide-react";
import {
  DEFAULT_BARBELL_HUB_R,
  DEFAULT_BARBELL_LENGTH,
  DEFAULT_BARBELL_PLATE_R,
  DEFAULT_BARBELL_THICKNESS,
  DEFAULT_BENCH_H,
  DEFAULT_BENCH_LEG_H,
  DEFAULT_BENCH_LEG_INSET,
  DEFAULT_BENCH_POS,
  DEFAULT_BENCH_W,
  DEFAULT_WIRE_SAG,
  DEFAULT_WIRE_THICKNESS,
  FigureBody,
  VB_H, VB_W,
  lerpFrameEquip,
  lerpPose,
  lerpPt,
  type BarbellEquipment,
  type BenchEquipment,
  type Equipment,
  type FrameEquipState,
  type Point,
  type Pose,
  type WireEquipment,
} from "./StickFigure";
import ExerciseAnimation, { type Frame } from "./ExerciseAnimation";
import { MOTIONS, type ExerciseMotion } from "../../data/exerciseMotions";
import {
  exportMotionAsTs, loadAllMotions, refreshMotions, saveMotion, deleteMotionRow,
} from "../../data/motionStorage";

// Token persistence matches WorkoutTracker.tsx — keep in sync.
const TOKEN_KEY = "iron_log_token";
function authFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(opts.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...opts, headers });
}

// Keyframe editor — drag joints with the mouse, scrub through the cycle,
// add/delete frames, then save to the backend. The /exercise-graphics demo
// reads the same store so edits show up there immediately.

const PRIMARY_JOINT_KEYS = [
  "head", "neck", "shoulder", "elbow", "hand",
  "hip", "knee", "ankle", "toe",
] as const;
type PrimaryJointKey = typeof PRIMARY_JOINT_KEYS[number];

const ARM2_KEYS = ["arm2_shoulder", "arm2_elbow", "arm2_hand"] as const;
const LEG2_KEYS = ["leg2_hip", "leg2_knee", "leg2_ankle", "leg2_toe"] as const;
type Arm2HandleKey = typeof ARM2_KEYS[number];
type Leg2HandleKey = typeof LEG2_KEYS[number];

// HandleKey covers every draggable handle on the editor stage:
//  - primary joints
//  - arm2_* / leg2_* (only shown when the rig mode is "independent")
//  - "bar"             — the legacy single-bar handle
//  - "eq:<id>:<part>"  — per-equipment handles. parts:
//        barbell → "pos" (center) and "tip" (right plate; encodes length+angle)
//        bench   → "pos" (top-left corner) and "size" (bottom-right corner)
//        wire    → "from" / "to"
type HandleKey =
  | PrimaryJointKey
  | Arm2HandleKey
  | Leg2HandleKey
  | "bar"
  | `eq:${string}:${string}`;

const HANDLE_R = 4.5;
const HANDLE_R_ACTIVE = 6;

export default function ExerciseEditor() {
  // ── State ────────────────────────────────────────────────────────────────
  const initialId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("id");
    if (fromUrl && (MOTIONS[fromUrl] || loadAllMotions()[fromUrl])) return fromUrl;
    return Object.keys(MOTIONS)[0];
  }, []);

  const [exerciseId, setExerciseId] = useState<string>(initialId);
  const [motion, setMotion] = useState<ExerciseMotion>(() => clone(loadAllMotions()[initialId]));
  const [selectedFrame, setSelectedFrame] = useState<number>(0);
  const [previewT, setPreviewT] = useState<number>(0);  // 0..1 along the cycle
  const [playing, setPlaying] = useState<boolean>(false);
  const [dirty, setDirty] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Onion-skin toggles. Default: previous frame ghost ON, next frame OFF.
  const [showPrevGhost, setShowPrevGhost] = useState<boolean>(true);
  const [showNextGhost, setShowNextGhost] = useState<boolean>(false);
  const [ghostOpacity, setGhostOpacity] = useState<number>(0.22);

  // Inspector focus — which piece of equipment is currently selected for
  // geometry editing.
  const [selectedEquipId, setSelectedEquipId] = useState<string | null>(null);

  // Snap-to-grid toggle for joint dragging.
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);

  // Pull the latest motions from the backend on mount so the snapshot above
  // gets upgraded as soon as the network responds.
  useEffect(() => {
    void refreshMotions().then(() => {
      setMotion(clone(loadAllMotions()[exerciseId]));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload baseline when the exercise selection changes.
  useEffect(() => {
    const fresh = clone(loadAllMotions()[exerciseId]);
    setMotion(fresh);
    setSelectedFrame(0);
    setPreviewT(fresh.frames[0]?.t ?? 0);
    setDirty(false);
    setSelectedEquipId(null);
  }, [exerciseId]);

  // Drive the preview-t while playing.
  useEffect(() => {
    if (!playing) return;
    let raf: number;
    const start = performance.now();
    const dur = motion.duration ?? 2400;
    const baseT = previewT;
    const tick = (now: number) => {
      const elapsed = ((now - start) / dur + baseT) % 1;
      setPreviewT(elapsed);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, motion.duration]);

  // ── Derived values ───────────────────────────────────────────────────────
  const frame = motion.frames[selectedFrame] ?? motion.frames[0];
  const isAtSelected = Math.abs(previewT - (frame?.t ?? 0)) < 1e-3;
  const sampled = isAtSelected
    ? { pose: frame.pose, bar: frame.bar, equipment: frame.equipment }
    : sampleFrames(motion.frames, previewT);
  const displayedPose = sampled.pose;
  const displayedBar = sampled.bar;
  const displayedEquip = sampled.equipment;

  const prevGhostFrame: Frame | undefined =
    showPrevGhost && motion.frames.length > 1
      ? motion.frames[(selectedFrame - 1 + motion.frames.length) % motion.frames.length]
      : undefined;
  const nextGhostFrame: Frame | undefined =
    showNextGhost && motion.frames.length > 1
      ? motion.frames[(selectedFrame + 1) % motion.frames.length]
      : undefined;

  // ── Mutations ────────────────────────────────────────────────────────────
  const mutateFrame = useCallback((mut: (f: Frame) => Frame) => {
    setMotion(m => {
      const frames = m.frames.slice();
      frames[selectedFrame] = mut(clone(frames[selectedFrame]));
      return { ...m, frames };
    });
    setDirty(true);
  }, [selectedFrame]);

  const moveHandle = useCallback((key: HandleKey, x: number, y: number) => {
    // Snap to 0.5 viewBox units to keep numbers tidy (when snap is on).
    const sx = snapEnabled ? Math.round(x * 2) / 2 : Math.round(x * 10) / 10;
    const sy = snapEnabled ? Math.round(y * 2) / 2 : Math.round(y * 10) / 10;

    if (key === "bar") {
      mutateFrame(f => ({ ...f, bar: [sx, sy] as Point }));
      return;
    }

    if (key.startsWith("eq:")) {
      const [, id, part] = key.split(":");
      moveEquipHandle(id, part, sx, sy);
      return;
    }

    if (key.startsWith("arm2_")) {
      const joint = key.slice("arm2_".length) as "shoulder" | "elbow" | "hand";
      mutateFrame(f => ({
        ...f,
        pose: { ...f.pose, arm2: { ...(f.pose.arm2 ?? {}), [joint]: [sx, sy] as Point } },
      }));
      return;
    }
    if (key.startsWith("leg2_")) {
      const joint = key.slice("leg2_".length) as "hip" | "knee" | "ankle" | "toe";
      mutateFrame(f => ({
        ...f,
        pose: { ...f.pose, leg2: { ...(f.pose.leg2 ?? {}), [joint]: [sx, sy] as Point } },
      }));
      return;
    }

    mutateFrame(f => ({
      ...f,
      pose: { ...f.pose, [key]: [sx, sy] as Point },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutateFrame, snapEnabled]);

  // Equipment handle moves are slightly more involved — the "tip" handle on a
  // barbell encodes both length and rotation; the "size" handle on a bench
  // sets width & height; wires have two endpoints.
  const moveEquipHandle = useCallback((id: string, part: string, sx: number, sy: number) => {
    const eq = (motion.equipment ?? []).find(e => e.id === id);
    if (!eq) return;

    if (eq.kind === "barbell") {
      const curState = frame.equipment?.[id];
      const curPos: Point = curState?.pos ?? eq.pos ?? [50, 60];
      if (part === "pos") {
        setFrameEquip(id, { pos: [sx, sy] });
      } else if (part === "tip") {
        const dx = sx - curPos[0];
        const dy = sy - curPos[1];
        const length = Math.max(4, Math.hypot(dx, dy) * 2);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        // Length and angle live on the equipment definition (geometry); pos
        // stays as a per-frame override.
        setMotion(m => {
          const list = (m.equipment ?? []).map(e =>
            e.id === id && e.kind === "barbell"
              ? { ...e, length: Math.round(length * 2) / 2 }
              : e,
          );
          return { ...m, equipment: list };
        });
        setFrameEquip(id, { angle: Math.round(angle * 10) / 10 });
        setDirty(true);
      }
      return;
    }

    if (eq.kind === "bench") {
      const curState = frame.equipment?.[id];
      const curPos: Point = curState?.pos ?? eq.pos ?? DEFAULT_BENCH_POS;
      if (part === "pos") {
        setFrameEquip(id, { pos: [sx, sy] });
      } else if (part === "size") {
        const w = Math.max(10, sx - curPos[0]);
        const h = Math.max(2,  sy - curPos[1]);
        setMotion(m => {
          const list = (m.equipment ?? []).map(e =>
            e.id === id && e.kind === "bench"
              ? { ...e, width: Math.round(w * 2) / 2, height: Math.round(h * 2) / 2 }
              : e,
          );
          return { ...m, equipment: list };
        });
        setDirty(true);
      }
      return;
    }

    if (eq.kind === "wire") {
      if (part === "from") setFrameEquip(id, { from: [sx, sy] });
      else if (part === "to") setFrameEquip(id, { to: [sx, sy] });
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motion.equipment, frame]);

  const setFrameEquip = useCallback((id: string, patch: Partial<FrameEquipState>) => {
    mutateFrame(f => {
      const cur = { ...(f.equipment ?? {}) };
      cur[id] = { ...cur[id], ...patch };
      return { ...f, equipment: cur };
    });
  }, [mutateFrame]);

  const addFrame = () => {
    setMotion(m => {
      const frames = m.frames.slice();
      const cur = frames[selectedFrame];
      const next = frames[selectedFrame + 1];
      const newT = next ? clamp01((cur.t + next.t) / 2) : clamp01(cur.t + 0.1);
      const newFrame: Frame = {
        t: newT,
        pose: clone(cur.pose),
        bar: cur.bar ? [...cur.bar] as Point : undefined,
        equipment: cur.equipment ? clone(cur.equipment) : undefined,
      };
      frames.splice(selectedFrame + 1, 0, newFrame);
      return { ...m, frames };
    });
    setSelectedFrame(i => i + 1);
    setDirty(true);
  };

  const duplicateFrame = () => {
    setMotion(m => {
      const frames = m.frames.slice();
      const cur = frames[selectedFrame];
      const dup: Frame = {
        t: clamp01(cur.t + 0.001),
        pose: clone(cur.pose),
        bar: cur.bar ? [...cur.bar] as Point : undefined,
        equipment: cur.equipment ? clone(cur.equipment) : undefined,
      };
      frames.splice(selectedFrame + 1, 0, dup);
      return { ...m, frames };
    });
    setSelectedFrame(i => i + 1);
    setDirty(true);
  };

  const removeFrame = () => {
    if (motion.frames.length <= 1) return;
    setMotion(m => {
      const frames = m.frames.slice();
      frames.splice(selectedFrame, 1);
      return { ...m, frames };
    });
    setSelectedFrame(i => Math.max(0, i - 1));
    setDirty(true);
  };

  const setFrameT = (i: number, t: number) => {
    setMotion(m => {
      const frames = m.frames.slice();
      frames[i] = { ...frames[i], t: clamp01(t) };
      frames.sort((a, b) => a.t - b.t);
      return { ...m, frames };
    });
    setDirty(true);
  };

  const copyFromPrevFrame = () => {
    if (selectedFrame === 0) return;
    setMotion(m => {
      const frames = m.frames.slice();
      const src = frames[selectedFrame - 1];
      const dst = frames[selectedFrame];
      frames[selectedFrame] = {
        ...dst,
        pose: clone(src.pose),
        bar: src.bar ? [...src.bar] as Point : undefined,
        equipment: src.equipment ? clone(src.equipment) : undefined,
      };
      return { ...m, frames };
    });
    setDirty(true);
  };

  // Mirror the current frame's pose & equipment across the vertical centre
  // line (x = 50). Useful for symmetric exercises.
  const flipFrameHorizontally = () => {
    const flip = (p: Point): Point => [VB_W - p[0], p[1]];
    mutateFrame(f => {
      const fp: Pose = {
        head:     flip(f.pose.head),
        neck:     flip(f.pose.neck),
        shoulder: flip(f.pose.shoulder),
        elbow:    flip(f.pose.elbow),
        hand:     flip(f.pose.hand),
        hip:      flip(f.pose.hip),
        knee:     flip(f.pose.knee),
        ankle:    flip(f.pose.ankle),
        toe:      flip(f.pose.toe),
      };
      if (f.pose.arm2) {
        fp.arm2 = {
          shoulder: f.pose.arm2.shoulder ? flip(f.pose.arm2.shoulder) : undefined,
          elbow:    f.pose.arm2.elbow    ? flip(f.pose.arm2.elbow)    : undefined,
          hand:     f.pose.arm2.hand     ? flip(f.pose.arm2.hand)     : undefined,
        };
      }
      if (f.pose.leg2) {
        fp.leg2 = {
          hip:   f.pose.leg2.hip   ? flip(f.pose.leg2.hip)   : undefined,
          knee:  f.pose.leg2.knee  ? flip(f.pose.leg2.knee)  : undefined,
          ankle: f.pose.leg2.ankle ? flip(f.pose.leg2.ankle) : undefined,
          toe:   f.pose.leg2.toe   ? flip(f.pose.leg2.toe)   : undefined,
        };
      }
      const equipPatch = f.equipment
        ? Object.fromEntries(Object.entries(f.equipment).map(([id, st]) => [id, {
            ...st,
            pos:  st.pos  ? flip(st.pos)  : undefined,
            from: st.from ? flip(st.from) : undefined,
            to:   st.to   ? flip(st.to)   : undefined,
            angle: st.angle !== undefined ? -st.angle : undefined,
          }]))
        : undefined;
      return {
        ...f,
        pose: fp,
        bar: f.bar ? flip(f.bar) : undefined,
        equipment: equipPatch,
      };
    });
  };

  // Copy primary arm/leg coordinates into arm2/leg2 for every keyframe so the
  // secondary limbs are immediately editable across the whole animation.
  const seedSecondLimbs = () => {
    setMotion(m => {
      const frames = m.frames.map(f => {
        const pose = clone(f.pose);
        if (!pose.arm2) {
          pose.arm2 = {
            shoulder: [pose.shoulder[0] + 3, pose.shoulder[1]],
            elbow:    [pose.elbow[0]    + 3, pose.elbow[1]],
            hand:     [pose.hand[0]     + 3, pose.hand[1]],
          };
        }
        if (!pose.leg2) {
          pose.leg2 = {
            hip:   [pose.hip[0]   + 3, pose.hip[1]],
            knee:  [pose.knee[0]  + 3, pose.knee[1]],
            ankle: [pose.ankle[0] + 3, pose.ankle[1]],
            toe:   [pose.toe[0]   + 3, pose.toe[1]],
          };
        }
        return { ...f, pose };
      });
      return {
        ...m,
        rig: { ...(m.rig ?? {}), arm2: "independent", leg2: "independent" },
        frames,
      };
    });
    setDirty(true);
  };

  const toggleBar = () => {
    mutateFrame(f => {
      if (f.bar) {
        const out: Frame = { t: f.t, pose: f.pose, equipment: f.equipment };
        return out;
      }
      return { ...f, bar: [...f.pose.hand] as Point };
    });
  };

  const setDuration = (ms: number) => {
    setMotion(m => ({ ...m, duration: Math.max(200, Math.round(ms)) }));
    setDirty(true);
  };

  const toggleFloor = () => {
    setMotion(m => ({ ...m, floor: !m.floor }));
    setDirty(true);
  };

  const toggleBench = () => {
    setMotion(m => ({ ...m, bench: !m.bench }));
    setDirty(true);
  };

  // ── Equipment library ─────────────────────────────────────────────────────
  const addEquipment = (kind: Equipment["kind"]) => {
    setMotion(m => {
      const existing = m.equipment ?? [];
      const id = nextEquipmentId(kind, existing);
      let eq: Equipment;
      if (kind === "barbell") {
        eq = {
          id, kind: "barbell",
          length: DEFAULT_BARBELL_LENGTH,
          plateR: DEFAULT_BARBELL_PLATE_R,
          hubR:   DEFAULT_BARBELL_HUB_R,
          thickness: DEFAULT_BARBELL_THICKNESS,
          pos: [50, 60],
          angle: 0,
        };
      } else if (kind === "bench") {
        eq = {
          id, kind: "bench",
          width:     DEFAULT_BENCH_W,
          height:    DEFAULT_BENCH_H,
          legHeight: DEFAULT_BENCH_LEG_H,
          legInset:  DEFAULT_BENCH_LEG_INSET,
          pos: [...DEFAULT_BENCH_POS] as Point,
          angle: 0,
        };
      } else {
        eq = {
          id, kind: "wire",
          thickness: DEFAULT_WIRE_THICKNESS,
          sag: DEFAULT_WIRE_SAG,
          from: [50, 10],
          to: [50, 80],
        };
      }
      return { ...m, equipment: [...existing, eq] };
    });
    setSelectedEquipId(null);  // useEffect below will pick the new last one
    setDirty(true);
  };

  // Whenever equipment count changes, focus the most recently added piece.
  useEffect(() => {
    const eqs = motion.equipment ?? [];
    if (eqs.length === 0) { setSelectedEquipId(null); return; }
    if (!selectedEquipId || !eqs.some(e => e.id === selectedEquipId)) {
      setSelectedEquipId(eqs[eqs.length - 1].id);
    }
  }, [motion.equipment, selectedEquipId]);

  const removeEquipment = (id: string) => {
    setMotion(m => {
      const list = (m.equipment ?? []).filter(e => e.id !== id);
      const frames = m.frames.map(f => {
        if (!f.equipment) return f;
        const eq = { ...f.equipment };
        delete eq[id];
        return { ...f, equipment: Object.keys(eq).length > 0 ? eq : undefined };
      });
      return { ...m, equipment: list, frames };
    });
    setDirty(true);
  };

  const patchEquipment = (id: string, patch: Partial<Equipment>) => {
    setMotion(m => {
      const list = (m.equipment ?? []).map(e =>
        e.id === id ? ({ ...e, ...patch } as Equipment) : e,
      );
      return { ...m, equipment: list };
    });
    setDirty(true);
  };

  // ── Persistence ──────────────────────────────────────────────────────────
  const save = async () => {
    setSaving(true);
    try {
      await saveMotion(authFetch, exerciseId, motion);
      setDirty(false);
      flashToast("Saved to server");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      flashToast(msg.includes("401") || msg.includes("403")
        ? "Save failed — admin login required"
        : "Save failed — see console");
      console.error("saveMotion failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const revertToBaseline = async () => {
    if (!confirm("Delete the server motion and restore the bundled defaults? This affects every user.")) return;
    try {
      await deleteMotionRow(authFetch, exerciseId);
    } catch (err) {
      console.warn("deleteMotion: ignoring (row may not exist):", err);
    }
    const fresh = clone(MOTIONS[exerciseId] ?? motion);
    setMotion(fresh);
    setSelectedFrame(0);
    setPreviewT(fresh.frames[0]?.t ?? 0);
    setDirty(false);
  };

  const copyExport = async () => {
    const ts = exportMotionAsTs(exerciseId, motion);
    try {
      await navigator.clipboard.writeText(ts);
      flashToast("Copied TS keyframes to clipboard");
    } catch {
      // Fallback: dump to a prompt the user can copy manually.
      window.prompt("Copy the exported keyframes below:", ts);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  const allMotions = useMemo(() => loadAllMotions(), [exerciseId, dirty]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      {/* Top bar */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, padding: "14px 20px",
        borderBottom: "1px solid var(--border)",
        background: "var(--s1)",
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a href="/exercise-graphics" style={iconBtnLink} title="Back to gallery">
            <ArrowLeft size={14} />
          </a>
          <h1 style={{
            fontFamily: "'Nunito', sans-serif",
            fontSize: 14, fontWeight: 900, letterSpacing: 2,
            textTransform: "uppercase",
            margin: 0,
          }}>
            Exercise Keyframe Editor
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <select
            value={exerciseId}
            onChange={e => {
              if (dirty && !confirm("Discard unsaved changes?")) return;
              setExerciseId(e.target.value);
            }}
            style={selectStyle}
          >
            {Object.entries(allMotions)
              .sort((a, b) => a[1].name.localeCompare(b[1].name))
              .map(([id, m]) => (
                <option key={id} value={id}>{m.name} ({id})</option>
              ))}
          </select>

          <button type="button" onClick={save} disabled={!dirty || saving} style={primaryBtn(dirty && !saving)}>
            <Save size={12} /> {saving ? "Saving…" : dirty ? "Save" : "Saved"}
          </button>
          <button type="button" onClick={copyExport} style={ghostBtn}>
            <Copy size={12} /> Export TS
          </button>
          <button type="button" onClick={revertToBaseline} style={ghostBtn} title="Restore bundled keyframes">
            <RotateCcw size={12} /> Revert
          </button>
        </div>
      </header>

      {/* Main */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 320px",
        gap: 20,
        padding: 20,
        maxWidth: 1280, margin: "0 auto",
      }}>
        {/* Stage */}
        <div>
          <EditorStage
            pose={displayedPose}
            bar={displayedBar}
            bench={!!motion.bench}
            floor={!!motion.floor}
            rig={motion.rig}
            equipment={motion.equipment}
            frameEquip={displayedEquip}
            ghosts={[
              ...(prevGhostFrame
                ? [{ frame: prevGhostFrame, opacity: ghostOpacity, color: "var(--accent)" }]
                : []),
              ...(nextGhostFrame
                ? [{ frame: nextGhostFrame, opacity: ghostOpacity * 0.75, color: "var(--warning, #f4a256)" }]
                : []),
            ]}
            editable={isAtSelected}
            onMove={moveHandle}
          />

          {/* Timeline */}
          <Timeline
            frames={motion.frames}
            duration={motion.duration ?? 2400}
            selected={selectedFrame}
            previewT={previewT}
            onSelect={i => {
              setSelectedFrame(i);
              setPreviewT(motion.frames[i].t);
              setPlaying(false);
            }}
            onScrub={t => {
              setPreviewT(t);
              setPlaying(false);
              const idx = motion.frames.findIndex(f => Math.abs(f.t - t) < 0.01);
              if (idx >= 0) setSelectedFrame(idx);
            }}
            onMoveFrameT={(i, t) => {
              setFrameT(i, t);
              setPreviewT(t);
            }}
          />

          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap",
          }}>
            <button type="button" onClick={() => setPlaying(p => !p)} style={ghostBtn}>
              {playing ? <Pause size={12} /> : <Play size={12} />} {playing ? "Pause" : "Play"}
            </button>
            <button type="button" onClick={addFrame} style={ghostBtn}>
              <Plus size={12} /> Add frame
            </button>
            <button type="button" onClick={duplicateFrame} style={ghostBtn} title="Duplicate the selected frame">
              <Copy size={12} /> Duplicate
            </button>
            <button
              type="button"
              onClick={removeFrame}
              style={ghostBtn}
              disabled={motion.frames.length <= 1}
              title={motion.frames.length <= 1 ? "Cannot remove the only frame" : "Delete frame"}
            >
              <Trash2 size={12} /> Delete
            </button>
            <button type="button" onClick={copyFromPrevFrame} style={ghostBtn}
                    disabled={selectedFrame === 0}
                    title="Copy pose + equipment from the previous frame">
              <Wand2 size={12} /> Copy from prev
            </button>
            <button type="button" onClick={flipFrameHorizontally} style={ghostBtn}
                    title="Mirror this frame horizontally">
              <FlipHorizontal2 size={12} /> Flip
            </button>
            <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 6 }}>
              {motion.frames.length} keyframe{motion.frames.length === 1 ? "" : "s"} ·
              Frame {selectedFrame + 1} at t={frame.t.toFixed(3)}
            </span>
          </div>

          {/* Onion-skin controls */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap",
            padding: "8px 12px",
            background: "var(--s1)", border: "1px solid var(--border)", borderRadius: 8,
          }}>
            <span style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1, textTransform: "uppercase",
                           display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Layers size={12} /> Onion-skin
            </span>
            <label style={inlineCheck}>
              <input type="checkbox" checked={showPrevGhost} onChange={e => setShowPrevGhost(e.target.checked)} />
              Prev (cyan)
            </label>
            <label style={inlineCheck}>
              <input type="checkbox" checked={showNextGhost} onChange={e => setShowNextGhost(e.target.checked)} />
              Next (amber)
            </label>
            <label style={{ ...inlineCheck, marginLeft: "auto" }}>
              Opacity
              <input
                type="range" min={0.05} max={0.6} step={0.01}
                value={ghostOpacity}
                onChange={e => setGhostOpacity(Number(e.target.value))}
                style={{ width: 80 }}
              />
              <span style={{ fontSize: 11, color: "var(--muted)", width: 28, textAlign: "right" }}>
                {ghostOpacity.toFixed(2)}
              </span>
            </label>
            <label style={inlineCheck}>
              <input type="checkbox" checked={snapEnabled} onChange={e => setSnapEnabled(e.target.checked)} />
              Snap ½
            </label>
          </div>
        </div>

        {/* Inspector */}
        <aside style={{
          background: "var(--s1)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: 14,
          fontSize: 12,
          maxHeight: "calc(100vh - 110px)",
          overflowY: "auto",
        }}>
          <SectionLabel>Motion settings</SectionLabel>
          <FieldRow label="Duration">
            <input
              type="number"
              value={motion.duration ?? 2400}
              min={200}
              step={100}
              onChange={e => setDuration(Number(e.target.value) || 200)}
              style={inputStyle}
            />
            <span style={{ marginLeft: 6, color: "var(--muted)" }}>ms</span>
          </FieldRow>
          <FieldRow label="Floor">
            <button type="button" onClick={toggleFloor} style={toggleBtn(!!motion.floor)}>
              {motion.floor ? "ON" : "off"}
            </button>
          </FieldRow>
          <FieldRow label="Bench (legacy)">
            <button type="button" onClick={toggleBench} style={toggleBtn(!!motion.bench)}>
              {motion.bench ? "ON" : "off"}
            </button>
          </FieldRow>

          <SectionLabel style={{ marginTop: 16 }}>Rig</SectionLabel>
          <FieldRow label="Feet">
            <select
              value={motion.rig?.feet ?? "oval"}
              onChange={e => { setMotion(m => ({ ...m, rig: { ...(m.rig ?? {}), feet: e.target.value as "oval" | "line" | "none" } })); setDirty(true); }}
              style={inputStyle}
            >
              <option value="oval">oval</option>
              <option value="line">line</option>
              <option value="none">none</option>
            </select>
          </FieldRow>
          <FieldRow label="2nd arm">
            <select
              value={motion.rig?.arm2 ?? "none"}
              onChange={e => { setMotion(m => ({ ...m, rig: { ...(m.rig ?? {}), arm2: e.target.value as "none" | "mirror" | "independent" } })); setDirty(true); }}
              style={inputStyle}
            >
              <option value="none">none</option>
              <option value="mirror">mirror</option>
              <option value="independent">independent</option>
            </select>
          </FieldRow>
          <FieldRow label="2nd leg">
            <select
              value={motion.rig?.leg2 ?? "none"}
              onChange={e => { setMotion(m => ({ ...m, rig: { ...(m.rig ?? {}), leg2: e.target.value as "none" | "mirror" | "independent" } })); setDirty(true); }}
              style={inputStyle}
            >
              <option value="none">none</option>
              <option value="mirror">mirror</option>
              <option value="independent">independent</option>
            </select>
          </FieldRow>
          <button type="button" onClick={seedSecondLimbs} style={{ ...ghostBtn, width: "100%", marginTop: 4 }}
                  title="Switch rig to independent and seed arm2 / leg2 from the primary side">
            Enable full 4 limbs
          </button>

          {/* Equipment library */}
          <SectionLabel style={{ marginTop: 16 }}>Equipment</SectionLabel>
          <EquipmentLibrary
            motion={motion}
            frame={frame}
            selectedId={selectedEquipId}
            onSelect={setSelectedEquipId}
            onAdd={addEquipment}
            onRemove={removeEquipment}
            onPatch={patchEquipment}
            onPatchFrameState={(id, patch) => setFrameEquip(id, patch)}
          />

          <SectionLabel style={{ marginTop: 16 }}>Selected frame</SectionLabel>
          <FieldRow label="t (0..1)">
            <input
              type="number"
              value={frame.t}
              min={0}
              max={1}
              step={0.01}
              onChange={e => setFrameT(selectedFrame, Number(e.target.value))}
              style={inputStyle}
            />
          </FieldRow>
          <FieldRow label="Legacy bar">
            <button type="button" onClick={toggleBar} style={toggleBtn(!!frame.bar)}>
              {frame.bar ? "ON" : "off"}
            </button>
          </FieldRow>

          <SectionLabel style={{ marginTop: 16 }}>Joints</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", rowGap: 4, columnGap: 6 }}>
            <code style={readoutHeader}>name</code>
            <code style={readoutHeader}>x</code>
            <code style={readoutHeader}>y</code>
            {PRIMARY_JOINT_KEYS.map(k => (
              <JointEditor
                key={k}
                label={k}
                point={frame.pose[k]}
                onChange={(x, y) => mutateFrame(f => ({
                  ...f, pose: { ...f.pose, [k]: [x, y] as Point },
                }))}
              />
            ))}
            {motion.rig?.arm2 === "independent" && frame.pose.arm2 && (
              <>
                {(["shoulder", "elbow", "hand"] as const).map(j => (
                  <JointEditor
                    key={`a2_${j}`}
                    label={`arm2.${j}`}
                    point={frame.pose.arm2![j] ?? frame.pose[j]}
                    onChange={(x, y) => mutateFrame(f => ({
                      ...f, pose: { ...f.pose, arm2: { ...(f.pose.arm2 ?? {}), [j]: [x, y] as Point } },
                    }))}
                  />
                ))}
              </>
            )}
            {motion.rig?.leg2 === "independent" && frame.pose.leg2 && (
              <>
                {(["hip", "knee", "ankle", "toe"] as const).map(j => (
                  <JointEditor
                    key={`l2_${j}`}
                    label={`leg2.${j}`}
                    point={frame.pose.leg2![j] ?? frame.pose[j]}
                    onChange={(x, y) => mutateFrame(f => ({
                      ...f, pose: { ...f.pose, leg2: { ...(f.pose.leg2 ?? {}), [j]: [x, y] as Point } },
                    }))}
                  />
                ))}
              </>
            )}
          </div>

          <SectionLabel style={{ marginTop: 16 }}>Tips</SectionLabel>
          <p style={{ color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
            Drag coloured dots to move joints. Scrub the timeline to preview
            between keyframes — joints are only editable when the scrubber sits
            on a keyframe. <kbd>←</kbd>/<kbd>→</kbd> step frames; <kbd>Space</kbd>
            toggles playback; <kbd>D</kbd> duplicates the frame.
          </p>
        </aside>
      </div>

      <KeyboardNav
        framesCount={motion.frames.length}
        onPrev={() => {
          const next = Math.max(0, selectedFrame - 1);
          setSelectedFrame(next);
          setPreviewT(motion.frames[next].t);
          setPlaying(false);
        }}
        onNext={() => {
          const next = Math.min(motion.frames.length - 1, selectedFrame + 1);
          setSelectedFrame(next);
          setPreviewT(motion.frames[next].t);
          setPlaying(false);
        }}
        onTogglePlay={() => setPlaying(p => !p)}
        onDuplicate={duplicateFrame}
        onDelete={removeFrame}
      />

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 20px 40px" }}>
        <SectionLabel>Live preview</SectionLabel>
        <div style={{
          background: "var(--s2)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 12,
          display: "inline-block",
          color: "var(--accent)",
        }}>
          <ExerciseAnimation
            frames={motion.frames}
            duration={motion.duration}
            bench={motion.bench}
            floor={motion.floor}
            rig={motion.rig}
            equipment={motion.equipment}
            width={220}
            height={280}
          />
        </div>
      </div>
    </div>
  );
}

// ── Editor stage ───────────────────────────────────────────────────────────

interface GhostInput {
  frame: Frame;
  opacity: number;
  color?: string;
}

function EditorStage({
  pose, bar, bench, floor, rig, equipment, frameEquip, ghosts, editable, onMove,
}: {
  pose: Pose;
  bar?: Point;
  bench: boolean;
  floor: boolean;
  rig?: ExerciseMotion["rig"];
  equipment?: Equipment[];
  frameEquip?: Record<string, FrameEquipState>;
  ghosts: GhostInput[];
  editable: boolean;
  onMove: (key: HandleKey, x: number, y: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragKey, setDragKey] = useState<HandleKey | null>(null);
  const [hoverKey, setHoverKey] = useState<HandleKey | null>(null);

  const toViewBox = (clientX: number, clientY: number): Point | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const p = pt.matrixTransform(ctm.inverse());
    return [clamp(p.x, -10, VB_W + 10), clamp(p.y, -10, VB_H + 10)];
  };

  const onPointerDown = (key: HandleKey) => (e: React.PointerEvent) => {
    if (!editable) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragKey(key);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragKey) return;
    const pt = toViewBox(e.clientX, e.clientY);
    if (!pt) return;
    onMove(dragKey, pt[0], pt[1]);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragKey) {
      (e.target as Element).releasePointerCapture?.(e.pointerId);
      setDragKey(null);
    }
  };

  // Collect every visible handle in this frame.
  const handles: { key: HandleKey; pos: Point; tint: "joint" | "bar" | "eq" | "arm2" | "leg2" }[] = [];
  PRIMARY_JOINT_KEYS.forEach(k => handles.push({ key: k, pos: pose[k] as Point, tint: "joint" }));
  if (rig?.arm2 === "independent" && pose.arm2) {
    if (pose.arm2.shoulder) handles.push({ key: "arm2_shoulder", pos: pose.arm2.shoulder, tint: "arm2" });
    if (pose.arm2.elbow)    handles.push({ key: "arm2_elbow",    pos: pose.arm2.elbow,    tint: "arm2" });
    if (pose.arm2.hand)     handles.push({ key: "arm2_hand",     pos: pose.arm2.hand,     tint: "arm2" });
  }
  if (rig?.leg2 === "independent" && pose.leg2) {
    if (pose.leg2.hip)   handles.push({ key: "leg2_hip",   pos: pose.leg2.hip,   tint: "leg2" });
    if (pose.leg2.knee)  handles.push({ key: "leg2_knee",  pos: pose.leg2.knee,  tint: "leg2" });
    if (pose.leg2.ankle) handles.push({ key: "leg2_ankle", pos: pose.leg2.ankle, tint: "leg2" });
    if (pose.leg2.toe)   handles.push({ key: "leg2_toe",   pos: pose.leg2.toe,   tint: "leg2" });
  }
  if (bar) handles.push({ key: "bar", pos: bar, tint: "bar" });

  // Equipment handles (center + a second handle that encodes geometry).
  for (const eq of equipment ?? []) {
    const st = frameEquip?.[eq.id];
    if (eq.kind === "barbell") {
      const pos: Point = st?.pos ?? eq.pos ?? [50, 60];
      handles.push({ key: `eq:${eq.id}:pos`, pos, tint: "eq" });
      const length = eq.length ?? DEFAULT_BARBELL_LENGTH;
      const angle  = (st?.angle ?? eq.angle ?? 0) * Math.PI / 180;
      const tip: Point = [
        pos[0] + Math.cos(angle) * length / 2,
        pos[1] + Math.sin(angle) * length / 2,
      ];
      handles.push({ key: `eq:${eq.id}:tip`, pos: tip, tint: "eq" });
    } else if (eq.kind === "bench") {
      const pos: Point = st?.pos ?? eq.pos ?? DEFAULT_BENCH_POS;
      handles.push({ key: `eq:${eq.id}:pos`, pos, tint: "eq" });
      const w = eq.width ?? DEFAULT_BENCH_W;
      const h = eq.height ?? DEFAULT_BENCH_H;
      handles.push({ key: `eq:${eq.id}:size`, pos: [pos[0] + w, pos[1] + h], tint: "eq" });
    } else if (eq.kind === "wire") {
      const from: Point = st?.from ?? eq.from ?? [50, 10];
      const to:   Point = st?.to   ?? eq.to   ?? [50, 80];
      handles.push({ key: `eq:${eq.id}:from`, pos: from, tint: "eq" });
      handles.push({ key: `eq:${eq.id}:to`,   pos: to,   tint: "eq" });
    }
  }

  return (
    <div style={{
      position: "relative",
      background: "var(--s1)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: 16,
      color: "var(--accent)",
    }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        width="100%"
        style={{
          width: "100%",
          maxWidth: 560,
          aspectRatio: `${VB_W} / ${VB_H}`,
          display: "block",
          margin: "0 auto",
          touchAction: "none",
          cursor: dragKey ? "grabbing" : "default",
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Grid for visual reference */}
        <g opacity={0.08} stroke="currentColor" strokeWidth={0.3}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map(i => (
            <line key={`v${i}`} x1={i * 10} y1={0} x2={i * 10} y2={VB_H} />
          ))}
          {Array.from({ length: 16 }, (_, i) => i + 1).map(i => (
            <line key={`h${i}`} x1={0} y1={i * 10} x2={VB_W} y2={i * 10} />
          ))}
        </g>

        {floor && (
          <line
            x1={4} y1={VB_H - 4} x2={VB_W - 4} y2={VB_H - 4}
            stroke="currentColor" strokeWidth={1.2} strokeDasharray="2 4" opacity={0.4}
          />
        )}

        {/* Onion-skin ghosts. */}
        {ghosts.map((g, i) => (
          <g key={`ghost-${i}`} opacity={g.opacity} style={{ color: g.color ?? "var(--accent)" }} pointerEvents="none">
            <FigureBody
              pose={g.frame.pose}
              bar={g.frame.bar}
              plateR={5.5}
              hubR={2}
              hubColor="var(--bg)"
              bench={false}
              rig={rig}
              color="currentColor"
              equipment={equipment}
              frameEquip={g.frame.equipment}
              ghost
            />
          </g>
        ))}

        {/* Live figure (non-interactive — handles sit over the top). */}
        <g pointerEvents="none">
          <FigureBody
            pose={pose}
            bar={bar}
            plateR={5.5}
            hubR={2}
            hubColor="var(--bg)"
            bench={bench}
            rig={rig}
            color="currentColor"
            equipment={equipment}
            frameEquip={frameEquip}
          />
        </g>

        {/* Interactive handles */}
        {handles.map(({ key, pos, tint }) => {
          const active = dragKey === key || hoverKey === key;
          const fill =
            tint === "bar"  ? "var(--warning, #f4a256)" :
            tint === "eq"   ? "var(--warning, #f4a256)" :
            tint === "arm2" ? "#9b87f5" :
            tint === "leg2" ? "#5dd6a8" :
                              "var(--accent)";
          return (
            <g key={key}>
              <circle
                cx={pos[0]} cy={pos[1]}
                r={active ? HANDLE_R_ACTIVE : HANDLE_R}
                fill={fill}
                fillOpacity={editable ? (active ? 0.95 : 0.6) : 0.25}
                stroke="var(--bg)"
                strokeWidth={1.2}
                style={{ cursor: editable ? "grab" : "not-allowed" }}
                onPointerDown={onPointerDown(key)}
                onPointerEnter={() => setHoverKey(key)}
                onPointerLeave={() => setHoverKey(null)}
              />
              {active && (
                <text
                  x={pos[0] + HANDLE_R_ACTIVE + 1.5}
                  y={pos[1] - HANDLE_R_ACTIVE - 1}
                  fontSize={4.5}
                  fill="currentColor"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {key} {pos[0].toFixed(1)},{pos[1].toFixed(1)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {!editable && (
        <div style={{
          position: "absolute", top: 10, right: 14,
          fontSize: 10, color: "var(--muted)",
          letterSpacing: 1, textTransform: "uppercase",
        }}>
          Preview — scrub to a keyframe to edit
        </div>
      )}
    </div>
  );
}

// ── Equipment library panel ────────────────────────────────────────────────

function EquipmentLibrary({
  motion, frame, selectedId, onSelect, onAdd, onRemove, onPatch, onPatchFrameState,
}: {
  motion: ExerciseMotion;
  frame: Frame;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (kind: Equipment["kind"]) => void;
  onRemove: (id: string) => void;
  onPatch: (id: string, patch: Partial<Equipment>) => void;
  onPatchFrameState: (id: string, patch: Partial<FrameEquipState>) => void;
}) {
  const eqs = motion.equipment ?? [];
  const selected = eqs.find(e => e.id === selectedId);
  const st = selected ? frame.equipment?.[selected.id] : undefined;

  return (
    <div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        <button type="button" onClick={() => onAdd("barbell")} style={{ ...ghostBtn, flex: 1, minWidth: 80 }}>
          <Plus size={11} /> Barbell
        </button>
        <button type="button" onClick={() => onAdd("bench")} style={{ ...ghostBtn, flex: 1, minWidth: 80 }}>
          <Plus size={11} /> Bench
        </button>
        <button type="button" onClick={() => onAdd("wire")} style={{ ...ghostBtn, flex: 1, minWidth: 80 }}>
          <Plus size={11} /> Wire
        </button>
      </div>

      {eqs.length === 0 && (
        <p style={{ color: "var(--muted)", fontSize: 11, marginTop: 8, marginBottom: 0 }}>
          No stage equipment yet. Add a barbell, bench, or cable above.
        </p>
      )}

      {eqs.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          {eqs.map(eq => (
            <div
              key={eq.id}
              onClick={() => onSelect(eq.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "4px 8px",
                border: `1px solid ${selectedId === eq.id ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 6,
                cursor: "pointer",
                background: selectedId === eq.id ? "var(--ad, transparent)" : "transparent",
              }}
            >
              <code style={{ fontSize: 11, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {eq.kind} · {eq.id}
              </code>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onRemove(eq.id); }}
                style={{ ...ghostBtn, padding: "2px 6px", fontSize: 10 }}
                title="Remove equipment"
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div style={{
          marginTop: 10, padding: 8,
          border: "1px solid var(--border)", borderRadius: 8,
          background: "var(--s2)",
        }}>
          <SectionLabel>{selected.kind} geometry</SectionLabel>
          {selected.kind === "barbell" && (
            <BarbellInspector
              eq={selected as BarbellEquipment}
              state={st}
              onPatch={p => onPatch(selected.id, p)}
              onPatchFrame={p => onPatchFrameState(selected.id, p)}
            />
          )}
          {selected.kind === "bench" && (
            <BenchInspector
              eq={selected as BenchEquipment}
              state={st}
              onPatch={p => onPatch(selected.id, p)}
              onPatchFrame={p => onPatchFrameState(selected.id, p)}
            />
          )}
          {selected.kind === "wire" && (
            <WireInspector
              eq={selected as WireEquipment}
              state={st}
              onPatch={p => onPatch(selected.id, p)}
              onPatchFrame={p => onPatchFrameState(selected.id, p)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function BarbellInspector({
  eq, state, onPatch, onPatchFrame,
}: {
  eq: BarbellEquipment;
  state?: FrameEquipState;
  onPatch: (p: Partial<BarbellEquipment>) => void;
  onPatchFrame: (p: Partial<FrameEquipState>) => void;
}) {
  const pos = state?.pos ?? eq.pos ?? [50, 60];
  const angle = state?.angle ?? eq.angle ?? 0;
  return (
    <>
      <FieldRow label="Length">
        <NumInput value={eq.length ?? DEFAULT_BARBELL_LENGTH} min={4} max={90} step={0.5}
                  onChange={v => onPatch({ length: v })} />
      </FieldRow>
      <FieldRow label="Plate R">
        <NumInput value={eq.plateR ?? DEFAULT_BARBELL_PLATE_R} min={1} max={20} step={0.5}
                  onChange={v => onPatch({ plateR: v })} />
      </FieldRow>
      <FieldRow label="Hub R">
        <NumInput value={eq.hubR ?? DEFAULT_BARBELL_HUB_R} min={0} max={10} step={0.25}
                  onChange={v => onPatch({ hubR: v })} />
      </FieldRow>
      <FieldRow label="Bar thick">
        <NumInput value={eq.thickness ?? DEFAULT_BARBELL_THICKNESS} min={0.4} max={6} step={0.1}
                  onChange={v => onPatch({ thickness: v })} />
      </FieldRow>
      <FieldRow label="Pos (this frame)">
        <PointInputs point={pos} onChange={p => onPatchFrame({ pos: p })} />
      </FieldRow>
      <FieldRow label="Angle°">
        <NumInput value={angle} min={-180} max={180} step={1}
                  onChange={v => onPatchFrame({ angle: v })} />
      </FieldRow>
    </>
  );
}

function BenchInspector({
  eq, state, onPatch, onPatchFrame,
}: {
  eq: BenchEquipment;
  state?: FrameEquipState;
  onPatch: (p: Partial<BenchEquipment>) => void;
  onPatchFrame: (p: Partial<FrameEquipState>) => void;
}) {
  const pos = state?.pos ?? eq.pos ?? DEFAULT_BENCH_POS;
  const angle = state?.angle ?? eq.angle ?? 0;
  return (
    <>
      <FieldRow label="Width">
        <NumInput value={eq.width ?? DEFAULT_BENCH_W} min={10} max={100} step={0.5}
                  onChange={v => onPatch({ width: v })} />
      </FieldRow>
      <FieldRow label="Pad height">
        <NumInput value={eq.height ?? DEFAULT_BENCH_H} min={2} max={30} step={0.5}
                  onChange={v => onPatch({ height: v })} />
      </FieldRow>
      <FieldRow label="Leg height">
        <NumInput value={eq.legHeight ?? DEFAULT_BENCH_LEG_H} min={0} max={60} step={0.5}
                  onChange={v => onPatch({ legHeight: v })} />
      </FieldRow>
      <FieldRow label="Leg inset">
        <NumInput value={eq.legInset ?? DEFAULT_BENCH_LEG_INSET} min={0} max={30} step={0.5}
                  onChange={v => onPatch({ legInset: v })} />
      </FieldRow>
      <FieldRow label="Opacity">
        <NumInput value={eq.opacity ?? 0.5} min={0} max={1} step={0.05}
                  onChange={v => onPatch({ opacity: v })} />
      </FieldRow>
      <FieldRow label="Pos (this frame)">
        <PointInputs point={pos} onChange={p => onPatchFrame({ pos: p })} />
      </FieldRow>
      <FieldRow label="Angle°">
        <NumInput value={angle} min={-90} max={90} step={1}
                  onChange={v => onPatchFrame({ angle: v })} />
      </FieldRow>
    </>
  );
}

function WireInspector({
  eq, state, onPatch, onPatchFrame,
}: {
  eq: WireEquipment;
  state?: FrameEquipState;
  onPatch: (p: Partial<WireEquipment>) => void;
  onPatchFrame: (p: Partial<FrameEquipState>) => void;
}) {
  const from = state?.from ?? eq.from ?? [50, 10];
  const to   = state?.to   ?? eq.to   ?? [50, 80];
  return (
    <>
      <FieldRow label="Thickness">
        <NumInput value={eq.thickness ?? DEFAULT_WIRE_THICKNESS} min={0.2} max={6} step={0.1}
                  onChange={v => onPatch({ thickness: v })} />
      </FieldRow>
      <FieldRow label="Sag">
        <NumInput value={eq.sag ?? DEFAULT_WIRE_SAG} min={-20} max={20} step={0.5}
                  onChange={v => onPatch({ sag: v })} />
      </FieldRow>
      <FieldRow label="Dashed">
        <button type="button" onClick={() => onPatch({ dashed: !eq.dashed })} style={toggleBtn(!!eq.dashed)}>
          {eq.dashed ? "ON" : "off"}
        </button>
      </FieldRow>
      <FieldRow label="From (this frame)">
        <PointInputs point={from} onChange={p => onPatchFrame({ from: p })} />
      </FieldRow>
      <FieldRow label="To (this frame)">
        <PointInputs point={to} onChange={p => onPatchFrame({ to: p })} />
      </FieldRow>
    </>
  );
}

// ── Timeline ──────────────────────────────────────────────────────────────

function Timeline({
  frames, duration, selected, previewT, onSelect, onScrub, onMoveFrameT,
}: {
  frames: Frame[];
  duration: number;
  selected: number;
  previewT: number;
  onSelect: (i: number) => void;
  onScrub: (t: number) => void;
  onMoveFrameT: (i: number, t: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState<number | "scrub" | null>(null);

  const xToT = (clientX: number): number => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return clamp01((clientX - rect.left) / rect.width);
  };

  return (
    <div style={{
      marginTop: 14,
      background: "var(--s1)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      padding: "10px 14px 14px",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 8,
      }}>
        <span style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 1, textTransform: "uppercase" }}>
          Timeline
        </span>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>
          t = {previewT.toFixed(3)} · {Math.round(previewT * duration)}ms
        </span>
      </div>
      <div
        ref={trackRef}
        onPointerDown={e => {
          const el = trackRef.current;
          if (el) {
            el.setPointerCapture?.(e.pointerId);
            (el as HTMLElement & { _capturedId?: number })._capturedId = e.pointerId;
          }
          if (dragging === null) {
            setDragging("scrub");
            onScrub(xToT(e.clientX));
          }
        }}
        onPointerMove={e => {
          if (dragging === null) return;
          const t = xToT(e.clientX);
          if (dragging === "scrub") onScrub(t);
          else onMoveFrameT(dragging, t);
        }}
        onPointerUp={e => {
          trackRef.current?.releasePointerCapture?.(e.pointerId);
          setDragging(null);
        }}
        onPointerCancel={() => setDragging(null)}
        style={{
          position: "relative",
          height: 40,
          background: "var(--s2)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          cursor: "ew-resize",
          touchAction: "none",
        }}
      >
        {/* Tick marks at quarter divisions */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <div key={t} style={{
            position: "absolute",
            left: `${t * 100}%`,
            top: 0, bottom: 0,
            width: 1,
            background: "var(--border)",
            opacity: 0.6,
          }} />
        ))}

        {/* Scrubber line */}
        <div style={{
          position: "absolute",
          left: `${previewT * 100}%`,
          top: -2, bottom: -2,
          width: 2,
          background: "var(--accent)",
          borderRadius: 1,
          pointerEvents: "none",
        }} />

        {/* Keyframe dots */}
        {frames.map((f, i) => (
          <button
            key={i}
            type="button"
            onPointerDown={e => {
              e.stopPropagation();
              setDragging(i);
              onSelect(i);
              trackRef.current?.setPointerCapture?.(e.pointerId);
            }}
            title={`Frame ${i + 1} at t=${f.t.toFixed(3)}`}
            style={{
              position: "absolute",
              left: `${f.t * 100}%`,
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: i === selected ? 18 : 14,
              height: i === selected ? 18 : 14,
              borderRadius: "50%",
              background: i === selected ? "var(--accent)" : "var(--s1)",
              border: "2px solid var(--accent)",
              color: i === selected ? "var(--bg)" : "var(--accent)",
              fontSize: 9, fontWeight: 700,
              cursor: "grab",
              touchAction: "none",
              padding: 0,
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Misc UI helpers ────────────────────────────────────────────────────────

function KeyboardNav({
  framesCount, onPrev, onNext, onTogglePlay, onDuplicate, onDelete,
}: {
  framesCount: number;
  onPrev: () => void;
  onNext: () => void;
  onTogglePlay: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowLeft")  { e.preventDefault(); onPrev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); onNext(); }
      if (e.key === " ")          { e.preventDefault(); onTogglePlay(); }
      if (e.key === "d" || e.key === "D") { e.preventDefault(); onDuplicate(); }
      if (e.key === "Delete" || e.key === "Backspace") {
        // Only handle Delete; Backspace would steal regular text input but we
        // already guard against INPUT focus above.
        if (e.key === "Delete") { e.preventDefault(); onDelete(); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [framesCount, onPrev, onNext, onTogglePlay, onDuplicate, onDelete]);
  return null;
}

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase",
      color: "var(--muted)", marginBottom: 6, ...style,
    }}>
      {children}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 8, marginBottom: 6,
    }}>
      <span style={{ color: "var(--text)" }}>{label}</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>{children}</span>
    </div>
  );
}

function JointEditor({
  label, point, onChange,
}: { label: string; point: Point; onChange: (x: number, y: number) => void }) {
  return (
    <>
      <code style={{ color: "var(--muted)", fontSize: 11, alignSelf: "center" }}>{label}</code>
      <NumInput value={point[0]} step={0.5} compact onChange={x => onChange(x, point[1])} />
      <NumInput value={point[1]} step={0.5} compact onChange={y => onChange(point[0], y)} />
    </>
  );
}

function NumInput({
  value, onChange, min, max, step = 0.5, compact,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number; max?: number;
  step?: number;
  compact?: boolean;
}) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      min={min} max={max} step={step}
      onChange={e => {
        const n = Number(e.target.value);
        if (Number.isFinite(n)) onChange(n);
      }}
      style={{ ...inputStyle, width: compact ? 56 : 80 }}
    />
  );
}

function PointInputs({ point, onChange }: { point: Point; onChange: (p: Point) => void }) {
  return (
    <>
      <NumInput value={point[0]} step={0.5} compact onChange={x => onChange([x, point[1]])} />
      <NumInput value={point[1]} step={0.5} compact onChange={y => onChange([point[0], y])} />
    </>
  );
}

function flashToast(msg: string) {
  const el = document.createElement("div");
  el.textContent = msg;
  Object.assign(el.style, {
    position: "fixed", bottom: "20px", left: "50%",
    transform: "translateX(-50%)",
    background: "var(--accent)", color: "var(--bg)",
    padding: "8px 16px", borderRadius: "8px",
    fontSize: "12px", fontFamily: "'Nunito', sans-serif",
    fontWeight: "700", letterSpacing: "1px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    zIndex: "9999",
  } as CSSStyleDeclaration);
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}

// ── Pure helpers ───────────────────────────────────────────────────────────

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const clamp01 = (n: number) => clamp(n, 0, 1);

const ease = (t: number) => 0.5 - 0.5 * Math.cos(t * Math.PI);

function sampleFrames(frames: Frame[], t: number): {
  pose: Pose; bar?: Point; equipment?: Record<string, FrameEquipState>;
} {
  if (frames.length === 0) throw new Error("no frames");
  if (frames.length === 1) {
    return { pose: frames[0].pose, bar: frames[0].bar, equipment: frames[0].equipment };
  }
  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i], b = frames[i + 1];
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t || 1;
      const local = ease((t - a.t) / span);
      return {
        pose: lerpPose(a.pose, b.pose, local),
        bar: a.bar && b.bar ? lerpPt(a.bar, b.bar, local) : a.bar ?? b.bar,
        equipment: lerpFrameEquip(a.equipment, b.equipment, local),
      };
    }
  }
  const last = frames[frames.length - 1];
  return { pose: last.pose, bar: last.bar, equipment: last.equipment };
}

function nextEquipmentId(kind: Equipment["kind"], existing: Equipment[]): string {
  // Find the lowest unused integer suffix for this kind.
  const used = new Set(existing
    .filter(e => e.id.startsWith(kind))
    .map(e => Number(e.id.slice(kind.length).replace(/^_?/, ""))));
  let i = 1;
  while (used.has(i)) i++;
  return `${kind}_${i}`;
}

// ── Styles ─────────────────────────────────────────────────────────────────

const iconBtnLink: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: 28, height: 28,
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--text)",
  cursor: "pointer",
  textDecoration: "none",
};

const ghostBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "transparent",
  border: "1px solid var(--border)",
  color: "var(--text)",
  borderRadius: 8, padding: "6px 10px",
  fontSize: 11, letterSpacing: 1, textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
};

const primaryBtn = (active: boolean): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 6,
  background: active ? "var(--accent)" : "transparent",
  color: active ? "var(--bg)" : "var(--muted)",
  border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
  borderRadius: 8, padding: "6px 10px",
  fontSize: 11, letterSpacing: 1, textTransform: "uppercase",
  cursor: active ? "pointer" : "default",
  fontFamily: "inherit",
  fontWeight: 700,
});

const selectStyle: React.CSSProperties = {
  background: "var(--s2)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 12,
  fontFamily: "inherit",
  maxWidth: 280,
};

const inputStyle: React.CSSProperties = {
  background: "var(--s2)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "4px 6px",
  fontSize: 11,
  fontFamily: "inherit",
  width: 80,
};

const toggleBtn = (on: boolean): React.CSSProperties => ({
  background: on ? "var(--accent)" : "var(--s2)",
  color: on ? "var(--bg)" : "var(--muted)",
  border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
  borderRadius: 6,
  padding: "3px 10px",
  fontSize: 10, letterSpacing: 1, textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
});

const inlineCheck: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 4,
  fontSize: 11, color: "var(--text)",
};

const readoutHeader: React.CSSProperties = {
  fontSize: 9,
  color: "var(--muted)",
  letterSpacing: 1,
  textTransform: "uppercase",
};
