import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // main.tsx registers the service worker itself via
      // `virtual:pwa-register`, so it can silently activate updates and
      // reload instead of leaving a new SW stuck "waiting" — don't also
      // inject the plugin's own bare registerSW.js script.
      injectRegister: false,
      // Push notifications need a push-event listener, which the plugin's
      // default auto-generated service worker can't be extended with —
      // injectManifest lets src/sw.ts be a real (precache-aware) service
      // worker we author ourselves.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['logo.jpg'],
      manifest: {
        name: 'Super Market Hamada',
        short_name: 'Hamada',
        description: 'سوبر ماركت حمادة — browse products, prices and availability.',
        lang: 'ar',
        dir: 'rtl',
        start_url: '/',
        display: 'standalone',
        background_color: '#f4ede0',
        theme_color: '#0f3d2e',
        icons: [
          {
            src: '/pwa/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,woff2}'],
      },
    }),
  ],
})
