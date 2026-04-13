import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Même intention que nginx : cache navigateur pour `public/chess` et `public/imgs` en dev direct (port 5173). */
function publicStaticCacheHeaders() {
  const maxAge = 'public, max-age=604800'
  return {
    name: 'public-static-cache-headers',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathOnly = (req.url ?? '').split('?')[0] || ''
        if (!pathOnly.startsWith('/chess/') && !pathOnly.startsWith('/imgs/')) {
          next()
          return
        }
        if (res.__staticCacheHdr) {
          next()
          return
        }
        res.__staticCacheHdr = true
        const origEnd = res.end.bind(res)
        res.end = (...args) => {
          try {
            if (!res.headersSent) {
              res.setHeader('Cache-Control', maxAge)
            }
          } catch {
            /* ignore */
          }
          return origEnd(...args)
        }
        next()
      })
    },
  }
}

const hmrViaNginx = process.env.VITE_HMR_NGINX === '1'
const hmrHost = process.env.VITE_HMR_HOST || 'localhost'
// Hors Docker : nginx sur la machine hôte. Sous Docker, VITE_PROXY_TARGET=https://nginx:443 (compose).
const proxyTarget = process.env.VITE_PROXY_TARGET || 'https://127.0.0.1:443'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), publicStaticCacheHeaders()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    ...(hmrViaNginx
      ? {
          hmr: {
            protocol: 'wss',
            host: hmrHost,
            clientPort: 443,
          },
        }
      : {}),
    watch: {
      usePolling: true,
    },
    proxy: {
      // En `npm run dev`, forward les appels API vers nginx (HTTPS) sur la machine hôte
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        secure: false,
      },
      // Pages légales statiques (même origine qu’en prod derrière nginx)
      '/legal': {
        target: proxyTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
