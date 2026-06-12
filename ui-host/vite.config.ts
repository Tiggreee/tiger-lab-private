import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:8787'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    proxy: {
      '/dev-access': {
        target: apiProxyTarget,
        changeOrigin: true
      }
    },
    fs: {
      allow: ['..']
    }
  }
})
