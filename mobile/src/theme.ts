// Mirrors the web app's dark palette and cyan accent (--primary #28D1FF).
export const theme = {
  primary: "#28D1FF",
  bg: "#0E0C0A",
  surface: "#1A1714",
  surfaceAlt: "#241F1A",
  border: "#332B24",
  text: "#F5F1EC",
  muted: "#9A8F84",
  danger: "#FF5C5C",
  success: "#46D17F",
} as const;

export type Theme = typeof theme;
