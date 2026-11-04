import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',
  fullyParallel:false,workers:1,retries:0,timeout:400000,
  use:{baseURL:'http://127.0.0.1:4793/COD-guerra/',viewport:{width:1366,height:768},screenshot:'off',trace:'off',
    launchOptions:{executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}},
  webServer:{command:'npx vite preview --port 4793 --host 127.0.0.1 --strictPort',url:'http://127.0.0.1:4793/COD-guerra/',reuseExistingServer:false,timeout:30000},
});
