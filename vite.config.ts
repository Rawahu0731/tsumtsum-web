import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: 'TSUM TSUM UTILITIES',
        short_name: 'TSUM',
        description: 'ツムツム非公式攻略ツール',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        // tesseract-core.wasm.js in public/ is ~4.74MB and exceeds Workbox's default 2MB limit.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // Claim and activate the latest service worker immediately so new deployments take effect.
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // Always prefer network for the HTML shell to avoid serving stale pages from cache.
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              networkTimeoutSeconds: 10,
            },
          },
          {
            // Static assets (scripts/styles/images) can stay cache-first since they are fingerprinted by Vite.
            urlPattern: ({ request }) =>
              request.destination === 'script' ||
              request.destination === 'style' ||
              request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'asset-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
})
