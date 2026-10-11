import { test, expect } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const manifest = JSON.parse(readFileSync(new URL('../../assets/textures/m01/atlas/materials.manifest.json', import.meta.url)));
const EVIDENCE = 'docs/verification/m01-runtime/m01-t09-t28-closeout-v1';
const save = process.env.M01_MATERIAL_EVIDENCE === '1';

for (const tier of ['high', 'low']) test(`${tier}: original albedo/normal/ORM materials at 1, 5 and 20 metres`, async ({ page }, info) => {
  test.setTimeout(300000);
  const errors = [], failed = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
  await page.goto(`tools/assets/m01-materials/viewer.html?tier=${tier}`);
  await page.waitForFunction(() => window.materialViewer?.status === 'ready');
  const materials = manifest.materials.map(material => material.id), results = [];
  for (const distance of [1, 5, 20]) {
    await page.locator('#distance').selectOption(String(distance));
    for (const material of materials) {
      await page.locator('#family').selectOption(material);
      const diagnostics = await page.evaluate(() => window.materialViewer.diagnostics);
      expect(diagnostics.loaded).toBe(true);
      expect(diagnostics.textures).toBe(3);
      expect(diagnostics.maps).toEqual(['albedo', 'normal', 'orm']);
      expect(diagnostics.family).toBe(material);
      expect(diagnostics.cameraDistance).toBe(distance);
      expect(diagnostics.tier).toBe(tier);
      expect(diagnostics.calls).toBe(1);
      expect(diagnostics.triangles).toBe(2);
      const jpeg = await page.locator('#view').screenshot({ type: 'jpeg', quality: 85 });
      const name = `atlas-${material}-${tier}-${distance}m.jpg`;
      writeFileSync(info.outputPath(name), jpeg);
      if (save) { mkdirSync(EVIDENCE, { recursive: true }); writeFileSync(path.join(EVIDENCE, name), jpeg); }
      results.push({ material, distance, diagnostics });
    }
  }
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
  await info.attach(`atlas-${tier}.json`, { body: JSON.stringify(results, null, 2), contentType: 'application/json' });
  if (save) writeFileSync(path.join(EVIDENCE, `atlas-${tier}.json`), JSON.stringify(results, null, 2) + '\n');
});

test('atlas High→Low→High releases replaced resources and preserves distance and family', async ({ page }) => {
  await page.goto('tools/assets/m01-materials/viewer.html?material=wood&distance=5');
  await page.waitForFunction(() => window.materialViewer?.status === 'ready');
  for (const tier of ['low', 'high', 'low', 'high']) {
    await page.locator('#tier').selectOption(tier);
    await page.waitForFunction(t => window.materialViewer.status === 'ready' && window.materialViewer.diagnostics.tier === t, tier);
    const d = await page.evaluate(() => window.materialViewer.diagnostics);
    expect(d.textures).toBe(3);
    expect(d.family).toBe('wood');
    expect(d.cameraDistance).toBe(5);
    expect(d.loaded).toBe(true);
  }
});
