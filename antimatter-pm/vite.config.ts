import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // A tunnel supplies a public hostname dynamically; permit it so Vite can
    // serve the development app through the single public URL.
    allowedHosts: true,
    proxy: {
      // Keep browser requests same-origin so one public tunnel can serve the
      // frontend and forward API calls to the local FastAPI server.
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
