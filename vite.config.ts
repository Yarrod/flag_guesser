import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages repo name. Change this if your repository name changes.
// Example for https://<user>.github.io/flag-game/ => repoName = 'flag-game'
const repoName = 'flag-game';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? `/${repoName}/` : '/'
}));
