import { useState } from "react";
import type { MuscleDef, BodyMapProps } from "../types";
import { MI } from "../data/muscles";
import { BODY_PATH, FM, BM } from "../data/bodymap";

export default function BodyMap({ active = {}, preview = {}, onHoverMuscle }: BodyMapProps) {
  const [hovMid, setHovMid] = useState<string | null>(null);

  const fill = (mid: string): string => {
    if (preview[mid])                    return "rgba(76,168,124,0.88)";
    if (active[mid] === "primary")       return "rgba(200,136,28,0.92)";
    if (active[mid] === "secondary")     return "rgba(200,136,28,0.40)";
    return "none";
  };

  const renderView = (muscles: MuscleDef[], label: string, id: string) => (
    <div className="body-view">
      <svg viewBox="0 0 100 180" width={90} height={162} style={{ display: "block", overflow: "visible" }}>
        <defs>
          {/* Soft glow applied to active muscle highlights */}
          <filter id={`glow-${id}`} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3.5" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          {/* Clip all muscle elements to the body silhouette */}
          <clipPath id={`clip-${id}`}>
            <circle cx="50" cy="13" r="13"/>
            <path d={BODY_PATH}/>
          </clipPath>
        </defs>

        {/* ── Body silhouette ── */}
        <circle
          cx="50" cy="13" r="12"
          fill="rgba(255,255,255,0.055)"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth={0.75}
        />
        <path
          d={BODY_PATH}
          fill="rgba(255,255,255,0.055)"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth={0.75}
        />

        {/* ── Muscle highlights (clipped, with glow) ── */}
        <g clipPath={`url(#clip-${id})`}>
          {muscles.map((s, i) => {
            const f = fill(s.mid);
            if (f === "none") return null;
            return (
              <ellipse
                key={i}
                cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry}
                fill={f}
                filter={`url(#glow-${id})`}
              />
            );
          })}
        </g>

        {/* ── Invisible hit targets so tooltip works across all muscles ── */}
        <g clipPath={`url(#clip-${id})`}>
          {muscles.map((s, i) => (
            <ellipse
              key={i}
              cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry}
              fill="transparent"
              style={{ cursor: "default" }}
              onMouseEnter={() => { setHovMid(s.mid); onHoverMuscle?.(s.mid); }}
              onMouseLeave={() => { setHovMid(null);  onHoverMuscle?.(null);  }}
            />
          ))}
        </g>
      </svg>
      <div className="body-lbl">{label}</div>
    </div>
  );

  return (
    <div>
      <div className="map-tooltip">{hovMid ? MI[hovMid]?.n : "\u00a0"}</div>
      <div className="body-map-wrap">
        {renderView(FM, "FRONT", "front")}
        {renderView(BM, "BACK",  "back")}
      </div>
    </div>
  );
}
