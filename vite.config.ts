import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative base is safest for GitHub Pages project sites and repo renames.
  base: './'
});
