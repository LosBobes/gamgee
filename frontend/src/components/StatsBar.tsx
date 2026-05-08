import type { WorkoutExercise } from "../types";

interface Props {
  exercises: WorkoutExercise[];
  doneSets:  number;
}

export default function StatsBar({ exercises, doneSets }: Props) {
  const volume = exercises.reduce((a, ex) => ex.type !== "strength" ? a :
    a + ex.sets.filter(s => s.done).reduce((b, s) => b + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0), 0);
  const reps = exercises.reduce((a, ex) => a + ex.sets.filter(s => s.done && s.reps).length, 0);

  const stats = [
    { v: exercises.length,                              l: "Exercises" },
    { v: doneSets,                                      l: "Sets Done"  },
    { v: volume > 0 ? `${Math.round(volume)}` : "—",   l: "Vol (kg)"  },
    { v: reps || "—",                                   l: "Reps"      },
  ];

  return (
    <div className="stats-bar">
      {stats.map(({ v, l }) => (
        <div key={l} className="stat">
          <div className="stat-val">{v}</div>
          <div className="stat-lbl">{l}</div>
        </div>
      ))}
    </div>
  );
}
