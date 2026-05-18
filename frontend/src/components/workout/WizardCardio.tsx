import { ArrowLeft, ChevronRight, Heart, Sunrise, Sunset, ArrowLeftRight, Ban } from "lucide-react";
import type { CardioPlan, CardioSlot, CardioTiming } from "../../types";
import { EX } from "../../data/exercises";
import { useTxt } from "../../context/ToneContext";
import OnboardingHint from "../OnboardingHint";

interface Props {
  plan:    CardioPlan;
  setPlan: (p: CardioPlan) => void;
  onBack:  () => void;
  onNext:  () => void;
}

const CARDIO_EX = EX.Cardio;
const DEFAULT_MIN = 10;
const DURATIONS = [5, 10, 15, 20, 30, 45, 60];

// Each card represents an explicit timing choice — null is not a card option,
// it's the "haven't picked yet" sentinel the screen starts with.
const TIMING_OPTIONS: { id: Exclude<CardioTiming, null>; label: string; desc: string; descBro: string; descGrl: string; Icon: typeof Heart }[] = [
  { id: "none",   label: "Skip Cardio",    desc: "Skip and go straight to lifting",      descBro: "Straight to the iron, no detours",           descGrl: "Straight to the iron, no detours",    Icon: Ban },
  { id: "before", label: "Before",         desc: "Warm up with cardio",                  descBro: "Fire up the engine first",                    descGrl: "Warm up the era first",                Icon: Sunrise },
  { id: "after",  label: "After",          desc: "Cool down with cardio",                descBro: "Bring it home with some steady state",        descGrl: "Cool down with a hot girl walk",       Icon: Sunset },
  { id: "both",   label: "Before & After", desc: "Bookend the workout",                  descBro: "Full cardio sandwich. You absolute unit.",    descGrl: "Bookend the era. Iconic.",             Icon: ArrowLeftRight },
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
  const t = useTxt();
  const setTiming = (timing: Exclude<CardioTiming, null>) => {
    const wantsBefore = timing === "before" || timing === "both";
    const wantsAfter  = timing === "after"  || timing === "both";
    setPlan({
      timing,
      before: wantsBefore ? (plan.before ?? defaultSlot()) : null,
      after:  wantsAfter  ? (plan.after  ?? defaultSlot()) : null,
    });
    // "Skip" has no slot config to fill out, so jump straight to the build step.
    // The other options surface duration/type pickers the user is meant to touch,
    // so we leave them on the screen.
    if (timing === "none") window.setTimeout(onNext, 180);
  };

  // Until the user picks one of the four cards, the BUILD button stays
  // disabled — the screen now opens with nothing selected so they make a
  // deliberate choice instead of inheriting a quiet "Skip" default.
  const slotsValid =
    plan.timing !== null &&
    (!plan.before || plan.before.minutes > 0) &&
    (!plan.after  || plan.after.minutes  > 0);

  return (
    <>
      <div className="wz-hdr">
        <button className="wz-back" onClick={onBack}><ArrowLeft size={13} /> BACK</button>
        <span className="wz-focus-label"><Heart size={13} /> STEP 2: CARDIO</span>
        <button className="wz-next" onClick={onNext} disabled={!slotsValid}>BUILD <ChevronRight size={13} /></button>
      </div>

      <div className="wizard-title">{t("Cardio today?", "Getting your cardio in?", "Cardio era today?")}</div>
      <div className="wizard-sub">{t("Add a warm-up, cool-down, or both before we pick exercises", "Bookend the session or skip it. No judgment. (We're judging a little.)", "Slot in some cardio or skip it, bestie. No notes either way.")}</div>

      <OnboardingHint hintKey="cardio" step="STEP 2" title={t("Optional", "Optional", "Optional")}>
        {t(
          "Cardio is fully optional — pick \"Skip Cardio\" and head straight to the lifts. You can always add it later.",
          "Cardio's optional. Hit \"Skip\" and go straight to the iron if you want.",
          "Cardio's optional, bestie. Hit \"Skip\" and head straight to the lifts if you're not feeling it."
        )}
      </OnboardingHint>

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
              <div className="focus-desc">{t(opt.desc, opt.descBro, opt.descGrl)}</div>
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
