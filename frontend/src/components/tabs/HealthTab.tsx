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

  const chartData = healthMetrics.map(m => ({
    label: fmtShortDate(m.date),
    value: m.value,
    note:  m.note,
    id:    m.id,
  }));

  const baseline = chartData.length > 0 ? chartData[0].value : null;

  const reversed = [...healthMetrics].reverse();
  const visible  = showAll ? reversed : reversed.slice(0, 10);

  return (
    <div className="tab-anim">
      {toast && (
        <div className="health-toast">{toast}</div>
      )}

      {/* Metric selector */}
      <div className="health-metric-bar">
        {METRICS.map(m => (
          <button
            key={m.id}
            onClick={() => setActiveMetric(m)}
            className={`health-metric-btn${activeMetric.id === m.id ? " active" : ""}`}
            style={activeMetric.id === m.id
              ? { borderColor: m.color, background: `${m.color}22`, color: m.color }
              : undefined}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="profile-card">
        <div className="profile-section" style={{ margin: "0 0 12px" }}>
          {activeMetric.label} ({activeMetric.unit})
        </div>
        {chartData.length < 2 ? (
          <div className="health-empty">
            <Heart size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div>Log at least 2 entries to see your trend</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                domain={[
                  (min: number) => Math.floor(min * 0.95),
                  (max: number) => Math.ceil(max * 1.05),
                ]}
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                tickLine={false}
                axisLine={false}
                width={38}
              />
              {baseline !== null && (
                <ReferenceLine
                  y={baseline}
                  stroke="var(--border)"
                  strokeDasharray="4 4"
                  label={{ value: "Start", fill: "var(--muted)", fontSize: 11, position: "insideTopLeft" }}
                />
              )}
              <Tooltip
                contentStyle={{
                  background: "var(--s2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 13,
                  color: "var(--text)",
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, _name: any, entry: any) => {
                  const note = entry?.payload?.note;
                  return [`${value} ${activeMetric.unit}${note ? ` · ${note}` : ""}`, activeMetric.label];
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
      <div className="profile-card">
        <div className="profile-section" style={{ margin: "0 0 12px" }}>
          Log {activeMetric.label}
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="field-input"
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              style={{ flex: 1 }}
            />
            <div className="field-unit-wrap">
              <input
                type="number"
                placeholder="Value"
                value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                step={activeMetric.step}
                min={activeMetric.min}
                max={activeMetric.max}
              />
              <span className="field-unit-label">{activeMetric.unit}</span>
            </div>
          </div>
          <textarea
            className="field-input field-textarea"
            placeholder="Note (optional)"
            value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            rows={2}
          />
          <button type="submit" className="btn-primary" disabled={!form.value}>
            <Plus size={16} /> Log Entry
          </button>
        </form>
      </div>

      {/* History */}
      {healthMetrics.length > 0 && (
        <div className="profile-card">
          <div className="profile-section" style={{ margin: "0 0 12px" }}>History</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {visible.map(m => (
              <div key={m.id} className="health-row">
                <span className="health-row-date">{fmtShortDate(m.date)}</span>
                <span className="health-row-val">
                  {m.value} <span className="health-row-unit">{activeMetric.unit}</span>
                </span>
                <span className="health-row-note">{m.note ?? ""}</span>
                <button
                  className="health-row-del"
                  onClick={() => handleDelete(m.id)}
                  aria-label="Delete entry"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          {reversed.length > 10 && !showAll && (
            <button className="health-load-more" onClick={() => setShowAll(true)}>
              <ChevronDown size={14} /> Load more ({reversed.length - 10} more)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
