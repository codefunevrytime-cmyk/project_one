import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const projectDir = fileURLToPath(new URL('.', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // ── Multi-page dev fallback ──────────────────────────────────────────
    // vendor.html is a separate rollup entry (see build.rollupOptions.input
    // below), so /vendor/dashboard etc. only resolve correctly when
    // navigated to client-side via VendorApp's own <BrowserRouter>. A hard
    // refresh on any /vendor/* URL is a real HTTP request; without this,
    // Vite's dev server falls back to serving the *root* index.html, which
    // boots the main SPA instead — landing you back on "/". This rewrites
    // the request to vendor.html before that fallback kicks in, so
    // VendorApp's router can take over and resolve the sub-path itself.
    {
      name: 'vendor-spa-fallback',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url.startsWith('/vendor') && !req.url.startsWith('/vendor.html')) {
            req.url = '/vendor.html';
          }
          next();
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main:   resolve(projectDir, 'index.html'),
        vendor: resolve(projectDir, 'vendor.html'),
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('recharts')) return 'charts'
          if (id.includes('socket.io-client')) return 'socket'
          if (id.includes('react') || id.includes('scheduler')) return 'react'
          return undefined
        },
      },
    },
  },
  server: {
    // Lets ngrok's forwarding domain through Vite's host check.
    // For quick one-off testing you can swap this line for: allowedHosts: true
    allowedHosts: ['sharpie-pasty-equity.ngrok-free.dev'],
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Images are stored/served relative to the backend
      // (e.g. "/uploads/xyz.png"), so requests for them also need
      // to be forwarded to the backend — same as /api above.
      // Without this, /uploads/* just 404s on Vite's dev server.
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Socket.IO's handshake starts as a normal HTTP request but then
      // upgrades to a WebSocket connection — ws: true is what tells Vite's
      // proxy to forward that upgrade too, not just the initial request.
      // Without this, the browser's WebSocket connect just times out (the
      // proxy accepts the HTTP part but never completes the upgrade),
      // which is exactly the "connect_error: timeout" seen in devtools.
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
