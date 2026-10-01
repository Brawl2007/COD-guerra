// Obtém, numa revisão fixa, os dados CC0 do MakeHuman usados pelo gerador (malha base hm08, esqueleto, pesos,
// alvos de morfologia e unidades de pose facial). Não usa código do MakeHuman (AGPL): só ficheiros de dados.
// Uso: node fetch-makehuman.mjs  → .cache/makehuman (ignorado pelo git); confere SHA-256 contra makehuman.lock.json.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

const REPO = 'https://github.com/makehumancommunity/makehuman';
const COMMIT = 'a8bc2d54ff0ac92e78ff71431b1023eda42bf482';
export const DATA_PATHS = [
  'LICENSE.md', 'LICENSE.ASSETS.md',
  'makehuman/data/3dobjs/base.obj',
  'makehuman/data/rigs/default.mhskel', 'makehuman/data/rigs/default_weights.mhw',
  'makehuman/data/poseunits/face-poseunits.bvh', 'makehuman/data/poseunits/face-poseunits.json',
  ...['macrodetails', 'head', 'nose', 'chin', 'ears', 'eyebrows', 'mouth', 'cheek', 'forehead', 'eyes', 'neck'].map(d => `makehuman/data/targets/${d}/`),
];
const here = new URL('.', import.meta.url).pathname;
const dest = join(here, '.cache/makehuman');
const lockFile = join(here, 'makehuman.lock.json');
const git = (...args) => execFileSync('git', args, { cwd: dest, stdio: ['ignore', 'pipe', 'inherit'], env: { ...process.env, GIT_LFS_SKIP_SMUDGE: '1' } }).toString().trim();

if (!existsSync(join(dest, '.git'))) {
  execFileSync('git', ['init', '-q', dest]);
  git('remote', 'add', 'origin', REPO);
  git('config', 'core.sparseCheckout', 'true');
}
git('sparse-checkout', 'set', '--no-cone', ...DATA_PATHS.map(p => '/' + p));
let head = '';
try { head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: dest, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { /* repositório vazio */ }
if (head !== COMMIT) {
  git('fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', COMMIT);
  git('checkout', '-q', COMMIT);
}

function* walk(dir) {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p); else yield p;
  }
}
const hashes = {};
for (const p of DATA_PATHS) {
  const full = join(dest, p);
  for (const f of p.endsWith('/') ? walk(full) : [full]) {
    if (/\.(png|jpg|thumb)$/.test(f)) continue;
    hashes[relative(dest, f)] = createHash('sha256').update(readFileSync(f)).digest('hex');
  }
}
if (existsSync(lockFile) && !process.argv.includes('--update-lock')) {
  const lock = JSON.parse(readFileSync(lockFile, 'utf8'));
  if (lock.commit !== COMMIT) throw new Error(`makehuman.lock.json fixa ${lock.commit}, o script pede ${COMMIT}`);
  const bad = Object.entries(lock.sha256).filter(([f, h]) => hashes[f] !== h).map(([f]) => f);
  if (bad.length) throw new Error(`SHA-256 diferente em ${bad.length} ficheiros: ${bad.slice(0, 5).join(', ')}`);
  console.log(`MakeHuman ${COMMIT.slice(0, 10)}: ${Object.keys(lock.sha256).length} ficheiros conferidos em ${relative(process.cwd(), dest)}`);
} else {
  writeFileSync(lockFile, JSON.stringify({ repo: REPO, commit: COMMIT, license: 'CC0 1.0 (LICENSE.ASSETS.md; dados), código AGPL não usado', sha256: hashes }, null, 1) + '\n');
  console.log(`makehuman.lock.json escrito com ${Object.keys(hashes).length} ficheiros`);
}
