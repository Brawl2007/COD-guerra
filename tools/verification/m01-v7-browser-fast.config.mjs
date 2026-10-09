import base from '../../playwright.config.js';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../../',import.meta.url));

// Same corpus, assertions, viewport, renderer and retry policy. Two independent
// file workers use the available local CPU; tests within a file remain serial.
// Keep action/source traces and all explicit/failure screenshots, while avoiding
// a DOM snapshot and filmstrip screenshot around every browser protocol action.
export default {
  ...base,
  testDir:root+'tests/browser',
  workers:2,
  use:{...base.use,trace:{mode:'retain-on-failure',snapshots:false,screenshots:false,sources:true}},
  webServer:{...base.webServer,cwd:root},
};
