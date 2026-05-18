import { useState, useEffect } from "react";
import { X, ChevronRight, Plus, Trash2 } from "lucide-react";
import { FOCUS, ICON_OPTIONS, getCustomFocuses, saveCustomFocuses } from "../../data/focuses";
import type { CustomFocusDef } from "../../types";
import { useTxt } from "../../context/ToneContext";
import OnboardingHint from "../OnboardingHint";

interface Props {
  focus:    string | null;
  setFocus: (f: string) => void;
  onBack:   () => void;
  onNext:   () => void;
}

export default function WizardFocus({ focus, setFocus, onBack, onNext }: Props) {
  const t = useTxt();
  const [customs,     setCustoms]     = useState<CustomFocusDef[]>([]);
  const [creating,    setCreating]    = useState(false);
  const [newName,     setNewName]     = useState("");
  const [newIconName, setNewIconName] = useState(ICON_OPTIONS[0].name);

  useEffect(() => { setCustoms(getCustomFocuses()); }, []);

  // Brief delay before advancing so the user sees the card's selected state
  // flash before the wizard transitions to the next step.
  const selectAndAdvance = (id: string) => {
    setFocus(id);
    window.setTimeout(onNext, 180);
  };

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    const cf: CustomFocusDef = {
      id: `custom_${Date.now()}`,
      name,
      iconName: newIconName,
      desc: "Your custom grind",
    };
    const updated = [...customs, cf];
    setCustoms(updated);
    saveCustomFocuses(updated);
    setCreating(false);
    setNewName("");
    setNewIconName(ICON_OPTIONS[0].name);
    selectAndAdvance(cf.id);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customs.filter(c => c.id !== id);
    setCustoms(updated);
    saveCustomFocuses(updated);
  };

  return (
    <>
      <div className="wz-hdr">
        <button className="wz-back" onClick={onBack}><X size={12} /> Cancel</button>
        <span className="wz-focus-label">STEP 1: FOCUS</span>
        <button className="wz-next" onClick={onNext} disabled={!focus}>CARDIO <ChevronRight size={13} /></button>
      </div>
      <div className="wizard-title">{t("What are we training?", "What are we DESTROYING today?", "What are we SERVING today?")}</div>
      <div className="wizard-sub">{t("Pick a focus to get smart exercise suggestions", "Pick your battleground and we'll arm you with the right exercises", "Pick your vibe and we'll line up the right moves")}</div>

      <OnboardingHint hintKey="focus" step="STEP 1" title={t("Tap a focus to continue", "Tap a focus to continue", "Tap a vibe to continue")}>
        {t(
          "A focus tells us which muscle groups you're targeting. We use it to suggest exercises and check coverage on the body map.",
          "Focus = which muscles you're going after. We use it to suggest the right lifts.",
          "Focus = which muscles you're serving today. We use it to line up the right moves."
        )}
      </OnboardingHint>

      <div className="focus-grid">
        {Object.entries(FOCUS).map(([k, f]) => (
          <div key={k} className={`focus-card${focus === k ? " selected" : ""}`} onClick={() => selectAndAdvance(k)}>
            <div className="focus-icon"><f.icon size={24} /></div>
            <div className="focus-name">{f.name}</div>
            <div className="focus-desc">{f.desc}</div>
          </div>
        ))}

        {customs.map(cf => {
          const IconComp = (ICON_OPTIONS.find(o => o.name === cf.iconName) ?? ICON_OPTIONS[0]).icon;
          return (
            <div key={cf.id} className={`focus-card focus-card-custom${focus === cf.id ? " selected" : ""}`} onClick={() => selectAndAdvance(cf.id)}>
              <button className="focus-card-del" onClick={(e) => handleDelete(cf.id, e)} title="Delete"><Trash2 size={11} /></button>
              <div className="focus-icon"><IconComp size={24} /></div>
              <div className="focus-name">{cf.name}</div>
              <div className="focus-desc">{cf.desc}</div>
            </div>
          );
        })}

        <div className="focus-card focus-card-create" onClick={() => setCreating(true)}>
          <div className="focus-icon" style={{ color: "var(--muted)" }}><Plus size={24} /></div>
          <div className="focus-name" style={{ color: "var(--muted)" }}>Custom</div>
          <div className="focus-desc">{t("Create your own type", "Make it yours")}</div>
        </div>
      </div>

      {creating && (
        <div className="cf-overlay" onClick={() => setCreating(false)}>
          <div className="cf-modal" onClick={e => e.stopPropagation()}>
            <div className="cf-modal-title">{t("New Custom Workout", "New Custom Grind", "New Custom Era")}</div>
            <input
              className="cf-modal-input"
              placeholder="Name (e.g. Mobility, Swim, Rehab…)"
              value={newName}
              maxLength={28}
              autoFocus
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
            />
            <div className="cf-modal-icon-label">Pick an icon</div>
            <div className="cf-icon-grid">
              {ICON_OPTIONS.map(o => {
                const IconComp = o.icon;
                return (
                  <button
                    key={o.name}
                    className={`cf-icon-btn${newIconName === o.name ? " selected" : ""}`}
                    onClick={() => setNewIconName(o.name)}
                    type="button"
                  >
                    <IconComp size={20} />
                  </button>
                );
              })}
            </div>
            <div className="cf-modal-actions">
              <button className="cf-btn-cancel" onClick={() => { setCreating(false); setNewName(""); }}>Cancel</button>
              <button className="cf-btn-save" onClick={handleCreate} disabled={!newName.trim()}>Create</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
