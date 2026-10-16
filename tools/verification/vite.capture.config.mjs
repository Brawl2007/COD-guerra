import base from '../../vite.config.js';

// Staged captures must not be reloaded mid-sequence by HMR when a source file is saved during a long run.
export default {...base,root:new URL('../..',import.meta.url).pathname,server:{...base.server,hmr:false,watch:{ignored:['**/*']}}};
