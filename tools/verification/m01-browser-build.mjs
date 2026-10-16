import {build} from 'vite';
import config from '../../vite.config.js';
// Build for the full Playwright suite (`npm run build:browser`, run from the repository root). Pass 1 is exactly the deployed
// `npm run build`; pass 2 adds the authoring viewers that browser specs open under the same /COD-guerra/ base, into the same dist,
// so one `vite preview` serves the game bundle that ships and every viewer. The game chunks of pass 1 are not touched by pass 2.
//   tools/assets/m01-materials/viewer.html          m01-material-atlas.spec.js (original albedo/normal/ORM atlas)
//   tools/assets/m01-bridges/materials/viewer.html  m01-bridge-material-kit.spec.js (all original bridge families)
//   tools/assets/m01-vegetation/viewer.html         m01-vegetation-kit.spec.js (the actual loaded vegetation kit)
const VIEWERS=['tools/assets/m01-materials/viewer.html','tools/assets/m01-bridges/materials/viewer.html','tools/assets/m01-vegetation/viewer.html'];
await build();   // loads vite.config.js itself; vite mutates the config it is given, so pass 2 below starts from the untouched imported copy
await build({...config,configFile:false,plugins:[],build:{...config.build,emptyOutDir:false,rollupOptions:{...config.build.rollupOptions,input:VIEWERS}}});
