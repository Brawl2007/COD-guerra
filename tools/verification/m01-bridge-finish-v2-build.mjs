import {build} from 'vite';
import config from '../../vite.config.js';
// Build the game and authored viewers with the identical production configuration.
await build({...config,configFile:false,build:{...config.build,rollupOptions:{input:['index.html','tools/assets/m01-bridges/materials/viewer.html','tools/assets/m01-materials/viewer.html']}}});
