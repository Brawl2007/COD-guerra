import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir:'./tests/browser',
  // Software WebGL on shared CI runners renders much slower than a hardware GPU.
  // Keep the same production viewport, real controls and assertions; budget more wall time.
  fullyParallel:false,workers:1,retries:0,timeout:process.env.CI?180000:45000,
  use:{baseURL:'http://127.0.0.1:4173/COD-guerra/',viewport:{width:1280,height:720},
    screenshot:'only-on-failure',trace:'retain-on-failure',
    launchOptions:{...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{}),
      args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}},
  webServer:{command:'exec node tests/browser/helpers/preview-server.mjs',url:'http://127.0.0.1:4173/COD-guerra/',reuseExistingServer:false,timeout:30000},
});
