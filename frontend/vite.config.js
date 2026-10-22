import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // listen on all interfaces so the app is reachable via the server IP
    port: 5176,
    strictPort: true,
  },
})
