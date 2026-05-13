import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Copy, Pause, Play, Plus, RotateCcw, Save, Trash2,
} from "lucide-react";
import {
  HEAD_R, VB_H, VB_W, lerpPose, lerpPt,
  type Point, type Pose,
} from "./StickFigure";
import ExerciseAnimation, { type Frame } from "./ExerciseAnimation";
import { MOTIONS, type ExerciseMotion } from "../../data/exerciseMotions";
import {
  clearOverride, exportMotionAsTs, loadAllMotions, saveOverride,
} from "../../data/motionStorage";

// Keyframe editor — drag joints with the mouse, scrub through the cycle,
// add/delete frames, then save to localStorage. The /exercise-graphics demo
// reads the same store so edits show up there immediately.

const JOINT_KEYS = [
  "head", "neck", "shoulder", "elbow", "hand",
  "hip", "knee", "ankle", "toe",
] as const;
type JointKey = typeof JOINT_KEYS[number];
type HandleKey = JointKey | "bar";

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

  // Reload baseline when the exercise selection changes.
  useEffect(() => {
    const fresh = clone(loadAllMotions()[exerciseId]);
    setMotion(fresh);
    setSelectedFrame(0);
    setPreviewT(fresh.frames[0]?.t ?? 0);
    setDirty(false);
  }, [exerciseId]);

  // Drive the preview-t while playing.
  useEffect(() => {
    if (!playing) return;
    let raf: number;
    let start = performance.now();
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
  const displayedPose = isAtSelected ? frame.pose : sampleFrames(motion.frames, previewT).pose;
  const displayedBar = isAtSelected ? frame.bar : sampleFrames(motion.frames, previewT).bar;

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
    // Snap to 0.5 viewBox units to keep numbers tidy.
    const sx = Math.round(x * 2) / 2;
    const sy = Math.round(y * 2) / 2;
    mutateFrame(f => {
      if (key === "bar") return { ...f, bar: [sx, sy] };
      return { ...f, pose: { ...f.pose, [key]: [sx, sy] as Point } };
    });
  }, [mutateFrame]);

  const addFrame = () => {
    setMotion(m => {
      const frames = m.frames.slice();
      // Insert a new frame just after the selected one, halfway to the next
      // (or at +0.1 if it's the last frame).
      const cur = frames[selectedFrame];
      const next = frames[selectedFrame + 1];
      const newT = next ? clamp01((cur.t + next.t) / 2) : clamp01(cur.t + 0.1);
      const newFrame: Frame = {
        t: newT,
        pose: clone(cur.pose),
        bar: cur.bar ? [...cur.bar] as Point : undefined,
      };
      frames.splice(selectedFrame + 1, 0, newFrame);
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

  const toggleBar = () => {
    mutateFrame(f => {
      if (f.bar) {
        const { bar, ...rest } = f;
        return rest as Frame;
      }
      // Place a fresh bar near the hands.
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

  // ── Persistence ──────────────────────────────────────────────────────────
  const save = () => {
    saveOverride(exerciseId, motion);
    setDirty(false);
  };

  const revertToBaseline = () => {
    if (!confirm("Discard your edits for this exercise and restore the bundled keyframes?")) return;
    clearOverride(exerciseId);
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

          <button type="button" onClick={save} disabled={!dirty} style={primaryBtn(dirty)}>
            <Save size={12} /> {dirty ? "Save" : "Saved"}
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
        gridTemplateColumns: "minmax(0, 1fr) 280px",
        gap: 20,
        padding: 20,
        maxWidth: 1200, margin: "0 auto",
      }}>
        {/* Stage */}
        <div>
          <EditorStage
            pose={displayedPose}
            bar={displayedBar}
            bench={!!motion.bench}
            floor={!!motion.floor}
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
              // Auto-select the frame whose t we're near, if any.
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
              <Plus size={12} /> Add frame after
            </button>
            <button
              type="button"
              onClick={removeFrame}
              style={ghostBtn}
              disabled={motion.frames.length <= 1}
              title={motion.frames.length <= 1 ? "Cannot remove the only frame" : "Delete frame"}
            >
              <Trash2 size={12} /> Delete frame
            </button>
            <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 6 }}>
              {motion.frames.length} keyframe{motion.frames.length === 1 ? "" : "s"} ·
              Frame {selectedFrame + 1} at t={frame.t.toFixed(3)}
            </span>
          </div>
        </div>

        {/* Inspector */}
        <aside style={{
          background: "var(--s1)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: 14,
          fontSize: 12,
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
          <FieldRow label="Bench">
            <button type="button" onClick={toggleBench} style={toggleBtn(!!motion.bench)}>
              {motion.bench ? "ON" : "off"}
            </button>
          </FieldRow>

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
          <FieldRow label="Bar">
            <button type="button" onClick={toggleBar} style={toggleBtn(!!frame.bar)}>
              {frame.bar ? "ON" : "off"}
            </button>
          </FieldRow>

          <SectionLabel style={{ marginTop: 16 }}>Joints</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", rowGap: 4, columnGap: 8 }}>
            {JOINT_KEYS.map(k => (
              <JointReadout key={k} label={k} point={frame.pose[k]} />
            ))}
            {frame.bar && <JointReadout label="bar" point={frame.bar} />}
          </div>

          <SectionLabel style={{ marginTop: 16 }}>Tips</SectionLabel>
          <p style={{ color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
            Drag the coloured dots to move joints. Scrub the timeline to preview
            between keyframes — joints are only editable when the scrubber sits
            exactly on a keyframe. Press <kbd>←</kbd>/<kbd>→</kbd> to step
            between frames.
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
      />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px 40px" }}>
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
            width={220}
            height={280}
          />
        </div>
      </div>
    </div>
  );
}

// ── Editor stage ───────────────────────────────────────────────────────────

function EditorStage({
  pose, bar, bench, floor, editable, onMove,
}: {
  pose: Pose;
  bar?: Point;
  bench: boolean;
  floor: boolean;
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

  const handles: { key: HandleKey; pos: Point }[] = [
    ...JOINT_KEYS.map(k => ({ key: k as HandleKey, pos: pose[k] as Point })),
  ];
  if (bar) handles.push({ key: "bar", pos: bar });

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

        {/* Render figure (non-interactive). */}
        <g pointerEvents="none">
          <StickFigureInner pose={pose} bar={bar} bench={bench} floor={floor} />
        </g>

        {/* Interactive handles */}
        {handles.map(({ key, pos }) => {
          const active = dragKey === key || hoverKey === key;
          const isBar = key === "bar";
          return (
            <g key={key}>
              <circle
                cx={pos[0]} cy={pos[1]}
                r={active ? HANDLE_R_ACTIVE : HANDLE_R}
                fill={isBar ? "var(--warning, #f4a256)" : "var(--accent)"}
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

// Renders the same SVG content as StickFigure but expects to be embedded
// inside an outer <svg>, so it just emits <g> contents.
function StickFigureInner({ pose, bar, bench, floor }: { pose: Pose; bar?: Point; bench: boolean; floor: boolean }) {
  const [hx, hy] = pose.head;
  const [nx, ny] = pose.neck;
  const dx = nx - hx, dy = ny - hy;
  const dist = Math.hypot(dx, dy) || 1;
  const neckStartX = hx + (dx / dist) * HEAD_R;
  const neckStartY = hy + (dy / dist) * HEAD_R;
  const poly = (...pts: Point[]) => pts.map(p => `${p[0]},${p[1]}`).join(" ");
  const color = "currentColor";

  return (
    <>
      {floor && (
        <line
          x1={4} y1={VB_H - 4} x2={VB_W - 4} y2={VB_H - 4}
          stroke={color} strokeWidth={1.2} strokeDasharray="2 4" opacity={0.4}
        />
      )}
      {bench && (
        <g opacity={0.5}>
          <rect x={28} y={86} width={58} height={5} rx={1.2} fill={color} stroke="none" />
          <line x1={32} y1={91} x2={32} y2={108} stroke={color} strokeWidth={2} strokeLinecap="round" />
          <line x1={82} y1={91} x2={82} y2={108} stroke={color} strokeWidth={2} strokeLinecap="round" />
        </g>
      )}
      <g stroke={color} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <circle cx={hx} cy={hy} r={HEAD_R} fill={color} stroke="none" />
        <line x1={neckStartX} y1={neckStartY} x2={nx} y2={ny} />
        <polyline points={poly(pose.neck, pose.shoulder, pose.hip)} />
        <polyline points={poly(pose.shoulder, pose.elbow, pose.hand)} />
        <polyline points={poly(pose.hip, pose.knee, pose.ankle)} />
        <line x1={pose.ankle[0]} y1={pose.ankle[1]} x2={pose.toe[0]} y2={pose.toe[1]} />
      </g>
      {bar && (
        <g stroke="none">
          <circle cx={bar[0]} cy={bar[1]} r={5.5} fill={color} />
          <circle cx={bar[0]} cy={bar[1]} r={2} fill="var(--bg)" />
        </g>
      )}
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
          // Capture to the track so move events keep firing here even when
          // the cursor leaves it.
          const el = trackRef.current;
          if (el) {
            el.setPointerCapture?.(e.pointerId);
            (el as HTMLElement & { _capturedId?: number })._capturedId = e.pointerId;
          }
          // If the user grabbed a keyframe dot, the dot's onPointerDown will
          // have already set `dragging` to the frame index — leave it alone.
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
              // Let the event bubble to the track so the track's pointer
              // capture covers move/up. We only mark this dot as the active
              // drag target here.
              e.stopPropagation();
              setDragging(i);
              onSelect(i);
              // Manually re-dispatch a pointerdown on the track so it can
              // capture the pointer. Easier: do the capture directly here.
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

function KeyboardNav({ framesCount, onPrev, onNext }: { framesCount: number; onPrev: () => void; onNext: () => void; }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); onPrev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); onNext(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [framesCount, onPrev, onNext]);
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
      <span style={{ display: "inline-flex", alignItems: "center" }}>{children}</span>
    </div>
  );
}

function JointReadout({ label, point }: { label: string; point: Point }) {
  return (
    <>
      <code style={{ color: "var(--muted)", fontSize: 11 }}>{label}</code>
      <code style={{ fontSize: 11 }}>{point[0].toFixed(1)}, {point[1].toFixed(1)}</code>
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

function sampleFrames(frames: Frame[], t: number): { pose: Pose; bar?: Point } {
  if (frames.length === 0) throw new Error("no frames");
  if (frames.length === 1) return { pose: frames[0].pose, bar: frames[0].bar };
  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i], b = frames[i + 1];
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t || 1;
      const local = ease((t - a.t) / span);
      return {
        pose: lerpPose(a.pose, b.pose, local),
        bar: a.bar && b.bar ? lerpPt(a.bar, b.bar, local) : a.bar ?? b.bar,
      };
    }
  }
  const last = frames[frames.length - 1];
  return { pose: last.pose, bar: last.bar };
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
