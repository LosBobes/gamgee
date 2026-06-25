// App version, derived from git at build time and injected by Vite's
// `define` (see vite.config.ts → __APP_VERSION__). Format is
// "<pkg-version>+g<short-sha>[-dirty]", falling back to the bare
// package.json version when git isn't available. The `typeof` guard keeps
// non-Vite consumers (e.g. vitest without the define) from crashing.
declare const __APP_VERSION__: string;

export const APP_VERSION =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0-dev";
