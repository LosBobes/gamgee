import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, X, Compass, RotateCcw, Minus, Plus, Pencil } from "lucide-react";
import type { WorkoutSession, ProgressionOverride } from "../../types";
import { analyzeEx } from "../../analysis";
import { STATUS, UPPER_IDS } from "../../constants";
import { rpeToRir, rirToRpe, fmtShortDate } from "../../utils";

interface Props {
  exId: string;
  exName: string;
  history: WorkoutSession[];
  override: ProgressionOverride | null;
  onSetOverride: (exId: string, override: ProgressionOverride | null) => void;
  onUpdateSession: (session: WorkoutSession) => void;
  onBack: () => void;
}

// One plotted session: its top working set plus enough handles to edit it back
// into the real workout record.
interface Point {
  sessionId: string;
  date: string;
  exIdx: number;
  setIdx: number;
  weight: number;
  reps: number;
  rir: number | null;
  sets: number;
}

const W = 320, H = 172;
const PAD = { l: 34, r: 14, t: 14, b: 28 };
const innerW = W - PAD.l - PAD.r;
const innerH = H - PAD.t - PAD.b;

// Reps-in-reserve → dot colour: red at failure, green with plenty in the tank.
function rirColor(rir: number | null): string {
  if (rir == null) return "var(--s3)";
  if (rir <= 0) return "#E04040";
  if (rir === 1) return "#FF8C42";
  if (rir === 2) return "#E8C547";
  if (rir === 3) return "#82D27E";
  return "#52B788";
}

export default function ExerciseDiagnostics({
  exId, exName, history, override, onSetOverride, onUpdateSession, onBack,
}: Props) {
  const plate = UPPER_IDS.has(exId) ? 2.5 : 5;
  const roundPlate = (w: number) => Math.max(plate, Math.round(w / plate) * plate);

  // Chronological top-set points, with handles back to the real set so edits
  // can be written through to history.
  const points = useMemo<Point[]>(() => {
    const out: Point[] = [];
    [...history].reverse().forEach(w => {
      const exIdx = w.exercises.findIndex(e => e.id === exId);
      if (exIdx < 0) return;
      const sets = w.exercises[exIdx].sets;
      let topW = -Infinity, topR = 0, setIdx = -1;
      sets.forEach((s, i) => {
        if (s.is_warmup) return;
        const wt = parseFloat(s.weight), rp = parseInt(s.reps);
        if (!Number.isFinite(wt) || wt === 0) return;
        const r = Number.isFinite(rp) && rp > 0 ? rp : 0;
        if (wt > topW || (wt === topW && r > topR)) { topW = wt; topR = r; setIdx = i; }
      });
      if (setIdx < 0) return;
      out.push({
        sessionId: w.id, date: w.date, exIdx, setIdx,
        weight: topW, reps: topR, rir: rpeToRir(sets[setIdx].rpe),
        sets: sets.filter(s => !s.is_warmup).length,
      });
    });
    return out;
  }, [history, exId]);

  // Auto (un-steered) read — drives the trend/status text and the "reset" target.
  const auto = analyzeEx(exId, history);
  const isSteering = !!override;

  // Editable forward target (the projection handle). Seeded from the steer if
  // one's set, else from the auto recommendation.
  const [draft, setDraft] = useState<ProgressionOverride>(
    () => override ?? { weight: auto?.nextWeight ?? 0, reps: auto?.nextReps ?? 8 },
  );
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  if (!auto || points.length === 0) {
    return (
      <div className="diag tab-anim">
        <DiagHeader name={exName} onBack={onBack} steering={false} />
        <div className="empty"><div className="empty-label">Log a session to unlock diagnostics.</div></div>
      </div>
    );
  }

  // y-scale spans logged weights and the auto target, with headroom. The live
  // draft is deliberately excluded so the scale stays fixed while dragging and
  // the handle tracks the pointer 1:1 (it just clamps at the edges).
  const weights = points.map(p => p.weight);
  const lo = Math.min(...weights, auto.nextWeight) * 0.9;
  const hi = (Math.max(...weights, auto.nextWeight) * 1.12) || lo + 1;
  const span = hi - lo || 1;
  const slots = points.length; // projection sits one slot past the last point
  const xAt = (i: number) => PAD.l + (i / slots) * innerW;
  const yAt = (w: number) => PAD.t + innerH * (1 - (w - lo) / span);

  const projX = xAt(slots);
  const projY = yAt(Math.min(hi, Math.max(lo, draft.weight)));

  // Update the draft target; commit live only once the user is already
  // steering — otherwise the explicit "Steer to…" button opts them in.
  const applyDraft = (next: ProgressionOverride) => {
    setDraft(next);
    if (isSteering) onSetOverride(exId, next);
  };
  const setSteerWeightFromClientY = (clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const yv = ((clientY - rect.top) / rect.height) * H;
    const frac = 1 - (yv - PAD.t) / innerH;
    applyDraft({ ...draft, weight: Math.max(plate, roundPlate(lo + frac * span)) });
  };
  const startSteering = () => onSetOverride(exId, draft);
  const resetSteer = () => { onSetOverride(exId, null); setDraft({ weight: auto.nextWeight, reps: auto.nextReps }); };

  const status = isSteering ? STATUS.STEERED : auto.status;
  const trend = auto.trendPerSession;
  const arrow = trend > 0.05 ? "▲" : trend < -0.05 ? "▼" : "→";

  // ── path / dots ──
  const linePts = points.map((p, i) => `${xAt(i)},${yAt(p.weight)}`).join(" ");
  const last = points[points.length - 1];

  return (
    <div className="diag tab-anim">
      <DiagHeader name={exName} onBack={onBack} steering={isSteering} />

      <div className="diag-readout">
        <span className="status-badge" style={{ color: status.color, background: status.bg, borderColor: status.color }}>
          {status.label}
        </span>
        <span className="diag-trend" style={{ color: status.color }}>
          {arrow} {trend >= 0 ? "+" : ""}{trend.toFixed(1)}kg/session
        </span>
        {auto.est1RM && <span className="orm-badge">~{auto.est1RM}kg 1RM</span>}
      </div>

      <svg
        ref={svgRef}
        className="diag-chart"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${exName} weight history and projected next target`}
      >
        {/* y gridlines + labels (lo / mid / hi) */}
        {[lo, (lo + hi) / 2, hi].map((wv, i) => (
          <g key={i}>
            <line x1={PAD.l} y1={yAt(wv)} x2={W - PAD.r} y2={yAt(wv)} stroke="var(--border)" strokeWidth={0.5} />
            <text x={PAD.l - 4} y={yAt(wv) + 3} textAnchor="end" className="diag-axis">{Math.round(wv)}</text>
          </g>
        ))}

        {/* history line */}
        {points.length > 1 && <polyline points={linePts} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />}

        {/* dashed projection from the last logged set to the target handle */}
        <line x1={xAt(slots - 1)} y1={yAt(last.weight)} x2={projX} y2={projY}
              stroke={status.color} strokeWidth={2} strokeDasharray="4 3" />

        {/* logged dots — colour = reps left, tap to edit */}
        {points.map((p, i) => (
          <circle
            key={p.sessionId} cx={xAt(i)} cy={yAt(p.weight)} r={editIdx === i ? 6 : 4.5}
            fill={rirColor(p.rir)} stroke="var(--bg)" strokeWidth={1.5}
            style={{ cursor: "pointer" }}
            onClick={() => setEditIdx(editIdx === i ? null : i)}
          >
            <title>{`${fmtShortDate(p.date)} — ${p.weight}kg × ${p.reps}${p.rir != null ? ` · ${p.rir} left` : ""} · ${p.sets} set${p.sets !== 1 ? "s" : ""}`}</title>
          </circle>
        ))}

        {/* projection handle — drag vertically to steer the target weight */}
        <circle
          cx={projX} cy={projY} r={dragging ? 8 : 6.5}
          fill={status.color} stroke="var(--bg)" strokeWidth={2}
          style={{ cursor: "ns-resize", touchAction: "none" }}
          onPointerDown={e => { (e.target as Element).setPointerCapture(e.pointerId); setDragging(true); }}
          onPointerMove={e => { if (dragging) setSteerWeightFromClientY(e.clientY); }}
          onPointerUp={e => { (e.target as Element).releasePointerCapture(e.pointerId); setDragging(false); }}
        />
        <text x={projX} y={projY - 11} textAnchor="middle" className="diag-axis" fill={status.color}>next</text>
      </svg>

      {/* Dot-colour key for reps-left, and a nudge that the dots are tappable. */}
      <div className="diag-legend">
        <span className="diag-legend-lbl">REPS LEFT</span>
        {[0, 1, 2, 3, 4].map(n => (
          <span key={n} className="diag-legend-item">
            <i style={{ background: rirColor(n) }} />{n === 4 ? "4+" : n}
          </span>
        ))}
        <span className="diag-legend-hint">· tap a dot to edit</span>
      </div>

      {/* Tap-a-point editor: correct a logged set (writes through to history). */}
      {editIdx != null && (
        <PointEditor
          key={points[editIdx].sessionId}
          point={points[editIdx]}
          plate={plate}
          onCancel={() => setEditIdx(null)}
          onSave={(weight, reps, rir) => {
            const p = points[editIdx];
            const session = history.find(w => w.id === p.sessionId);
            if (session) {
              const exercises = session.exercises.map((e, ei) => ei !== p.exIdx ? e : {
                ...e,
                sets: e.sets.map((s, si) => si !== p.setIdx ? s : {
                  ...s, weight: String(weight), reps: String(reps),
                  rpe: rir == null ? null : rirToRpe(rir),
                }),
              });
              onUpdateSession({ ...session, exercises });
            }
            setEditIdx(null);
          }}
        />
      )}

      {/* Steer the projection broadly. */}
      <div className="diag-steer">
        <div className="diag-steer-head">
          <span><Compass size={13} /> {isSteering ? "You're steering this lift" : "Steer the next target"}</span>
          {isSteering && (
            <button className="diag-reset" onClick={resetSteer}><RotateCcw size={12} /> Auto</button>
          )}
        </div>
        <div className="diag-steer-sub">
          {isSteering
            ? `Auto-trend suggests ${auto.nextWeight}kg × ${auto.nextReps}. Your workouts will prescribe your target instead until you reset.`
            : `Auto-trend suggests ${auto.nextWeight}kg × ${auto.nextReps}. Drag the “next” dot or nudge below to take the wheel.`}
        </div>
        <div className="diag-steer-controls">
          <Stepper label="WEIGHT (kg)" value={draft.weight} step={plate}
                   onChange={w => applyDraft({ ...draft, weight: Math.max(plate, w) })} />
          <Stepper label="REPS" value={draft.reps} step={1}
                   onChange={r => applyDraft({ ...draft, reps: Math.max(1, r) })} />
        </div>
        {!isSteering && (
          <button className="btn-pri diag-steer-apply" onClick={startSteering}>
            <Check size={14} /> Steer to {draft.weight}kg × {draft.reps}
          </button>
        )}
      </div>
    </div>
  );
}

function DiagHeader({ name, onBack, steering }: { name: string; onBack: () => void; steering: boolean }) {
  return (
    <div className="wz-hdr">
      <button className="wz-back" onClick={onBack}><ArrowLeft size={13} /> COACH</button>
      <span className="wz-focus-label">{name}{steering ? " · STEERING" : ""}</span>
      <div style={{ width: 60 }} />
    </div>
  );
}

function Stepper({ label, value, step, onChange }: { label: string; value: number; step: number; onChange: (v: number) => void }) {
  return (
    <div className="diag-stepper">
      <div className="col-lbl">{label}</div>
      <div className="stepper">
        <button type="button" className="step-btn step-minus" aria-label={`decrease ${label}`} onClick={() => onChange(round2(value - step))}>
          <Minus size={16} strokeWidth={3} />
        </button>
        <input
          className="set-inp step-inp" type="number" inputMode="decimal" step={step} value={value}
          onChange={e => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) onChange(v); }}
        />
        <button type="button" className="step-btn step-plus" aria-label={`increase ${label}`} onClick={() => onChange(round2(value + step))}>
          <Plus size={16} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}

function PointEditor({ point, plate, onSave, onCancel }: {
  point: Point; plate: number;
  onSave: (weight: number, reps: number, rir: number | null) => void;
  onCancel: () => void;
}) {
  const [weight, setWeight] = useState(point.weight);
  const [reps, setReps] = useState(point.reps);
  const [rir, setRir] = useState<number | null>(point.rir);
  return (
    <div className="diag-pointedit">
      <div className="diag-pointedit-head">
        <span><Pencil size={12} /> Edit {fmtShortDate(point.date)} · {point.sets} set{point.sets !== 1 ? "s" : ""}</span>
        <button className="btn-icon" onClick={onCancel} aria-label="Cancel"><X size={14} /></button>
      </div>
      <div className="diag-steer-controls">
        <Stepper label="WEIGHT (kg)" value={weight} step={plate} onChange={w => setWeight(Math.max(0, w))} />
        <Stepper label="REPS" value={reps} step={1} onChange={r => setReps(Math.max(0, r))} />
      </div>
      <div className="set-rpe-row" aria-label="Reps left in the tank">
        <span className="set-rpe-label">REPS LEFT</span>
        <div className="set-rpe-pills" role="radiogroup">
          {[0, 1, 2, 3, 4].map(n => (
            <button key={n} role="radio" aria-checked={rir === n}
                    className={`set-rpe-pill${rir === n ? " set-rpe-pill-active" : ""}`}
                    onClick={() => setRir(rir === n ? null : n)}>
              {n === 4 ? "4+" : n}
            </button>
          ))}
        </div>
      </div>
      <button className="btn-pri diag-steer-apply" onClick={() => onSave(weight, reps, rir)}>
        <Check size={14} /> Save changes
      </button>
    </div>
  );
}

const round2 = (n: number) => Math.round(n * 100) / 100;
