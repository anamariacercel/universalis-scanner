import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Set base to your repo name for GitHub Pages, e.g. '/UniversalisScanner/'
export default defineConfig({
  plugins: [react()],
  base: './',
});
