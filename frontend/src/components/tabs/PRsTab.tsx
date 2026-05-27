import { Trash2, Trophy } from "lucide-react";
import type { PRDict } from "../../types";
import { fmtDate, orm1 } from "../../utils";
import { useTxt } from "../../context/ToneContext";

interface Props {
  prs: PRDict;
  onDelete: (exerciseId: string) => void;
}

export default function PRsTab({ prs, onDelete }: Props) {
  const t = useTxt();
  if (Object.keys(prs).length === 0) {
    return (
      <div className="tab-anim">
        <div className="empty"><div className="empty-icon"><Trophy size={40} /></div><div className="empty-label">{t("No PRs yet", "No PRs yet. Do you even lift, bro?", "No PRs yet. Your first one is loading, bestie.")}</div></div>
      </div>
    );
  }

  return (
    <div className="tab-anim">
      <p className="pr-header">{(() => { const n = Object.keys(prs).length; return t(`${n} Personal Record${n !== 1 ? "s" : ""}`, `${n} ${n !== 1 ? "Pages" : "Page"} of the Swoly Bible`, `${n} Iconic ${n !== 1 ? "Moments" : "Moment"}`); })()}</p>
      <div className="pr-grid">
        {Object.entries(prs)
          .sort((a, b) => new Date(b[1].date).getTime() - new Date(a[1].date).getTime())
          .map(([id, pr]) => (
            <div key={id} className="pr-card">
              <button
                className="pr-delete-btn"
                onClick={() => onDelete(id)}
                aria-label={`Delete PR for ${pr.name}`}
              >
                <Trash2 size={14} />
              </button>
              <div className="pr-ex-name">{pr.name}</div>
              <div className="pr-weight-val">
                {pr.weight < 0 ? Math.abs(pr.weight) : pr.weight}
                <span className="pr-weight-unit">{pr.isCardio ? "min" : pr.weight < 0 ? "kg assist" : "kg"}</span>
              </div>
              {pr.reps > 0 && (
                <div className="pr-reps">{pr.isCardio ? `${pr.reps} km` : `× ${pr.reps} reps`}</div>
              )}
              {!pr.isCardio && pr.weight > 0 && pr.reps > 0 && (
                <div className="pr-reps" style={{ color: "var(--pr-muted)" }}>est. 1RM ~{orm1(pr.weight, pr.reps)}kg</div>
              )}
              <div className="pr-date">{fmtDate(pr.date)}</div>
            </div>
          ))}
      </div>
    </div>
  );
}
