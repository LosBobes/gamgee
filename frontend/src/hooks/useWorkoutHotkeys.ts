import { useEffect } from "react";

/**
 * Document-level shortcuts for ActiveWorkout. Active only while the active
 * flag is true and not while a form input is focused (so typing reps doesn't
 * trigger them).
 *
 *   Space            — toggle the first not-done set's done state
 *   ArrowUp/Down     — bump reps ±1 on the focused set input
 *   Shift+Up/Down    — bump weight ±2.5 on the focused set input
 */
interface Handlers {
  onSpace?: () => void;
  onAdjustWeight?: (delta: number) => void;
  onAdjustReps?: (delta: number) => void;
}

export function useWorkoutHotkeys(active: boolean, h: Handlers): void {
  useEffect(() => {
    if (!active) return;
    const isTyping = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
        || (el as HTMLElement).isContentEditable;
    };

    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Don't intercept when the user is typing in a field — unless they're
      // explicitly using the weight/reps adjust shortcuts.
      const typing = isTyping(e.target);
      if (e.key === " " && !typing) {
        e.preventDefault();
        h.onSpace?.();
        return;
      }
      if ((e.key === "ArrowUp" || e.key === "ArrowDown") && typing) {
        // Let native arrow keys win in number inputs to bump by step.
        return;
      }
      if (e.key === "ArrowUp" && !typing) {
        e.preventDefault();
        if (e.shiftKey) h.onAdjustWeight?.(2.5);
        else h.onAdjustReps?.(1);
      }
      if (e.key === "ArrowDown" && !typing) {
        e.preventDefault();
        if (e.shiftKey) h.onAdjustWeight?.(-2.5);
        else h.onAdjustReps?.(-1);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, h.onSpace, h.onAdjustWeight, h.onAdjustReps]);
}
