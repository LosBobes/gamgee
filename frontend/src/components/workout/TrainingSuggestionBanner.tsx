import { MapPin, Clock, CalendarClock, X, Dumbbell } from "lucide-react";
import type { TrainingSuggestion } from "../../types";

interface Props {
  suggestion: TrainingSuggestion;
  onStart:    (s: TrainingSuggestion) => void;
  onDismiss:  () => void;
}

/** Recommendation card shown on the idle workout screen when the user is at
 * their gym or it's their usual training time. Tapping "Start" hands the
 * suggestion back up to be loaded into the wizard. */
export default function TrainingSuggestionBanner({ suggestion, onStart, onDismiss }: Props) {
  const Icon = suggestion.reason === "location" ? MapPin
             : suggestion.reason === "time"     ? Clock
             :                                     CalendarClock;
  return (
    <div
      className="training-suggestion"
      style={{
        position: "relative",
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 14px",
        marginBottom: 16,
        borderRadius: 12,
        border: "1px solid var(--primary)",
        background: "var(--ad)",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: 38, height: 38, borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--ad2)", color: "var(--primary)",
        }}
        aria-hidden
      >
        <Icon size={20} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
          {suggestion.title}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
          {suggestion.detail}
        </div>
        <button
          className="btn-start"
          onClick={() => onStart(suggestion)}
          style={{ marginTop: 10, width: "auto", padding: "8px 16px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Dumbbell size={14} /> START
        </button>
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss suggestion"
        style={{
          position: "absolute", top: 8, right: 8,
          background: "transparent", border: "none", cursor: "pointer",
          color: "var(--muted)", padding: 4, lineHeight: 0,
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
