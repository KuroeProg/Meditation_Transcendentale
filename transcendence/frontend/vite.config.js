import { defineConfig } from 'vite'

export default defineConfig({
  root: 'interface',
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true 
    },
    hmr: {
      clientPort: 8443,
      protocol: 'wss'
    }
  }
})