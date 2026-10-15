import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// AGENTS.md: Simulation stores only data; the renderer never decides damage, visibility, events or mission
// state. This walks every module the M01 simulation loads and keeps rendering, audio, the browser and
// non-deterministic clocks out of it.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = join(ROOT, 'src/game/m01-simulation.js');
const IMPORT = /(?:^|\n)\s*(?:import|export)\b[^'"]*?from\s*['"]([^'"]+)['"]|(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g;
const FORBIDDEN_DIRS = ['src/render/', 'src/ui/'];
const FORBIDDEN_FILES = /^src\/core\/(?:audio|battlefield-audio)[^/]*\.js$/;
const FORBIDDEN_CODE = [
  [/\bdocument\./, 'DOM access'],
  [/\bwindow\./, 'window access'],
  [/\brequestAnimationFrame\b/, 'frame callbacks'],
  [/\blocalStorage\b/, 'browser storage'],
  [/\bMath\.random\b/, 'Math.random (use the seeded Random)'],
  [/\bDate\.now\b|\bperformance\.now\b/, 'wall-clock time (use the battle clock)'],
];

const rel = (p) => relative(ROOT, p).split(sep).join('/');

function closure() {
  const seen = new Set(), bare = [], queue = [ENTRY];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    for (const m of readFileSync(file, 'utf8').matchAll(IMPORT)) {
      const spec = m[1] ?? m[2];
      if (spec.startsWith('.')) {
        const target = resolve(dirname(file), spec);
        if (target.endsWith('.js')) queue.push(target);
      } else bare.push(`${rel(file)} imports '${spec}'`);
    }
  }
  return { files: [...seen], bare };
}

test('the M01 simulation does not load Three.js, renderer, UI or audio modules', () => {
  const { files, bare } = closure();
  assert.ok(files.length > 1, 'import walk found nothing: the regex no longer matches the code');
  assert.deepEqual(bare, [], 'packages (e.g. three) are presentation; keep them out of the simulation');
  const offending = files.map(rel).filter((f) => FORBIDDEN_DIRS.some((d) => f.startsWith(d)) || FORBIDDEN_FILES.test(f));
  assert.deepEqual(offending, [], 'the simulation must not depend on presentation modules');
});

test('the M01 simulation stays deterministic and browser-free', () => {
  const problems = [];
  for (const file of closure().files) {
    const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
    for (const [re, what] of FORBIDDEN_CODE) if (re.test(code)) problems.push(`${rel(file)}: ${what}`);
  }
  assert.deepEqual(problems, []);
});
