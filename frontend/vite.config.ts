import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// BACKEND_URL is injected by docker-compose; falls back to localhost for local dev
const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000'

// Derive the displayed app version from git at build time so it always
// reflects the actual built commit instead of a hand-maintained constant.
// Format: "<pkg-version>+<short-sha>[-dirty]" (e.g. "1.0.0+g663e980").
// Falls back to the bare package.json version when git isn't available
// (e.g. building from a tarball or a Docker context without the .git dir).
// VITE_APP_VERSION, if set, overrides everything so CI/Docker can pin it.
const appVersion = (() => {
  const pkgVersion = JSON.parse(
    readFileSync(new URL('./package.json', import.meta.url), 'utf-8'),
  ).version as string
  if (process.env.VITE_APP_VERSION) return process.env.VITE_APP_VERSION
  try {
    const sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim()
    const dirty = execSync('git status --porcelain', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim() ? '-dirty' : ''
    return sha ? `${pkgVersion}+g${sha}${dirty}` : pkgVersion
  } catch {
    return pkgVersion
  }
})()

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon-*.png', 'apple-touch-icon.png', 'icon-*.png'],
      manifest: {
        name: 'Gamgee',
        short_name: 'Gamgee',
        description: 'Track workouts, log personal records, and visualize your fitness progress.',
        theme_color: '#28D1FF',
        background_color: '#0E0C0A',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait-primary',
        icons: [
          { src: 'icon-192.png',          sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png',          sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallbackDenylist: [/^\/api\//],
        importScripts: ['/push-handlers.js'],
        runtimeCaching: [
          {
            // Never cache: SSE / chat WS are long-lived responses Workbox
            // would otherwise try to clone, and /api/auth/* responses depend
            // on the Authorization header so they must always hit the network.
            // Caching auth replies caused Firefox to serve a stale 401 right
            // after login, kicking the user back to the login screen.
            urlPattern: /^\/api\/(events|chat\/ws|auth\/)/,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
        // Forward WebSocket upgrade requests (used by /api/chat/ws) to the
        // backend, otherwise the dev server returns 404 for the upgrade.
        ws: true,
      },
    },
  },
})
