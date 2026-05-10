import { useState } from "react";
import type { MuscleShape, BodyMapProps } from "../types";
import { MI } from "../data/muscles";
import { BODY_PATH, FM, BM, FRONT_LINES, BACK_LINES } from "../data/bodymap";

export default function BodyMap({ active = {}, preview = {}, focusMuscles, onHoverMuscle }: BodyMapProps) {
  const [hovMid, setHovMid] = useState<string | null>(null);

  const bodyPath = BODY_PATH;

  const mFill = (mid: string): string => {
    if (preview[mid])                return "var(--green)";
    if (active[mid] === "primary")   return "var(--accent)";
    if (active[mid] === "secondary") return "var(--accent)";
    if (hovMid === mid)              return "rgba(255,255,255,1)";
    if (focusMuscles?.[mid])         return "#E8981E";
    if (focusMuscles)                return "rgba(255,255,255,1)";
    return "none";
  };

  const mFillOpacity = (mid: string): number => {
    if (preview[mid])                return 0.82;
    if (active[mid] === "primary")   return 0.86;
    if (active[mid] === "secondary") return 0.36;
    if (hovMid === mid)              return 0.06;
    if (focusMuscles?.[mid])         return 0.22;
    if (focusMuscles)                return 0.04;
    return 1;
  };

  const mStroke = (mid: string): string => {
    if (preview[mid])                return "var(--green)";
    if (active[mid] === "primary")   return "var(--accent)";
    if (active[mid] === "secondary") return "var(--accent)";
    if (hovMid === mid)              return "rgba(255,255,255,1)";
    if (focusMuscles?.[mid])         return "#E8981E";
    return "rgba(255,255,255,1)";
  };

  const mStrokeOpacity = (mid: string): number => {
    if (preview[mid])                return 0.95;
    if (active[mid] === "primary")   return 1;
    if (active[mid] === "secondary") return 0.60;
    if (hovMid === mid)              return 0.38;
    if (focusMuscles?.[mid])         return 0.45;
    if (focusMuscles)                return 0.10;
    return 0.15;
  };

  const mStrokeW = (mid: string): number => {
    if (active[mid] === "primary" || preview[mid]) return 1.1;
    if (active[mid] === "secondary")               return 0.8;
    if (hovMid === mid)                            return 0.7;
    if (focusMuscles?.[mid])                       return 0.55;
    return 0.45;
  };

  const isActive = (mid: string) => !!(active[mid] || preview[mid]);

  const renderView = (muscles: MuscleShape[], detailLines: string[], label: string, id: string) => {
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
            <radialGradient id={`bg-${id}`} gradientUnits="userSpaceOnUse" cx="50" cy="60" r="58">
              <stop offset="0%"   stopColor="rgba(255,255,255,0.09)" />
              <stop offset="65%"  stopColor="rgba(255,255,255,0.04)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.02)" />
            </radialGradient>
            <clipPath id={`clip-${id}`}>
              <circle cx="50" cy="13" r="13"/>
              <path d={bodyPath}/>
            </clipPath>
          </defs>

          {/* ── Body silhouette ── */}
          <circle
            cx="50" cy="13" r="12"
            fill={`url(#bg-${id})`}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth={0.8}
          />
          <path
            d={bodyPath}
            fill={`url(#bg-${id})`}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth={0.8}
          />

          {/* ── Muscle shapes ── */}
          <g clipPath={`url(#clip-${id})`}>
            {sorted.map((s, i) => {
              const act = isActive(s.mid);
              const sharedProps = {
                fill:          mFill(s.mid),
                fillOpacity:   mFillOpacity(s.mid),
                stroke:        mStroke(s.mid),
                strokeOpacity: mStrokeOpacity(s.mid),
                strokeWidth:   mStrokeW(s.mid),
                filter:        act ? `url(#glow-${id})` : undefined,
                style:         { cursor: "default" } as React.CSSProperties,
                onMouseEnter:  () => { setHovMid(s.mid); onHoverMuscle?.(s.mid); },
                onMouseLeave:  () => { setHovMid(null);  onHoverMuscle?.(null);  },
              };

              if ("d" in s) return <path key={i} d={s.d} {...sharedProps} />;
              const transform = s.rotate ? `rotate(${s.rotate},${s.cx},${s.cy})` : undefined;
              return (
                <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} transform={transform} {...sharedProps} />
              );
            })}

            {/* ── Anatomical detail lines ── */}
            {detailLines.map((d, i) => (
              <path key={`dl-${i}`} d={d}
                fill="none"
                stroke="rgba(255,255,255,1)"
                strokeOpacity={0.10}
                strokeWidth={0.28}
                strokeLinecap="round"
              />
            ))}
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
        {renderView(FM, FRONT_LINES, "FRONT", "front")}
        {renderView(BM, BACK_LINES,  "BACK",  "back")}
      </div>
    </div>
  );
}
