import { defineConfig } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const port = process.env.PORT || '4273';

export default defineConfig({
  testDir: path.join(repoRoot, 'tests/browser'),
  // The M02 specs run only from this config (the main playwright.config.js ignores m02-*.spec.js).
  testMatch: ['m02-01-quinta.spec.js', 'm02-n0-captures.spec.js', 'm02-n0-route-videos.spec.js'],
  // All artefacts stay under test-results/ (ignored by version control).
  outputDir: path.join(repoRoot, 'test-results', 'm02-playwright'),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // SwiftShader (software WebGL) renders slowly; budget generously per test.
  timeout: process.env.CI ? 420000 : 300000,
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
    // Local runs may reuse a bench server already on PORT; CI always starts its own.
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
