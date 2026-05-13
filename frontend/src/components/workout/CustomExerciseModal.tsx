import { useMemo, useState } from "react";
import type { CustomExerciseDef, ExerciseType } from "../../types";
import { MI } from "../../data/muscles";
import {
  EX,
  CUSTOM_CATEGORY,
  makeCustomExerciseId,
  saveCustomExercise,
} from "../../data/exercises";
import { useTxt } from "../../context/ToneContext";

interface Props {
  onClose:   () => void;
  onCreated: (def: CustomExerciseDef) => void;
  editing?:  CustomExerciseDef;
}

const TYPE_OPTIONS: { value: ExerciseType; label: string }[] = [
  { value: "strength", label: "Strength" },
  { value: "timed",    label: "Timed"    },
  { value: "cardio",   label: "Cardio"   },
];

export default function CustomExerciseModal({ onClose, onCreated, editing }: Props) {
  const t = useTxt();

  // Build the muscle list grouped by anatomical region
  const groupedMuscles = useMemo(() => {
    const groups: Record<string, { mid: string; label: string }[]> = {};
    Object.entries(MI).forEach(([mid, info]) => {
      if (!groups[info.g]) groups[info.g] = [];
      groups[info.g].push({ mid, label: info.n });
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, []);

  // Categories that already exist in the catalog, plus the dedicated "Custom" bucket
  const categoryOptions = useMemo(() => {
    const cats = Object.keys(EX).filter(c => c !== CUSTOM_CATEGORY);
    return [CUSTOM_CATEGORY, ...cats];
  }, []);

  const [name, setName]                 = useState(editing?.name ?? "");
  const [type, setType]                 = useState<ExerciseType>(editing?.type ?? "strength");
  const [cat, setCat]                   = useState<string>(editing?.cat ?? CUSTOM_CATEGORY);
  const [primary, setPrimary]           = useState<Set<string>>(new Set(editing?.primary ?? []));
  const [secondary, setSecondary]       = useState<Set<string>>(new Set(editing?.secondary ?? []));
  const [instructions, setInstructions] = useState(editing?.instructions ?? "");

  const togglePrimary = (mid: string) => {
    const next = new Set(primary);
    if (next.has(mid)) next.delete(mid);
    else {
      next.add(mid);
      // A muscle can be primary OR secondary, never both
      if (secondary.has(mid)) {
        const s = new Set(secondary); s.delete(mid); setSecondary(s);
      }
    }
    setPrimary(next);
  };

  const toggleSecondary = (mid: string) => {
    if (primary.has(mid)) return;
    const next = new Set(secondary);
    if (next.has(mid)) next.delete(mid); else next.add(mid);
    setSecondary(next);
  };

  const canSave = name.trim().length > 0 && primary.size > 0;

  const handleSave = () => {
    if (!canSave) return;
    const trimmedInstr = instructions.trim();
    const def: CustomExerciseDef = {
      id: editing?.id ?? makeCustomExerciseId(name),
      name: name.trim(),
      type,
      cat,
      primary: Array.from(primary),
      secondary: Array.from(secondary),
      ...(trimmedInstr ? { instructions: trimmedInstr } : {}),
    };
    saveCustomExercise(def);
    onCreated(def);
    onClose();
  };

  return (
    <div className="cf-overlay" onClick={onClose}>
      <div className="cf-modal cx-modal" onClick={e => e.stopPropagation()}>
        <div className="cf-modal-title">
          {editing
            ? t("Edit Custom Exercise", "Tune Your Lift", "Tune Your Move")
            : t("New Custom Exercise", "Roll-Your-Own Lift", "Cook Your Own Move")}
        </div>

        <input
          className="cf-modal-input"
          placeholder={t("Name (e.g. Cable Crossover)", "Name it, bro", "Name it, bestie")}
          value={name}
          maxLength={48}
          autoFocus
          onChange={e => setName(e.target.value)}
        />

        <div className="cf-modal-icon-label">{t("Type", "Type")}</div>
        <div className="cx-type-row">
          {TYPE_OPTIONS.map(o => (
            <button
              key={o.value}
              type="button"
              className={`cx-type-btn${type === o.value ? " selected" : ""}`}
              onClick={() => setType(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="cf-modal-icon-label">{t("Category", "Category")}</div>
        <select
          className="cf-modal-input cx-cat-select"
          value={cat}
          onChange={e => setCat(e.target.value)}
        >
          {categoryOptions.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <div className="cf-modal-icon-label">
          {t("Primary muscles", "Primary muscles")}
          <span className="cx-hint">{t("required", "pick one+")}</span>
        </div>
        <div className="cx-muscle-section">
          {groupedMuscles.map(([group, muscles]) => (
            <div key={group} className="cx-muscle-group">
              <div className="cx-muscle-group-label">{group}</div>
              <div className="cx-muscle-chips">
                {muscles.map(m => (
                  <button
                    key={m.mid}
                    type="button"
                    className={`cx-muscle-chip${primary.has(m.mid) ? " primary" : ""}`}
                    onClick={() => togglePrimary(m.mid)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="cf-modal-icon-label" style={{ marginTop: 12 }}>
          {t("Secondary muscles", "Secondary muscles")}
          <span className="cx-hint">{t("optional", "optional")}</span>
        </div>
        <div className="cx-muscle-section">
          {groupedMuscles.map(([group, muscles]) => (
            <div key={group} className="cx-muscle-group">
              <div className="cx-muscle-group-label">{group}</div>
              <div className="cx-muscle-chips">
                {muscles.map(m => (
                  <button
                    key={m.mid}
                    type="button"
                    className={`cx-muscle-chip${secondary.has(m.mid) ? " secondary" : ""}${primary.has(m.mid) ? " disabled" : ""}`}
                    onClick={() => toggleSecondary(m.mid)}
                    disabled={primary.has(m.mid)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="cf-modal-icon-label" style={{ marginTop: 12 }}>
          {t("Instructions", "How to do it")}
          <span className="cx-hint">{t("optional", "optional")}</span>
        </div>
        <textarea
          className="cf-modal-input cx-instructions"
          placeholder={t("Cue your form, setup, and tempo…", "Tell future-you how to nail this lift…", "Tell future-you how to slay this move…")}
          value={instructions}
          maxLength={2000}
          rows={4}
          onChange={e => setInstructions(e.target.value)}
        />

        <div className="cf-modal-actions" style={{ marginTop: 18 }}>
          <button className="cf-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="cf-btn-save" onClick={handleSave} disabled={!canSave}>
            {editing ? t("Save", "Lock It In", "Lock It In") : t("Create", "Make It", "Make It Happen")}
          </button>
        </div>
      </div>
    </div>
  );
}
