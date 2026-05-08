import type { PRDict } from "../../types";
import { fmtDate, orm1 } from "../../utils";

interface Props {
  prs: PRDict;
}

export default function PRsTab({ prs }: Props) {
  if (Object.keys(prs).length === 0) {
    return (
      <div className="tab-anim">
        <div className="empty"><div className="empty-icon">🏆</div><div className="empty-label">No PRs yet</div></div>
      </div>
    );
  }

  return (
    <div className="tab-anim">
      <p className="pr-header">{Object.keys(prs).length} Personal Records</p>
      <div className="pr-grid">
        {Object.entries(prs)
          .sort((a, b) => new Date(b[1].date).getTime() - new Date(a[1].date).getTime())
          .map(([id, pr]) => (
            <div key={id} className="pr-card">
              <div className="pr-ex-name">{pr.name}</div>
              <div className="pr-weight-val">
                {pr.weight}<span className="pr-weight-unit">{pr.isCardio ? "min" : "kg"}</span>
              </div>
              {pr.reps > 0 && (
                <div className="pr-reps">{pr.isCardio ? `${pr.reps} km` : `× ${pr.reps} reps`}</div>
              )}
              {!pr.isCardio && pr.weight && pr.reps > 0 && (
                <div className="pr-reps" style={{ color: "var(--blue)" }}>est. 1RM ~{orm1(pr.weight, pr.reps)}kg</div>
              )}
              <div className="pr-date">{fmtDate(pr.date)}</div>
            </div>
          ))}
      </div>
    </div>
  );
}
