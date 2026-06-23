import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// Construct OS V2 — mobile-first PWA. CSS Modules + tokens.css (no Tailwind).
// MSW serves the API contract in dev; the PWA service worker is prod-only, so
// the two service workers never collide (MSW worker is disabled in build).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Don't register the SW in dev — MSW owns the worker scope there.
      devOptions: { enabled: false },
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Construct OS',
        short_name: 'ConstructOS',
        description: 'Build Smarter. Manage Better.',
        theme_color: '#c85103',
        background_color: '#f6f6f8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
