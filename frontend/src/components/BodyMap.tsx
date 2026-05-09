import { useState } from "react";
import type { MuscleShape, BodyMapProps } from "../types";
import { MI } from "../data/muscles";
import { BODY_PATH, FM, BM } from "../data/bodymap";

export default function BodyMap({ active = {}, preview = {}, onHoverMuscle }: BodyMapProps) {
  const [hovMid, setHovMid] = useState<string | null>(null);

  const mFill = (mid: string): string => {
    if (preview[mid])                return "var(--green)";
    if (active[mid] === "primary")   return "var(--accent)";
    if (active[mid] === "secondary") return "var(--accent)";
    if (hovMid === mid)              return "rgba(255,255,255,1)";
    return "none";
  };

  const mFillOpacity = (mid: string): number => {
    if (preview[mid])                return 0.82;
    if (active[mid] === "primary")   return 0.86;
    if (active[mid] === "secondary") return 0.36;
    if (hovMid === mid)              return 0.06;
    return 1;
  };

  const mStroke = (mid: string): string => {
    if (preview[mid])                return "var(--green)";
    if (active[mid] === "primary")   return "var(--accent)";
    if (active[mid] === "secondary") return "var(--accent)";
    if (hovMid === mid)              return "rgba(255,255,255,1)";
    return "rgba(255,255,255,1)";
  };

  const mStrokeOpacity = (mid: string): number => {
    if (preview[mid])                return 0.95;
    if (active[mid] === "primary")   return 1;
    if (active[mid] === "secondary") return 0.60;
    if (hovMid === mid)              return 0.38;
    return 0.15;
  };

  const mStrokeW = (mid: string): number => {
    if (active[mid] === "primary" || preview[mid]) return 1.1;
    if (active[mid] === "secondary")               return 0.8;
    if (hovMid === mid)                            return 0.7;
    return 0.45;
  };

  const isActive = (mid: string) => !!(active[mid] || preview[mid]);

  const renderView = (muscles: MuscleShape[], label: string, id: string) => {
    // Render inactive first so active muscles always appear on top of the glow
    const sorted = [...muscles].sort((a, b) => {
      const rank = (s: MuscleShape) => {
        if (preview[s.mid]) return 3;
        if (active[s.mid] === "primary") return 2;
        if (active[s.mid] === "secondary") return 1;
        return 0;
      };
      return rank(a) - rank(b);
    });

    return (
      <div className="body-view">
        <svg viewBox="0 0 100 180" width={90} height={162} style={{ display: "block", overflow: "visible" }}>
          <defs>
            <filter id={`glow-${id}`} x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <clipPath id={`clip-${id}`}>
              <circle cx="50" cy="13" r="13"/>
              <path d={BODY_PATH}/>
            </clipPath>
          </defs>

          {/* ── Body silhouette ── */}
          <circle
            cx="50" cy="13" r="12"
            fill="rgba(255,255,255,0.05)"
            stroke="rgba(255,255,255,0.13)"
            strokeWidth={0.7}
          />
          <path
            d={BODY_PATH}
            fill="rgba(255,255,255,0.05)"
            stroke="rgba(255,255,255,0.13)"
            strokeWidth={0.7}
          />

          {/* ── Muscle shapes — always visible as outlines, lit when active ── */}
          <g clipPath={`url(#clip-${id})`}>
            {sorted.map((s, i) => {
              const act = isActive(s.mid);
              const sharedProps = {
                fill:         mFill(s.mid),
                fillOpacity:  mFillOpacity(s.mid),
                stroke:       mStroke(s.mid),
                strokeOpacity: mStrokeOpacity(s.mid),
                strokeWidth:  mStrokeW(s.mid),
                filter:      act ? `url(#glow-${id})` : undefined,
                style:       { cursor: "default" } as React.CSSProperties,
                onMouseEnter: () => { setHovMid(s.mid); onHoverMuscle?.(s.mid); },
                onMouseLeave: () => { setHovMid(null);  onHoverMuscle?.(null);  },
              };

              if ("d" in s) {
                return <path key={i} d={s.d} {...sharedProps} />;
              }

              const transform = s.rotate
                ? `rotate(${s.rotate},${s.cx},${s.cy})`
                : undefined;
              return (
                <ellipse
                  key={i}
                  cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry}
                  transform={transform}
                  {...sharedProps}
                />
              );
            })}
          </g>
        </svg>
        <div className="body-lbl">{label}</div>
      </div>
    );
  };

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
