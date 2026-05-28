import { Trash2, Trophy } from "lucide-react";
import type { PRDict } from "../../types";
import { fmtDate, orm1 } from "../../utils";
import { ALL_EX } from "../../data/exercises";
import { useTxt } from "../../context/ToneContext";

interface Props {
  prs: PRDict;
  bodyweight: number | null;
  onDelete: (exerciseId: string) => void;
}

export default function PRsTab({ prs, bodyweight, onDelete }: Props) {
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
          .map(([id, pr]) => {
            const isAssisted = !!ALL_EX.find(e => e.id === id)?.is_assisted;
            const effective = isAssisted && bodyweight != null
              ? Math.round((bodyweight + pr.weight) * 10) / 10
              : null;
            const headlineVal = effective != null
              ? effective
              : isAssisted ? Math.abs(pr.weight) : pr.weight;
            const headlineUnit = pr.isCardio ? "min"
              : isAssisted
                ? (effective != null ? "kg" : pr.weight === 0 ? "kg at BW" : "kg below BW")
                : "kg";
            return (
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
                {headlineVal}<span className="pr-weight-unit">{headlineUnit}</span>
              </div>
              {pr.reps > 0 && (
                <div className="pr-reps">{pr.isCardio ? `${pr.reps} km` : `× ${pr.reps} reps`}</div>
              )}
              {isAssisted && effective != null && pr.weight !== 0 && (
                <div className="pr-reps" style={{ color: "var(--pr-muted)" }}>BW − {Math.abs(pr.weight)}kg</div>
              )}
              {!pr.isCardio && !isAssisted && pr.weight > 0 && pr.reps > 0 && (
                <div className="pr-reps" style={{ color: "var(--pr-muted)" }}>est. 1RM ~{orm1(pr.weight, pr.reps)}kg</div>
              )}
              <div className="pr-date">{fmtDate(pr.date)}</div>
            </div>
            );
          })}
      </div>
    </div>
  );
}
