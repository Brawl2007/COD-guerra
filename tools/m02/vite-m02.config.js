// Static build of the isolated M02 bench only (m02-01.html), for preview hosting (e.g. a Vercel preview).
// Does not change the main build (vite.config.js) nor the M01 game. Output: dist-m02/ (index.html = the bench).
import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyFile } from 'node:fs/promises';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = path.join(root, 'dist-m02');

export default defineConfig({
  root,
  base: './',
  publicDir: false,
  plugins: [{ name: 'm02-index', closeBundle: () => copyFile(path.join(outDir, 'm02-01.html'), path.join(outDir, 'index.html')) }],
  build: {
    target: 'es2022',
    outDir,
    emptyOutDir: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: { input: { m02: path.join(root, 'm02-01.html') } },
  },
});
