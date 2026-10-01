import { defineConfig } from 'vite';
import { cp } from 'node:fs/promises';

export default defineConfig({
  base: '/COD-guerra/',
  plugins: [{ name: 'original-assets', closeBundle: () => cp('assets', 'dist/assets', { recursive: true }) }],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: { target: 'es2022' },
});
