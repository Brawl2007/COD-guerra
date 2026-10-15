import { defineConfig } from '@playwright/test';
import base from '../../playwright.config.js';

// The authoring viewer imports source modules through Vite; the actual game
// terrain is tested separately against its production build.
export default defineConfig({
  ...base,
  testDir: '../../tests/browser',
  testMatch: 'm01-material-atlas.spec.js',
  use: { ...base.use, baseURL: 'http://127.0.0.1:5182/COD-guerra/' },
  webServer: {
    command: 'npm run dev -- --port 5182',
    url: 'http://127.0.0.1:5182/COD-guerra/',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
