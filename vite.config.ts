import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages repo name. Change this if your repository name changes.
// Example for https://<user>.github.io/flag_guesser/ => repoName = 'flag_guesser'
const repoName = 'flag_guesser';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? `/${repoName}/` : '/'
}));
