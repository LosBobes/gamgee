import type { MetricDef } from "../types";

export const METRICS: MetricDef[] = [
  { id: "weight",     label: "Body Weight", unit: "kg",  color: "#6366f1", step: 0.1, min: 30,  max: 300 },
  { id: "body_fat",   label: "Body Fat",    unit: "%",   color: "#f59e0b", step: 0.1, min: 3,   max: 60  },
  { id: "waist",      label: "Waist",       unit: "cm",  color: "#10b981", step: 0.5, min: 50,  max: 200 },
  { id: "chest",      label: "Chest",       unit: "cm",  color: "#3b82f6", step: 0.5, min: 50,  max: 200 },
  { id: "hips",       label: "Hips",        unit: "cm",  color: "#ec4899", step: 0.5, min: 50,  max: 200 },
  { id: "bicep",      label: "Bicep",       unit: "cm",  color: "#8b5cf6", step: 0.5, min: 20,  max: 70  },
  { id: "thigh",      label: "Thigh",       unit: "cm",  color: "#f97316", step: 0.5, min: 30,  max: 100 },
  { id: "resting_hr", label: "Resting HR",  unit: "bpm", color: "#ef4444", step: 1,   min: 30,  max: 120 },
  { id: "zinc",       label: "Zinc Intake", unit: "mg",  color: "#71717a", step: 0.5, min: 0,   max: 100 },
];
