import {defineConfig} from '@playwright/test';
import base from '../../playwright.config.js';
// Shared CI owns Node tests and build. This task owns only focused browser and immutable authority checks.
export default defineConfig({...base,testDir:'../..',testMatch:['**/tests/browser/m01-rail-props.spec.js'],use:{...base.use,baseURL:'http://127.0.0.1:5185/COD-guerra/'},webServer:{command:'npm run dev -- --port 5185',url:'http://127.0.0.1:5185/COD-guerra/',reuseExistingServer:false,timeout:30000}});
