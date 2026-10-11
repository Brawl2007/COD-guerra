import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// Independent immutable integration base: the new material registry may add
// exports, but the old sandbox surface generator and game authority stay exact.
const BASE = '6edc3d6f90ea5e12b4d0f554555bac8499423acc';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });

test('T09 registry preserves the original sandbox surface generator byte-for-byte', () => {
  const before = git('show', `${BASE}:src/render/materials.js`);
  const originalFunction = before.slice(before.indexOf('export function surface(')).trim();
  const after = readFileSync(new URL('../src/render/materials.js', import.meta.url), 'utf8');
  assert.ok(after.includes(originalFunction), 'existing surface() must remain exactly unchanged');
});

test('terrain rollout preserves the original sampled ground geometry and colliders', () => {
  const before = git('show', `${BASE}:src/render/m01-view.js`);
  const after = readFileSync(new URL('../src/render/m01-view.js', import.meta.url), 'utf8');
  // Material ownership and debug references may change; vertex sampling may not.
  const start = 'const geometry=new THREE.PlaneGeometry(2000,650,400,130);';
  const end = 'geometry.computeVertexNormals();this.geometry.push(geometry);';
  const extract = s => s.slice(s.indexOf(start), s.indexOf(end) + end.length);
  assert.ok(before.includes(start) && before.includes(end));
  assert.equal(extract(after), extract(before));
});
