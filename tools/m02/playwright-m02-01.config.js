import { defineConfig } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const port = process.env.PORT || '4273';

export default defineConfig({
  testDir: path.join(repoRoot, 'tests/browser'),
  testMatch: 'm02-01-quinta.spec.js',
  outputDir: '/tmp/m02-01-playwright-results',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120000,
  use: {
    baseURL: `http://127.0.0.1:${port}/COD-guerra/`,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    trace: 'off',
    launchOptions: {
      ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {}),
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
      ],
    },
  },
  webServer: {
    command: `PORT=${port} node tools/m02/run-m02-01.mjs`,
    cwd: repoRoot,
    url: `http://127.0.0.1:${port}/COD-guerra/m02-01.html`,
    reuseExistingServer: true,
    timeout: 30000,
  },
});
