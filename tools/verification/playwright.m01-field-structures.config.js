import {defineConfig} from '@playwright/test';
import base from '../../playwright.config.js';
// CI's shared ci.yml owns Node tests and production build. This task adds only source browser/gallery evidence.
export default defineConfig({...base,testDir:'../..',testMatch:['**/tests/browser/m01-field-structures.spec.js','**/tools/verification/m01-field-structures-gallery.spec.js'],use:{...base.use,baseURL:'http://127.0.0.1:5183/COD-guerra/'},webServer:{command:'npm run dev -- --port 5183',url:'http://127.0.0.1:5183/COD-guerra/',reuseExistingServer:false,timeout:30000}});
