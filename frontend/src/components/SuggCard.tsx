import { Check, Plus, Star } from "lucide-react";
import type { SuggCardProps } from "../types";
import { MI } from "../data/muscles";

export default function SuggCard({ ex, isAdded, onAdd, onRemove, onHover, onLeave }: SuggCardProps) {
  const newP = ex.newP ?? [];
  const ovP  = ex.ovP  ?? [];
  const newS = (ex.newS ?? []).slice(0, 3);

  const toggle = isAdded ? onRemove : onAdd;

  return (
    <div
      className={`sugg-card ${isAdded ? "added" : ""} ${ex.isFocus ? "focus-pick" : ""}`}
      onClick={toggle}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <div className="sugg-left">
        <div className="sugg-name">
          {ex.name}
          {ex.isFocus && <span className="sugg-focus-star"><Star size={9} /> FOCUS</span>}
        </div>
        <div className="sugg-muscles">
          {newP.map(mid => <span key={mid} className="mtag new">{MI[mid]?.n}</span>)}
          {ovP.map(mid  => <span key={mid} className="mtag overlap">{MI[mid]?.n}</span>)}
          {newS.map(mid => <span key={mid} className="mtag sec">{MI[mid]?.n}</span>)}
        </div>
      </div>
      <div className={`sugg-btn ${isAdded ? "added" : "add"}`} aria-hidden="true">
        {isAdded ? <Check size={15} /> : <Plus size={15} />}
      </div>
    </div>
  );
}
