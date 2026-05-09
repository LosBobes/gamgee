import { X, ChevronRight } from "lucide-react";
import { FOCUS } from "../../data/focuses";

interface Props {
  focus:    string | null;
  setFocus: (f: string) => void;
  onBack:   () => void;
  onNext:   () => void;
}

export default function WizardFocus({ focus, setFocus, onBack, onNext }: Props) {
  return (
    <>
      <div className="wz-hdr">
        <button className="wz-back" onClick={onBack}><X size={12} /> Cancel</button>
        <span className="wz-focus-label">STEP 1 — FOCUS</span>
        <button className="wz-next" onClick={onNext} disabled={!focus}>BUILD <ChevronRight size={13} /></button>
      </div>
      <div className="wizard-title">What are we training?</div>
      <div className="wizard-sub">Pick a focus to get smart exercise suggestions</div>
      <div className="focus-grid">
        {Object.entries(FOCUS).map(([k, f]) => (
          <div key={k} className={`focus-card ${focus === k ? "selected" : ""}`} onClick={() => setFocus(k)}>
            <div className="focus-icon"><f.icon size={24} /></div>
            <div className="focus-name">{f.name}</div>
            <div className="focus-desc">{f.desc}</div>
          </div>
        ))}
      </div>
    </>
  );
}
