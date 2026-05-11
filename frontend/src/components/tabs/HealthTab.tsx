import { useState, useEffect } from "react";
import { Heart, Plus, Trash2, ChevronDown } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";
import type { BodyMetric, MetricDef } from "../../types";
import { METRICS } from "../../data/metrics";
import { fmtShortDate } from "../../utils";

interface Props {
  healthMetrics: BodyMetric[];
  fetchHealthMetrics: (type: string) => Promise<void>;
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
}

const cardStyle: React.CSSProperties = {
  background: "var(--card)",
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
};

const sectionLabel: React.CSSProperties = {
  margin: "0 0 12px",
  fontSize: 13,
  color: "var(--muted)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  fontWeight: 600,
};

export default function HealthTab({ healthMetrics, fetchHealthMetrics, authFetch }: Props) {
  const [activeMetric, setActiveMetric] = useState<MetricDef>(METRICS[0]);
  const [showAll, setShowAll]           = useState(false);
  const [toast, setToast]               = useState<string | null>(null);
  const [form, setForm] = useState({
    date:  new Date().toISOString().slice(0, 10),
    value: "",
    note:  "",
  });

  useEffect(() => {
    fetchHealthMetrics(activeMetric.id);
    setShowAll(false);
  // fetchHealthMetrics is stable (defined once in WorkoutTracker)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMetric.id]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.value) return;
    const res = await authFetch("/api/health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metric_type: activeMetric.id,
        value:       parseFloat(form.value),
        unit:        activeMetric.unit,
        date:        form.date,
        note:        form.note || null,
      }),
    });
    if (res.ok) {
      setForm(f => ({ ...f, value: "", note: "" }));
      await fetchHealthMetrics(activeMetric.id);
      showToast("Logged!");
    }
  };

  const handleDelete = async (id: number) => {
    await authFetch(`/api/health/${id}`, { method: "DELETE" });
    await fetchHealthMetrics(activeMetric.id);
  };

  // Chart data — already ordered ascending by date from the API
  const chartData = healthMetrics.map(m => ({
    label: fmtShortDate(m.date),
    value: m.value,
    note:  m.note,
    id:    m.id,
  }));

  const baseline = chartData.length > 0 ? chartData[0].value : null;

  // History list — reverse chronological
  const reversed = [...healthMetrics].reverse();
  const visible  = showAll ? reversed : reversed.slice(0, 10);

  return (
    <div className="tab-anim">
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
          background: "#10b981", color: "white", padding: "8px 18px",
          borderRadius: 8, fontSize: 14, fontWeight: 600, zIndex: 1000,
          pointerEvents: "none",
        }}>
          {toast}
        </div>
      )}

      {/* Metric selector */}
      <div style={{ display: "flex", overflowX: "auto", gap: 8, paddingBottom: 8, marginBottom: 16 }}>
        {METRICS.map(m => (
          <button
            key={m.id}
            onClick={() => setActiveMetric(m)}
            style={{
              flexShrink: 0,
              padding: "6px 14px",
              borderRadius: 20,
              border: `2px solid ${activeMetric.id === m.id ? m.color : "transparent"}`,
              background: activeMetric.id === m.id ? `${m.color}22` : "var(--card)",
              color: activeMetric.id === m.id ? m.color : "var(--muted)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div style={cardStyle}>
        <p style={sectionLabel}>{activeMetric.label} ({activeMetric.unit})</p>
        {chartData.length < 2 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "var(--muted)", fontSize: 14 }}>
            <Heart size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div>Log at least 2 entries to see your trend</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#888" }}
                tickLine={false}
                axisLine={{ stroke: "#333" }}
              />
              <YAxis
                domain={[
                  (min: number) => Math.floor(min * 0.95),
                  (max: number) => Math.ceil(max * 1.05),
                ]}
                tick={{ fontSize: 11, fill: "#888" }}
                tickLine={false}
                axisLine={false}
                width={38}
              />
              {baseline !== null && (
                <ReferenceLine
                  y={baseline}
                  stroke="#444"
                  strokeDasharray="4 4"
                  label={{ value: "Start", fill: "#666", fontSize: 11, position: "insideTopLeft" }}
                />
              )}
              <Tooltip
                contentStyle={{
                  background: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: 8,
                  fontSize: 13,
                  color: "#fff",
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, _name: any, entry: any) => {
                  const note = entry?.payload?.note;
                  return [`${value} ${activeMetric.unit}${note ? ` — ${note}` : ""}`, activeMetric.label];
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={activeMetric.color}
                strokeWidth={2}
                dot={{ r: 3, fill: activeMetric.color, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                isAnimationActive
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Log form */}
      <div style={cardStyle}>
        <p style={sectionLabel}>Log {activeMetric.label}</p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              style={{
                flex: 1, background: "var(--bg)", border: "1px solid #333",
                borderRadius: 8, padding: "8px 10px", color: "white", fontSize: 14,
              }}
            />
            <div style={{
              display: "flex", alignItems: "center", flex: 1,
              background: "var(--bg)", border: "1px solid #333", borderRadius: 8,
            }}>
              <input
                type="number"
                placeholder={`Value`}
                value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                step={activeMetric.step}
                min={activeMetric.min}
                max={activeMetric.max}
                style={{
                  flex: 1, background: "transparent", border: "none",
                  padding: "8px 10px", color: "white", fontSize: 14, outline: "none",
                }}
              />
              <span style={{ paddingRight: 10, color: "var(--muted)", fontSize: 13 }}>
                {activeMetric.unit}
              </span>
            </div>
          </div>
          <textarea
            placeholder="Note (optional)"
            value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            rows={2}
            style={{
              background: "var(--bg)", border: "1px solid #333", borderRadius: 8,
              padding: "8px 10px", color: "white", fontSize: 14, resize: "none",
              fontFamily: "inherit",
            }}
          />
          <button
            type="submit"
            disabled={!form.value}
            style={{
              background: form.value ? activeMetric.color : "#333",
              color: "white", border: "none", borderRadius: 8, padding: "10px",
              fontSize: 14, fontWeight: 600,
              cursor: form.value ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              transition: "background 0.15s",
            }}
          >
            <Plus size={16} /> Log Entry
          </button>
        </form>
      </div>

      {/* History */}
      {healthMetrics.length > 0 && (
        <div style={cardStyle}>
          <p style={sectionLabel}>History</p>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {visible.map(m => (
              <div
                key={m.id}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 0", borderBottom: "1px solid #222",
                }}
              >
                <span style={{ color: "var(--muted)", fontSize: 12, minWidth: 70 }}>
                  {fmtShortDate(m.date)}
                </span>
                <span style={{ fontWeight: 600, color: "white", minWidth: 72 }}>
                  {m.value} <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 12 }}>{activeMetric.unit}</span>
                </span>
                <span style={{
                  color: "var(--muted)", fontSize: 12, flex: 1,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {m.note ?? ""}
                </span>
                <button
                  onClick={() => handleDelete(m.id)}
                  aria-label="Delete entry"
                  style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4, lineHeight: 0 }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          {reversed.length > 10 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              style={{
                marginTop: 12, background: "none", border: "none",
                color: "var(--muted)", cursor: "pointer", fontSize: 13,
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              <ChevronDown size={14} /> Load more ({reversed.length - 10} more)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
