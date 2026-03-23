import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
