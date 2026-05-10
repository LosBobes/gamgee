import { useState } from "react";
import { X, Plus, Trash2, Check, Minus } from "lucide-react";
import type { WorkoutSession, WorkoutExercise, WorkoutSet, ExerciseDef } from "../../types";
import { ALL_EX } from "../../data/exercises";
import { fmtDate } from "../../utils";

interface Props {
  session: WorkoutSession;
  onSave: (updated: WorkoutSession) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function EditWorkoutModal({ session, onSave, onDelete, onClose }: Props) {
  const [exercises, setExercises] = useState<WorkoutExercise[]>(
    session.exercises.map(ex => ({ ...ex, sets: ex.sets.map(s => ({ ...s })) }))
  );
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updateSet = (uid: string, idx: number, field: keyof WorkoutSet, value: string) =>
    setExercises(p => p.map(ex =>
      ex.uid !== uid ? ex : { ...ex, sets: ex.sets.map((s, i) => i === idx ? { ...s, [field]: value } : s) }
    ));

  const addSet = (uid: string) =>
    setExercises(p => p.map(ex =>
      ex.uid !== uid ? ex : { ...ex, sets: [...ex.sets, { weight: "", reps: "", done: true }] }
    ));

  const removeSet = (uid: string, idx: number) =>
    setExercises(p => p.map(ex =>
      ex.uid !== uid ? ex : { ...ex, sets: ex.sets.filter((_, i) => i !== idx) }
    ));

  const removeExercise = (uid: string) =>
    setExercises(p => p.filter(ex => ex.uid !== uid));

  const addExercise = (ex: ExerciseDef) => {
    setExercises(p => [...p, {
      ...ex,
      uid: `${ex.id}_${Date.now()}`,
      sets: [{ weight: "", reps: "", done: true }],
    }]);
    setShowPicker(false);
    setSearch("");
  };

  const handleSave = () => {
    onSave({ ...session, exercises: exercises.filter(ex => ex.sets.length > 0) });
  };

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    onDelete(session.id);
  };

  const filtered = ALL_EX.filter(ex =>
    !search || ex.name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 50);

  const weightLabel = (type: string) =>
    type === "cardio" ? "MIN" : type === "timed" ? "SEC" : "KG";

  const hasReps = (type: string) => type !== "timed";

  return (
    <>
      <div className="overlay" onClick={onClose}>
        <div className="edit-sheet" onClick={e => e.stopPropagation()}>
          <div className="edit-sheet-hdr">
            <div>
              <div className="edit-sheet-title">EDIT SESSION</div>
              <div className="edit-sheet-date">{fmtDate(session.date)}</div>
            </div>
            <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
          </div>

          <div className="edit-sheet-body">
            {exercises.map(ex => {
              const cols = hasReps(ex.type) ? "22px 1fr 1fr 26px" : "22px 1fr 26px";
              return (
                <div key={ex.uid} className="edit-ex-card">
                  <div className="edit-ex-hdr">
                    <span className="edit-ex-name">{ex.name}</span>
                    <button
                      className="btn-icon"
                      style={{ color: "var(--red)", borderColor: "rgba(200,68,68,0.4)" }}
                      onClick={() => removeExercise(ex.uid)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="edit-set-table">
                    <div className="edit-set-col-hdr" style={{ gridTemplateColumns: cols }}>
                      <span className="col-lbl">#</span>
                      <span className="col-lbl">{weightLabel(ex.type)}</span>
                      {hasReps(ex.type) && <span className="col-lbl">{ex.type === "cardio" ? "KM" : "REPS"}</span>}
                      <span />
                    </div>
                    {ex.sets.map((s, i) => (
                      <div key={i} className="edit-set-row" style={{ gridTemplateColumns: cols }}>
                        <span className="set-num">{i + 1}</span>
                        <input
                          className="set-inp"
                          type="number"
                          inputMode="decimal"
                          value={s.weight}
                          onChange={e => updateSet(ex.uid, i, "weight", e.target.value)}
                        />
                        {hasReps(ex.type) && (
                          <input
                            className="set-inp"
                            type="number"
                            inputMode="decimal"
                            value={s.reps}
                            onChange={e => updateSet(ex.uid, i, "reps", e.target.value)}
                          />
                        )}
                        <button className="rm-set-btn" onClick={() => removeSet(ex.uid, i)}>
                          <Minus size={12} />
                        </button>
                      </div>
                    ))}
                    <button className="btn-add-set" onClick={() => addSet(ex.uid)}>+ ADD SET</button>
                  </div>
                </div>
              );
            })}
            <button className="edit-add-ex-btn" onClick={() => setShowPicker(true)}>
              <Plus size={14} /> ADD EXERCISE
            </button>
          </div>

          <div className="edit-sheet-footer">
            <button
              className={`edit-delete-btn${confirmDelete ? " confirm" : ""}`}
              onClick={handleDelete}
              onBlur={() => setConfirmDelete(false)}
            >
              <Trash2 size={13} />
              {confirmDelete ? "CONFIRM?" : "DELETE"}
            </button>
            <button className="edit-save-btn" onClick={handleSave}>
              <Check size={13} /> SAVE
            </button>
          </div>
        </div>
      </div>

      {showPicker && (
        <div className="overlay" style={{ zIndex: 300 }} onClick={() => setShowPicker(false)}>
          <div className="picker" onClick={e => e.stopPropagation()}>
            <div className="picker-hdr">
              <span className="picker-title">ADD EXERCISE</span>
              <button className="btn-icon" onClick={() => setShowPicker(false)}><X size={16} /></button>
            </div>
            <input
              className="search-inp"
              placeholder="Search exercises..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
            {filtered.map(ex => (
              <button key={ex.id} className="ex-opt" onClick={() => addExercise(ex)}>
                <div className="type-dot" style={{
                  background: ex.type === "cardio" ? "var(--green)" : ex.type === "timed" ? "var(--blue)" : "var(--accent)"
                }} />
                {ex.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
