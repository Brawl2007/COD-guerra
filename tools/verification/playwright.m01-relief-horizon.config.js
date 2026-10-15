import {fileURLToPath} from 'node:url';
import {defineConfig} from '@playwright/test';
const root=fileURLToPath(new URL('../../',import.meta.url));
// Baseline mode uses this candidate harness with a preview running in the untouched exact-base worktree.
const cwd=process.env.M01_RELIEF_PREVIEW_ROOT||root;
export default defineConfig({testDir:`${root}tests/browser`,testMatch:'m01-relief-horizon.spec.js',fullyParallel:false,workers:1,retries:0,timeout:1800000,outputDir:`${root}test-results/m01-relief-horizon-artifacts`,
  use:{baseURL:'http://127.0.0.1:4173/COD-guerra/',viewport:{width:1280,height:720},screenshot:'only-on-failure',trace:'retain-on-failure',launchOptions:{...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}},
  webServer:{command:'npm run preview',cwd,url:'http://127.0.0.1:4173/COD-guerra/',reuseExistingServer:false,timeout:30000}});
