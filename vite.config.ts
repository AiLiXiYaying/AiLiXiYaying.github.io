import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANT: This empty base ensures assets are loaded relatively
  // This fixes the blank screen on GitHub Pages (e.g. /repo-name/assets/...)
  base: './', 
  build: {
    outDir: 'dist',
  },
  define: {
    // Polyfill process.env for the service
    'process.env': {}
  }
});