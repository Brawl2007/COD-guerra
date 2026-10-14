import { defineConfig } from 'vite';
import { cp } from 'node:fs/promises';

export default defineConfig({
  base: '/COD-guerra/',
  plugins: [{ name: 'original-assets', closeBundle: () => cp('assets', 'dist/assets', { recursive: true }) }],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: {
    target:'es2022',
    chunkSizeWarningLimit:600,
    rollupOptions:{output:{manualChunks(id){
      const n=String(id).replace(/\\/g,'/');
      if(n.includes('/node_modules/three/examples/')||n.includes('/node_modules/three/addons/'))return 'three-loaders';
      if(n.includes('/node_modules/three/'))return 'three-core';
    }}}
  },
});
