import { useMemo } from "react";
import type { E1RMPoint } from "../analysis";

interface Props {
  points: E1RMPoint[];
  width?: number;
  height?: number;
  /** Color override. Falls back to --primary CSS var. */
  color?: string;
}

/**
 * Minimal SVG line chart for estimated 1RM over time.
 * No dependency, no axis labels other than min/max — the parent provides
 * context (exercise name, dates).
 */
export default function E1RMChart({ points, width = 320, height = 120, color }: Props) {
  const path = useMemo(() => {
    if (points.length < 2) return "";
    const xs = points.map((_, i) => i / (points.length - 1));
    const ys = points.map(p => p.e1rm);
    const lo = Math.min(...ys);
    const hi = Math.max(...ys);
    const span = hi - lo || 1;
    const padL = 28, padR = 8, padT = 12, padB = 18;
    const w = width - padL - padR;
    const h = height - padT - padB;
    return points
      .map((p, i) => {
        const x = padL + xs[i] * w;
        const y = padT + h - ((p.e1rm - lo) / span) * h;
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }, [points, width, height]);

  const stroke = color ?? "var(--primary)";

  if (points.length < 2) {
    return (
      <div className="chart-empty">Need at least 2 sessions to chart e1RM.</div>
    );
  }
  const lo = Math.min(...points.map(p => p.e1rm));
  const hi = Math.max(...points.map(p => p.e1rm));

  return (
    <svg className="e1rm-chart" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <text x="6" y="18" fontSize="10" fill="currentColor" opacity="0.6">{hi.toFixed(0)}</text>
      <text x="6" y={height - 4} fontSize="10" fill="currentColor" opacity="0.6">{lo.toFixed(0)}</text>
      <path d={path} fill="none" stroke={stroke} strokeWidth="2" />
      {points.map((p, i) => {
        const xs = i / (points.length - 1);
        const padL = 28, padR = 8, padT = 12, padB = 18;
        const w = width - padL - padR;
        const h = height - padT - padB;
        const lo = Math.min(...points.map(pp => pp.e1rm));
        const hi = Math.max(...points.map(pp => pp.e1rm));
        const span = hi - lo || 1;
        const x = padL + xs * w;
        const y = padT + h - ((p.e1rm - lo) / span) * h;
        return (
          <circle key={i} cx={x} cy={y} r="3" fill={stroke}>
            <title>{`${p.date}: e1RM ${p.e1rm} (${p.topW}×${p.topR})`}</title>
          </circle>
        );
      })}
    </svg>
  );
}
