import {resolve} from 'node:path';
import {defineConfig} from '@playwright/test';
import base from '../../playwright.config.js';
const port=4187,prefix=process.env.T40_BASELINE_ROOT?` --prefix ${process.env.T40_BASELINE_ROOT}`:'';
export default defineConfig({...base,testDir:'../../tests/browser',testMatch:process.env.T40_REGRESSION==='1'?['m01-viewmodel-feel.spec.js','m01-wz29-viewmodel.spec.js','m01-anim-resolver.spec.js','m01-consolidation-lifecycle.spec.js']:'m01-t40-t50.spec.js',timeout:240000,expect:{timeout:30000},reporter:[['list'],['json',{outputFile:resolve(process.cwd(),process.env.T40_T50_REPORT??'test-results/t40-t50-browser-report.json')}]],use:{...base.use,baseURL:`http://127.0.0.1:${port}/COD-guerra/`},webServer:{command:`npm${prefix} run preview -- --port ${port}`,url:`http://127.0.0.1:${port}/COD-guerra/`,reuseExistingServer:false,timeout:30000}});
