import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Every shipped asset needs author, licence and scale (AGENTS.md). This test covers all of assets/,
// including folders that do not exist yet (assets/audio/), so new assets cannot skip their manifest.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets');
const REQUIRED = ['author', 'license', 'units'];
const BINARY = new Set(['.glb', '.gltf', '.bin', '.png', '.jpg', '.jpeg', '.webp', '.ktx2', '.ogg', '.mp3', '.wav', '.flac', '.opus']);

// Gaps that existed when this test was added (2026-10-10). Fixing one means deleting its line here;
// the test fails until the list matches reality, so it can only shrink.
const KNOWN_GAPS = new Set([
  'assets/models/provisional/m01/bridges.manifest.json: author',
  'assets/models/provisional/m01/bridges.manifest.json: units',
  'assets/models/provisional/m01/characters/manifest.json: author',
  'assets/models/provisional/m01/characters/manifest.json: license',
  'assets/models/provisional/m01/characters/station-animations.manifest.json: license',
  'assets/models/production/m01/locomotive/weathered-metal.png: not listed in a manifest',
  'assets/models/production/m01/panzerzug/armour-paint.png: not listed in a manifest',
]);

const rel = (p) => relative(ROOT, p).split(sep).join('/');
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);

function findGaps() {
  const files = walk(ASSETS);
  const manifests = files.filter((f) => basename(f) === 'manifest.json' || f.endsWith('.manifest.json'));
  const gaps = [];
  const text = new Map();
  for (const m of manifests) {
    const raw = readFileSync(m, 'utf8');
    text.set(m, raw);
    const data = JSON.parse(raw);
    for (const key of REQUIRED) {
      if (typeof data[key] !== 'string' || !data[key].trim()) gaps.push(`${rel(m)}: ${key}`);
    }
  }
  for (const f of files.filter((f) => BINARY.has(extname(f).toLowerCase()))) {
    const listed = manifests.some((m) => f.startsWith(dirname(m) + sep) && text.get(m).includes(basename(f)));
    if (!listed) gaps.push(`${rel(f)}: not listed in a manifest`);
  }
  return gaps;
}

test('every asset manifest records author, licence and units, and every asset file is in a manifest', () => {
  const gaps = findGaps();
  const fresh = gaps.filter((g) => !KNOWN_GAPS.has(g));
  assert.deepEqual(fresh, [], 'New asset without author/licence/units or without a manifest entry. Record them in the manifest (AGENTS.md).');
});

test('the known-gap list only shrinks: fixed gaps must be removed from it', () => {
  const gaps = new Set(findGaps());
  const fixed = [...KNOWN_GAPS].filter((g) => !gaps.has(g));
  assert.deepEqual(fixed, [], 'These gaps are fixed: delete them from KNOWN_GAPS in tests/assets-manifests.test.js.');
});
