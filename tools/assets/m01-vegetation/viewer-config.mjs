import {defineConfig} from 'vite';
import path from 'node:path';
export default defineConfig({base:'./',build:{outDir:'.agent/runs/M01-T10-T29-20261013/kit-viewer-dist',emptyOutDir:true,rollupOptions:{input:path.resolve('tools/assets/m01-vegetation/viewer.html')}},server:{host:'127.0.0.1',port:4176},preview:{host:'127.0.0.1',port:4176}});
