// Parallel-worker variant of playwright.config.js: same launch options, but the preview server runs on port 4183 (the default 4173 is shared).
// Run from the repository root (it serves ./dist, so `npm run build` first):
//   flock <lockfile> env CHROME_EXECUTABLE=<chromium> npx playwright test -c tools/verification/playwright-port-4183.config.mjs <spec> --reporter=line
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'../../tests/browser',fullyParallel:false,workers:1,retries:0,timeout:180000,
  use:{baseURL:'http://127.0.0.1:4183/COD-guerra/',viewport:{width:1280,height:720},
    launchOptions:{executablePath:process.env.CHROME_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}},
  webServer:{command:'npm run preview -- --port 4183 --strictPort',url:'http://127.0.0.1:4183/COD-guerra/',reuseExistingServer:false,timeout:30000,cwd:new URL('../..',import.meta.url).pathname},
});
