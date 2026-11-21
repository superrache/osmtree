import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // OVERPASS_URL is read by the client (src/Overpass.ts); only VITE_* is exposed by default
  envPrefix: ['VITE_', 'OVERPASS_'],
  server: {
    host: '127.0.0.1', // !important: osm-auth allows only this host for http (not 'localhost')
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8788' // Pages Functions served by `wrangler pages dev`
    }
  }
})
