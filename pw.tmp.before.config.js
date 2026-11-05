import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',
  fullyParallel:false,workers:1,retries:0,timeout:400000,
  use:{baseURL:'http://127.0.0.1:4812/COD-guerra/',viewport:{width:1366,height:768},screenshot:'off',trace:'off',
    launchOptions:{executablePath:process.env.CHROME_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}},
  webServer:{command:'npx vite preview --outDir /tmp/claude-0/-home-user-COD-guerra/3863f5d9-b0de-5d8a-ab60-00602ac0da90/scratchpad/polish-baseline/dist --port 4812 --host 127.0.0.1 --strictPort',url:'http://127.0.0.1:4812/COD-guerra/',reuseExistingServer:false,timeout:30000},
});
