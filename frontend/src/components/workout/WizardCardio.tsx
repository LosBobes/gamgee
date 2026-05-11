import { ArrowLeft, ChevronRight, Heart, Sunrise, Sunset, ArrowLeftRight, Ban } from "lucide-react";
import type { CardioPlan, CardioSlot, CardioTiming } from "../../types";
import { EX } from "../../data/exercises";

interface Props {
  plan:    CardioPlan;
  setPlan: (p: CardioPlan) => void;
  onBack:  () => void;
  onNext:  () => void;
}

const CARDIO_EX = EX.Cardio;
const DEFAULT_MIN = 10;
const DURATIONS = [5, 10, 15, 20, 30, 45, 60];

const TIMING_OPTIONS: { id: CardioTiming; label: string; desc: string; Icon: typeof Heart }[] = [
  { id: "none",   label: "No Cardio",  desc: "Skip and go straight to lifting", Icon: Ban },
  { id: "before", label: "Before",     desc: "Warm up with cardio",             Icon: Sunrise },
  { id: "after",  label: "After",      desc: "Cool down with cardio",           Icon: Sunset },
  { id: "both",   label: "Before & After", desc: "Bookend the workout",         Icon: ArrowLeftRight },
];

function defaultSlot(): CardioSlot {
  return { exId: CARDIO_EX[0].id, minutes: DEFAULT_MIN };
}

function SlotEditor({ label, slot, onChange }: { label: string; slot: CardioSlot; onChange: (s: CardioSlot) => void }) {
  return (
    <div className="cardio-slot">
      <div className="cardio-slot-label">{label}</div>
      <label className="cardio-field">
        <span className="cardio-field-label">Type</span>
        <select
          className="cardio-select"
          value={slot.exId}
          onChange={e => onChange({ ...slot, exId: e.target.value })}
        >
          {CARDIO_EX.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
        </select>
      </label>
      <label className="cardio-field">
        <span className="cardio-field-label">Duration (min)</span>
        <div className="cardio-duration-row">
          <input
            className="cardio-duration-input"
            type="number"
            min={1}
            max={240}
            step={1}
            value={slot.minutes}
            onChange={e => {
              const n = parseInt(e.target.value, 10);
              onChange({ ...slot, minutes: isNaN(n) ? 0 : n });
            }}
          />
          <div className="cardio-duration-chips">
            {DURATIONS.map(d => (
              <button
                key={d}
                type="button"
                className={`cardio-chip${slot.minutes === d ? " selected" : ""}`}
                onClick={() => onChange({ ...slot, minutes: d })}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </label>
    </div>
  );
}

export default function WizardCardio({ plan, setPlan, onBack, onNext }: Props) {
  const setTiming = (timing: CardioTiming) => {
    const wantsBefore = timing === "before" || timing === "both";
    const wantsAfter  = timing === "after"  || timing === "both";
    setPlan({
      timing,
      before: wantsBefore ? (plan.before ?? defaultSlot()) : null,
      after:  wantsAfter  ? (plan.after  ?? defaultSlot()) : null,
    });
  };

  const slotsValid =
    (!plan.before || plan.before.minutes > 0) &&
    (!plan.after  || plan.after.minutes  > 0);

  return (
    <>
      <div className="wz-hdr">
        <button className="wz-back" onClick={onBack}><ArrowLeft size={13} /> BACK</button>
        <span className="wz-focus-label"><Heart size={13} /> STEP 2 — CARDIO</span>
        <button className="wz-next" onClick={onNext} disabled={!slotsValid}>BUILD <ChevronRight size={13} /></button>
      </div>

      <div className="wizard-title">Cardio today?</div>
      <div className="wizard-sub">Add a warm-up, cool-down, or both before we pick exercises</div>

      <div className="cardio-timing-grid">
        {TIMING_OPTIONS.map(opt => {
          const Icon = opt.Icon;
          const selected = plan.timing === opt.id;
          return (
            <div
              key={opt.id}
              className={`focus-card${selected ? " selected" : ""}`}
              onClick={() => setTiming(opt.id)}
            >
              <div className="focus-icon"><Icon size={22} /></div>
              <div className="focus-name">{opt.label}</div>
              <div className="focus-desc">{opt.desc}</div>
            </div>
          );
        })}
      </div>

      {plan.before && (
        <SlotEditor
          label="WARM-UP CARDIO"
          slot={plan.before}
          onChange={s => setPlan({ ...plan, before: s })}
        />
      )}
      {plan.after && (
        <SlotEditor
          label="COOL-DOWN CARDIO"
          slot={plan.after}
          onChange={s => setPlan({ ...plan, after: s })}
        />
      )}
    </>
  );
}
