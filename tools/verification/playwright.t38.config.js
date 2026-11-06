import {fileURLToPath} from 'node:url';
import {defineConfig} from '@playwright/test';

// T38 staging captures (m01-t38-staging-captures.spec.js). Not part of `npm run test:browser`; same preview server, viewport and GL flags as
// playwright.roadmap.config.js. CHROME_EXECUTABLE selects a local Chromium when the bundled one is not installed.
const root=fileURLToPath(new URL('../../',import.meta.url));
export default defineConfig({
  testDir:'.',testMatch:'m01-t38-staging-captures.spec.js',
  fullyParallel:false,workers:1,retries:0,timeout:1800000,
  outputDir:`${root}test-results/m01-t38-artifacts`,
  use:{baseURL:'http://127.0.0.1:4173/COD-guerra/',viewport:{width:1280,height:720},screenshot:'off',trace:'off',
    launchOptions:{...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{}),
      args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}},
  webServer:{command:'npm run preview',cwd:root,url:'http://127.0.0.1:4173/COD-guerra/',reuseExistingServer:false,timeout:30000},
});
