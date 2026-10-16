import {fileURLToPath} from 'node:url';
import {defineConfig} from '@playwright/test';

// Configuração dedicada ao harness de capturas do roadmap (m01-roadmap-captures.spec.js).
// Não faz parte de `npm run test:browser`; usa o mesmo servidor de preview, viewport e flags de GL que playwright.config.js.
const root=fileURLToPath(new URL('../../',import.meta.url));
export default defineConfig({
  testDir:'.',testMatch:'m01-roadmap-captures.spec.js',
  fullyParallel:false,workers:1,retries:0,timeout:1800000,
  outputDir:`${root}test-results/m01-roadmap-artifacts`,
  use:{baseURL:'http://127.0.0.1:4173/COD-guerra/',viewport:{width:1280,height:720},screenshot:'off',trace:'off',
    launchOptions:{...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{}),
      args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}},
  webServer:{command:'npm run preview',cwd:root,url:'http://127.0.0.1:4173/COD-guerra/',reuseExistingServer:false,timeout:30000},
});
