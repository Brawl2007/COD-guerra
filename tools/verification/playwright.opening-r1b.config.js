import {fileURLToPath} from 'node:url';
import {defineConfig} from '@playwright/test';

// R1-b opening captures (m01-opening-r1b-captures.spec.js). Not part of `npm run test:browser`; same viewport and GL flags as playwright.sappers-r3a.config.js, but its own preview port (4196) so it can run
// beside other browser work. CHROME_EXECUTABLE selects a local Chromium when the bundled one is not installed. Serves ./dist: `npm run build` first.
const root=fileURLToPath(new URL('../../',import.meta.url));
export default defineConfig({
  testDir:'.',testMatch:'m01-opening-r1b-captures.spec.js',
  fullyParallel:false,workers:1,retries:0,timeout:3600000,
  outputDir:`${root}test-results/m01-opening-r1b-artifacts`,
  use:{baseURL:'http://127.0.0.1:4196/COD-guerra/',viewport:{width:1280,height:720},screenshot:'off',trace:'off',
    launchOptions:{...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{}),
      args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}},
  webServer:{command:'npm run preview -- --port 4196 --strictPort',cwd:root,url:'http://127.0.0.1:4196/COD-guerra/',reuseExistingServer:false,timeout:30000},
});
