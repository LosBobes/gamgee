import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { defaultBarWeight, defaultPlates, loadout, summarize } from "../../plate";

interface Props {
  initialTarget: number;
  onClose: () => void;
}

const UNIT_KEY = "gamgee_plate_unit";
const BAR_KEY = "gamgee_plate_bar";

export default function PlateCalculatorModal({ initialTarget, onClose }: Props) {
  const [unit, setUnit] = useState<"kg" | "lb">(
    () => (localStorage.getItem(UNIT_KEY) as "kg" | "lb" | null) ?? "kg"
  );
  const [target, setTarget] = useState<number>(initialTarget || 60);
  const [bar, setBar] = useState<number>(() => {
    const stored = parseFloat(localStorage.getItem(BAR_KEY) ?? "");
    return Number.isFinite(stored) && stored > 0 ? stored : defaultBarWeight(unit);
  });

  const plates = useMemo(() => defaultPlates(unit), [unit]);
  const result = useMemo(() => loadout(target, bar, plates), [target, bar, plates]);

  const setUnitAndPersist = (u: "kg" | "lb") => {
    setUnit(u);
    localStorage.setItem(UNIT_KEY, u);
    setBar(defaultBarWeight(u));
    localStorage.setItem(BAR_KEY, String(defaultBarWeight(u)));
  };
  const setBarAndPersist = (v: number) => {
    setBar(v);
    localStorage.setItem(BAR_KEY, String(v));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card plate-calc" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">
          <h3>Plate calculator</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="plate-calc-row">
          <label>
            Target ({unit})
            <input
              type="number" min="0" step="2.5"
              value={target}
              onChange={e => setTarget(parseFloat(e.target.value) || 0)}
            />
          </label>
          <label>
            Bar
            <input
              type="number" min="0" step="2.5"
              value={bar}
              onChange={e => setBarAndPersist(parseFloat(e.target.value) || 0)}
            />
          </label>
          <div className="plate-calc-unit">
            <button
              className={unit === "kg" ? "active" : ""}
              onClick={() => setUnitAndPersist("kg")}
            >kg</button>
            <button
              className={unit === "lb" ? "active" : ""}
              onClick={() => setUnitAndPersist("lb")}
            >lb</button>
          </div>
        </div>
        <div className="plate-calc-result">
          <div className="plate-calc-summary">{summarize(result)}</div>
          <div className="plate-calc-used">
            Loaded: <strong>{result.used} {unit}</strong>
            {result.remaining > 0 && (
              <span className="plate-calc-rem"> (short by {result.remaining.toFixed(1)} {unit})</span>
            )}
          </div>
          {result.perSide.length > 0 && (
            <div className="plate-calc-visual">
              {[...result.perSide].sort((a, b) => b - a).map((p, i) => (
                <span key={i} className="plate-pill">{p}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
