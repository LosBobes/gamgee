import { useState } from "react";
import { X } from "lucide-react";
import type { ExerciseDef, PRDict } from "../types";
import { ALL_EX, TYPE_COLOR, CAT_ICON } from "../data/exercises";

interface Props {
  prs:    PRDict;
  onAdd:  (ex: ExerciseDef) => void;
  onClose: () => void;
}

export default function ExercisePicker({ prs, onAdd, onClose }: Props) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? ALL_EX.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
    : ALL_EX;

  const grouped: Record<string, ExerciseDef[]> = {};
  filtered.forEach(ex => { (grouped[ex.cat!] = grouped[ex.cat!] || []).push(ex); });

  return (
    <div
      className="overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="picker">
        <div className="picker-hdr">
          <span className="picker-title">Add Exercise</span>
          <button className="btn-icon" style={{ padding: "5px 10px" }} onClick={onClose}>
            <X size={14} /> Close
          </button>
        </div>
        <input
          className="search-inp"
          placeholder={`Search ${ALL_EX.length} exercises…`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
        {Object.entries(grouped).map(([cat, list]) => {
          const CatIcon = CAT_ICON[cat];
          return (
            <div key={cat}>
              <div className="cat-lbl">
                {CatIcon && <CatIcon size={11} />} {cat} ({list.length})
              </div>
              {list.map(ex => (
                <button key={ex.id} className="ex-opt" onClick={() => onAdd(ex)}>
                  <span className="type-dot" style={{ background: TYPE_COLOR[ex.type] }} />
                  <span style={{ flex: 1 }}>{ex.name}</span>
                  {prs[ex.id] && <span className="ex-pr-hint">PR {prs[ex.id].weight}kg</span>}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
