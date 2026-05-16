import { useEffect, useState } from "react";
import { Activity, Moon, Smile } from "lucide-react";
import type { SorenessLog } from "../types";
import { sorenessApi } from "../data/extraApi";

interface Props {
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
}

const GROUPS: { id: string; label: string }[] = [
  { id: "chest",     label: "Chest" },
  { id: "back",      label: "Back" },
  { id: "legs",      label: "Legs" },
  { id: "shoulders", label: "Shoulders" },
  { id: "arms",      label: "Arms" },
  { id: "core",      label: "Core" },
];

const SORENESS_LEVELS = [
  { v: 0, label: "Fine" },
  { v: 1, label: "Mild" },
  { v: 2, label: "Sore" },
  { v: 3, label: "Wrecked" },
];

export default function SorenessCheckIn({ authFetch }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [sleep,      setSleep]      = useState<number | null>(null);
  const [stress,     setStress]     = useState<number | null>(null);
  const [motivation, setMotivation] = useState<number | null>(null);
  const [soreness,   setSoreness]   = useState<Record<string, number>>({});
  const [msg,        setMsg]        = useState<string | null>(null);
  const [busy,       setBusy]       = useState(false);

  useEffect(() => {
    let cancelled = false;
    sorenessApi.list(authFetch).then(rows => {
      if (cancelled) return;
      const todayLog = rows.find(r => r.date === today);
      if (todayLog) {
        setSleep(todayLog.sleep);
        setStress(todayLog.stress);
        setMotivation(todayLog.motivation);
        setSoreness(todayLog.soreness_map || {});
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [authFetch, today]);

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const body: SorenessLog = {
        date: today, sleep, stress, motivation,
        soreness_map: soreness, note: null,
      };
      await sorenessApi.upsert(authFetch, body);
      setMsg("Saved.");
      setTimeout(() => setMsg(null), 1500);
    } catch (err) {
      setMsg(`Save failed: ${(err as Error).message}`);
    } finally { setBusy(false); }
  };

  const ScaleRow = ({ label, icon, value, onChange }: {
    label: string; icon: React.ReactNode; value: number | null; onChange: (v: number) => void;
  }) => (
    <div className="soreness-scale-row">
      <div className="soreness-scale-lbl">{icon} {label}</div>
      <div className="soreness-scale-buttons">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            className={`soreness-scale-btn${value === n ? " active" : ""}`}
            onClick={() => onChange(n)}
          >{n}</button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="soreness-card">
      <div className="soreness-card-hdr">Daily check-in · {today}</div>

      <ScaleRow label="Sleep"      icon={<Moon size={12} />}     value={sleep}      onChange={setSleep} />
      <ScaleRow label="Stress"     icon={<Activity size={12} />} value={stress}     onChange={setStress} />
      <ScaleRow label="Motivation" icon={<Smile size={12} />}    value={motivation} onChange={setMotivation} />

      <div className="soreness-group-hdr">Soreness</div>
      {GROUPS.map(g => (
        <div key={g.id} className="soreness-group-row">
          <div className="soreness-group-lbl">{g.label}</div>
          <div className="soreness-group-buttons">
            {SORENESS_LEVELS.map(({ v, label }) => (
              <button
                key={v}
                type="button"
                className={`soreness-level-btn${soreness[g.id] === v ? " active" : ""}`}
                onClick={() => setSoreness(s => ({ ...s, [g.id]: v }))}
                title={label}
              >{v}</button>
            ))}
          </div>
        </div>
      ))}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
        {msg && <span style={{ fontSize: 11, color: "var(--muted)" }}>{msg}</span>}
        <button className="btn-primary" disabled={busy} onClick={save} style={{ marginLeft: "auto" }}>Save</button>
      </div>
    </div>
  );
}
