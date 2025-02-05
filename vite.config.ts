import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1', // !important: osm-auth allows only this host for http (not 'localhost')
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})
