import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// BACKEND_URL is injected by docker-compose; falls back to localhost for local dev
const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000'

export default defineConfig({
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
        orientation: 'portrait',
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
            // Never cache the SSE stream or the chat WebSocket upgrade — both
            // are long-lived responses Workbox would otherwise try to clone.
            urlPattern: /^\/api\/(events|chat\/ws)/,
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
