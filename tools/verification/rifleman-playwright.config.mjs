import config from '../../playwright.config.js';
import {defineConfig} from '@playwright/test';
export default defineConfig({...config,testDir:'../../tests/browser',testMatch:'m01-rifleman-locomotion.spec.js',outputDir:'../../test-results-rifleman',
  use:{...config.use,baseURL:'http://127.0.0.1:5185/COD-guerra/'},
  webServer:{...config.webServer,command:'npm run dev -- --port 5185 --strictPort',url:'http://127.0.0.1:5185/COD-guerra/'}});
