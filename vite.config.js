import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// This file tells Vite how to run the development server.
// For a college project you normally do not need to change anything here.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // allow the app to be opened from other devices / preview servers
    port: 5173,
    strictPort: false,
    allowedHosts: true, // allow preview/proxy hosts (harmless locally)
  },
})
