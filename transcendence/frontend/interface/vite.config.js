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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), publicStaticCacheHeaders()],
  server: {
    proxy: {
      // En `npm run dev`, forward les appels API vers nginx (HTTPS) sur la machine hôte
      '/api': {
        target: 'https://127.0.0.1:443',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
