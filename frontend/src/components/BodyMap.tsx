import { useState } from "react";
import type { BodyMapProps, MuscleDef } from "../types";
import { MI } from "../data/muscles";
import { BODY_SHAPES, FM, BM } from "../data/bodymap";

export default function BodyMap({ active = {}, preview = {}, onHoverMuscle }: BodyMapProps) {
  const [hovMid, setHovMid] = useState<string | null>(null);

  const fill = (mid: string) => {
    if (preview[mid]) return "#52B788";
    if (active[mid] === "primary") return "#E8981E";
    if (active[mid] === "secondary") return "rgba(232,152,30,0.35)";
    return "rgba(255,255,255,0.04)";
  };

  const stroke = (mid: string) => {
    if (preview[mid]) return "#52B788";
    if (active[mid]) return "#E8981E";
    return "rgba(255,255,255,0.1)";
  };

  const renderView = (muscles: MuscleDef[], label: string) => (
    <div className="body-view">
      <svg viewBox="0 0 100 180" width={90} height={162} style={{ display: "block" }}>
        {BODY_SHAPES.map((s, i) => {
          if (s.t === "circle")  return <circle  key={i} cx={s.cx} cy={s.cy} r={s.r}   fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />;
          if (s.t === "ellipse") return <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />;
          return <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={4} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />;
        })}
        {muscles.map((s, i) => (
          <ellipse
            key={i}
            cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry}
            fill={fill(s.mid)}
            stroke={stroke(s.mid)}
            strokeWidth={active[s.mid] || preview[s.mid] ? 1.5 : 0.5}
            style={{ cursor: "default", transition: "fill 0.2s, stroke 0.2s" }}
            onMouseEnter={() => { setHovMid(s.mid); onHoverMuscle?.(s.mid); }}
            onMouseLeave={() => { setHovMid(null);  onHoverMuscle?.(null);  }}
          />
        ))}
      </svg>
      <div className="body-lbl">{label}</div>
    </div>
  );

  return (
    <div>
      <div className="map-tooltip">{hovMid ? MI[hovMid]?.n : "\u00a0"}</div>
      <div className="body-map-wrap">
        {renderView(FM, "FRONT")}
        {renderView(BM, "BACK")}
      </div>
    </div>
  );
}
