import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // relative base so a future GitHub Pages deploy works without a rebuild
  base: './',
  optimizeDeps: {
    // Rapier ships wasm; let Vite serve it as-is instead of pre-bundling
    exclude: ['@dimforge/rapier3d-compat'],
  },
})
