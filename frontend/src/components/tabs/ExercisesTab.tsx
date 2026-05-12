import { useState } from "react";
import { Plus, Trash2, Pencil, Wrench, BookOpen } from "lucide-react";
import type { CustomExerciseDef } from "../../types";
import { MI } from "../../data/muscles";
import { getCustomExercises, deleteCustomExercise } from "../../data/exercises";
import CustomExerciseModal from "../workout/CustomExerciseModal";
import { useTxt } from "../../context/ToneContext";

export default function ExercisesTab() {
  const t = useTxt();
  const [items,    setItems]    = useState<CustomExerciseDef[]>(() => getCustomExercises());
  const [creating, setCreating] = useState(false);
  const [editing,  setEditing]  = useState<CustomExerciseDef | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const refresh = () => setItems(getCustomExercises());

  const handleDelete = (id: string) => {
    deleteCustomExercise(id);
    refresh();
    setExpanded(p => { const n = new Set(p); n.delete(id); return n; });
  };

  const toggleExpand = (id: string) =>
    setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="tab-anim">
      <div className="profile-section">
        <Wrench size={11} style={{ marginRight: 5, verticalAlign: -1 }} />
        {t("Custom Exercises", "Custom Lifts", "Custom Moves")}
      </div>

      <div className="profile-card">
        {items.length === 0 ? (
          <div className="cx-mgr-empty">
            {t(
              "No custom exercises yet. Build one to add it to your catalog.",
              "No homemade lifts yet, bro. Roll your own.",
              "No custom moves yet, bestie. Cook one up."
            )}
          </div>
        ) : (
          items.map(ex => {
            const primaryNames   = ex.primary.map(m => MI[m]?.n).filter(Boolean).join(" · ");
            const isOpen         = expanded.has(ex.id);
            const hasInstructions = !!ex.instructions?.trim();
            return (
              <div key={ex.id} className="cx-mgr-row cx-mgr-row-stack">
                <div className="cx-mgr-row-top">
                  <button
                    type="button"
                    className="cx-mgr-info"
                    onClick={() => toggleExpand(ex.id)}
                  >
                    <div className="cx-mgr-name">{ex.name}</div>
                    <div className="cx-mgr-meta">
                      {ex.type} · {ex.cat}{primaryNames ? ` · ${primaryNames}` : ""}
                    </div>
                  </button>
                  <div className="cx-mgr-actions">
                    <button
                      className="cx-mgr-del"
                      onClick={() => setEditing(ex)}
                      title={t("Edit", "Edit")}
                      aria-label="Edit"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      className="cx-mgr-del"
                      onClick={() => handleDelete(ex.id)}
                      title={t("Delete", "Delete")}
                      aria-label="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                {isOpen && (
                  <div className="cx-mgr-detail">
                    {hasInstructions ? (
                      <>
                        <div className="cx-mgr-detail-label">
                          <BookOpen size={11} style={{ marginRight: 4, verticalAlign: -1 }} />
                          {t("Instructions", "How to do it")}
                        </div>
                        <div className="cx-mgr-instructions">{ex.instructions}</div>
                      </>
                    ) : (
                      <div className="cx-mgr-detail-empty">
                        {t(
                          "No instructions yet. Tap edit to add cues.",
                          "No notes yet — hit edit and drop some wisdom.",
                          "No notes yet — hit edit and gatekeep nothing."
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        <button className="cx-mgr-add" onClick={() => setCreating(true)}>
          <Plus size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
          {t("Add Custom Exercise", "Build a New Lift", "Cook Up a New Move")}
        </button>
      </div>

      {creating && (
        <CustomExerciseModal
          onClose={() => setCreating(false)}
          onCreated={refresh}
        />
      )}
      {editing && (
        <CustomExerciseModal
          onClose={() => setEditing(null)}
          onCreated={refresh}
          editing={editing}
        />
      )}
    </div>
  );
}
