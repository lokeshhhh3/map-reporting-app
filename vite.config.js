import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// This file tells Vite how to run the development server and how to build
// the site for publishing. For a college project you normally never edit it.
export default defineConfig(({ command }) => ({
  plugins: [react()],

  // "base" is the folder the finished website will live in.
  //
  //   command === 'build'  ->  npm run build, used for GitHub Pages.
  //                            The site is published at
  //                            https://<username>.github.io/map-reporting-app/
  //                            so every file link needs that folder at the front.
  //
  //   command === 'serve'  ->  npm run dev, used on your own laptop.
  //                            Keeps the address at http://localhost:5173/
  //                            so your local setup does not change.
  //
  // If you ever rename the GitHub repository, change the name here to match.
  base: command === 'build' ? '/map-reporting-app/' : '/',

  server: {
    host: '0.0.0.0', // allow the app to be opened from other devices / preview servers
    port: 5173,
    strictPort: false,
    allowedHosts: true, // allow preview/proxy hosts (harmless locally)
  },
}))
