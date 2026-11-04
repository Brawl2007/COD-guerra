import {defineConfig} from '@playwright/test';
import base from './playwright.config.js';
const port=Number(process.env.TRIAGE_PORT||45317);
const url=`http://127.0.0.1:${port}/COD-guerra/`;
export default defineConfig({...base,use:{...base.use,baseURL:url},
  webServer:{command:`npx vite preview --host 127.0.0.1 --port ${port} --strictPort`,url,reuseExistingServer:false,timeout:60000}});
