import { X, Lightbulb } from "lucide-react";
import type { ReactNode } from "react";
import { useOnboarding } from "../context/OnboardingContext";

interface Props {
  /** Unique key so each hint can be dismissed independently and stays dismissed across reloads. */
  hintKey: string;
  step?:   string;
  title?:  string;
  children: ReactNode;
}

export default function OnboardingHint({ hintKey, step, title, children }: Props) {
  const { isHintVisible, dismissHint, endTour } = useOnboarding();
  if (!isHintVisible(hintKey)) return null;

  return (
    <div className="onb-hint" role="note">
      <div className="onb-hint-icon"><Lightbulb size={14} /></div>
      <div className="onb-hint-body">
        {(step || title) && (
          <div className="onb-hint-head">
            {step && <span className="onb-hint-step">{step}</span>}
            {title && <span className="onb-hint-title">{title}</span>}
          </div>
        )}
        <div className="onb-hint-text">{children}</div>
        <button className="onb-hint-end" onClick={endTour} type="button">
          End tour
        </button>
      </div>
      <button
        className="onb-hint-close"
        onClick={() => dismissHint(hintKey)}
        aria-label="Dismiss tip"
        type="button"
      >
        <X size={12} />
      </button>
    </div>
  );
}
